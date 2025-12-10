const axios = require('axios');
const { Pool } = require('pg');
const redis = require('redis');
const cron = require('node-cron');
const crypto = require('crypto');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

// Redis connection with error handling
let redisClient = null;
let redisConnected = false;

try {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  redisClient.connect()
    .then(() => {
      console.log('Redis connected successfully for worker');
      redisConnected = true;
    })
    .catch((err) => {
      console.warn('Redis connection failed for worker:', err.message);
      redisConnected = false;
    });
} catch (err) {
  console.warn('Redis client initialization failed for worker:', err.message);
  redisConnected = false;
}

// JioSaavn API configuration
const JIOSAVN_API_BASE = 'https://jiosaavn-api-privatecvc2.vercel.app';
// Updated to focus on the required languages: Malayalam, Hindi, Tamil
const LANGUAGES = ['ml', 'hi', 'ta'];

// Token bucket rate limiter
class TokenBucket {
  constructor(maxTokens, refillRate, refillInterval) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1) {
    await this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  async refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = Math.floor((elapsed / this.refillInterval) * this.refillRate);
    
    if (refillAmount > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
      this.lastRefill = now;
    }
  }

  getTokens() {
    return this.tokens;
  }
}

// Initialize rate limiter
const rateLimiter = new TokenBucket(1000, 1000, 24 * 60 * 60 * 1000); // 1000 tokens per day

// Analytics logger
const logEvent = (event, data = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data
  }));
};

// Generate fingerprint for a song
const generateFingerprint = (song) => {
  const data = `${song.id}|${song.name}|${song.primaryArtists}|${song.releaseDate}`;
  return crypto.createHash('md5').update(data).digest('hex');
};

// Fetch new releases from JioSaavn API
const fetchNewReleases = async (language = 'ml', page = 1, limit = 75) => {
  try {
    // Check rate limit
    if (!(await rateLimiter.consume(1))) {
      logEvent('fetch_rate_limited', { language, page });
      return [];
    }

    // Check if we should skip fetch (Redis lock) - only if Redis is connected
    if (redisConnected) {
      const lockKey = `fetch_lock:${language}:${page}`;
      const lockValue = await redisClient.get(lockKey);
      if (lockValue) {
        logEvent('fetch_skipped_locked', { language, page });
        return [];
      }

      // Set lock for 15 minutes
      await redisClient.setEx(lockKey, 15 * 60, 'locked');
    }

    console.log(`Fetching new releases for language: ${language}, page: ${page}`);
    
    // Updated query to specifically fetch new releases for the language
    const response = await axios.get(`${JIOSAVN_API_BASE}/search/songs`, {
      params: {
        query: `new ${language} songs`,
        limit: limit,
        page: page
      },
      timeout: 10000
    });

    console.log(`Received ${response.data?.data?.results?.length || 0} songs for language: ${language}`);

    // Add language information to each song
    const songsWithLanguage = response.data?.data?.results?.map(song => ({
      ...song,
      language: language // Add language field
    })) || [];

    logEvent('fetch_success', { language, page, count: songsWithLanguage.length });
    return songsWithLanguage;
  } catch (error) {
    logEvent('fetch_error', { 
      language, 
      page, 
      error: error.message,
      status: error.response?.status
    });
    
    // Handle 429 rate limit
    if (error.response?.status === 429) {
      logEvent('fetch_rate_limited_api', { language, page });
    }
    
    console.error(`Error fetching new releases for language ${language}:`, error.message);
    return [];
  }
};

// Check if song is new (within 7 days)
const isNewSong = (releaseDate) => {
  if (!releaseDate) return false;
  
  const release = new Date(releaseDate);
  const now = new Date();
  const diffTime = Math.abs(now - release);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 7;
};

// Process and store songs
const processSongs = async (songs) => {
  const client = await pool.connect();
  const newSongs = [];
  
  try {
    await client.query('BEGIN');
    
    console.log(`Processing ${songs.length} songs`);
    
    for (const song of songs) {
      try {
        // Generate fingerprint
        const fingerprint = generateFingerprint(song);
        
        // Check if song already exists
        const existingSong = await client.query(
          'SELECT id, album, featured FROM songs WHERE external_id = $1',
          [song.id]
        );
        
        if (existingSong.rows.length > 0) {
          // Update existing song
          await client.query(
            `UPDATE songs 
             SET title = $1, artists = $2, album = $3, release_date = $4, 
                 metadata = $5, fingerprint = $6, language = $7, updated_at = NOW()
             WHERE external_id = $8`,
            [
              song.name,
              song.primaryArtists,
              song.album?.name || 'Unknown',
              song.releaseDate ? new Date(song.releaseDate) : null,
              JSON.stringify(song),
              fingerprint,
              song.language || 'unknown',
              song.id
            ]
          );
          
          // If this is a new song (within 7 days), mark as featured if not already
          if (isNewSong(song.releaseDate) && !existingSong.rows[0].featured) {
            // Check if another song from the same album is already featured
            const albumFeatured = await client.query(
              'SELECT id FROM songs WHERE album = $1 AND featured = true',
              [song.album?.name || 'Unknown']
            );
            
            if (albumFeatured.rows.length === 0) {
              await client.query(
                'UPDATE songs SET featured = true WHERE external_id = $1',
                [song.id]
              );
              
              // Create new release event
              await client.query(
                'INSERT INTO new_release_events (song_id, detected_at) VALUES ($1, NOW())',
                [existingSong.rows[0].id]
              );
              
              newSongs.push({
                id: existingSong.rows[0].id,
                title: song.name,
                album: song.album?.name || 'Unknown',
                artists: song.primaryArtists,
                release_date: song.releaseDate,
                language: song.language || 'unknown'
              });
            }
          }
        } else {
          // Insert new song
          const result = await client.query(
            `INSERT INTO songs 
             (external_id, title, artists, album, release_date, metadata, fingerprint, featured, language)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
              song.id,
              song.name,
              song.primaryArtists,
              song.album?.name || 'Unknown',
              song.releaseDate ? new Date(song.releaseDate) : null,
              JSON.stringify(song),
              fingerprint,
              false, // Initially not featured
              song.language || 'unknown'
            ]
          );
          
          const songId = result.rows[0].id;
          
          // Check if this is a new song and no other song from the same album is featured
          if (isNewSong(song.releaseDate)) {
            const albumFeatured = await client.query(
              'SELECT id FROM songs WHERE album = $1 AND featured = true',
              [song.album?.name || 'Unknown']
            );
            
            if (albumFeatured.rows.length === 0) {
              await client.query(
                'UPDATE songs SET featured = true WHERE id = $1',
                [songId]
              );
              
              // Create new release event
              await client.query(
                'INSERT INTO new_release_events (song_id, detected_at) VALUES ($1, NOW())',
                [songId]
              );
              
              newSongs.push({
                id: songId,
                title: song.name,
                album: song.album?.name || 'Unknown',
                artists: song.primaryArtists,
                release_date: song.releaseDate,
                language: song.language || 'unknown'
              });
            }
          }
        }
      } catch (songError) {
        logEvent('song_processing_error', { 
          songId: song.id, 
          error: songError.message 
        });
        console.error(`Error processing song ${song.id}:`, songError.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`Processed ${newSongs.length} new songs`);
    
    // Publish new releases to Redis - only if Redis is connected
    if (redisConnected && newSongs.length > 0) {
      for (const song of newSongs) {
        await redisClient.publish('new_releases', JSON.stringify({
          type: 'new_release',
          song
        }));
      }
      
      logEvent('new_songs_published', { count: newSongs.length });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    logEvent('process_songs_error', { error: error.message });
    console.error('Error processing songs:', error.message);
    throw error;
  } finally {
    client.release();
  }
  
  return newSongs;
};

// Main fetch function
const fetchAndProcessReleases = async () => {
  logEvent('fetch_started');
  console.log('Starting fetch and process releases');
  
  try {
    // Fetch songs for each language
    for (const lang of LANGUAGES) {
      console.log(`Fetching songs for language: ${lang}`);
      // Fetch multiple pages to get more diverse results
      for (let page = 1; page <= 3; page++) {
        const songs = await fetchNewReleases(lang, page, 75); // Increased limit from 50 to 75
        console.log(`Fetched ${songs.length} songs for ${lang} page ${page}`);
        if (songs.length > 0) {
          await processSongs(songs);
        }
        
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    logEvent('fetch_completed');
    console.log('Fetch and process releases completed');
  } catch (error) {
    logEvent('fetch_process_error', { error: error.message });
    console.error('Error in fetch and process releases:', error.message);
  }
};

// Schedule the job to run every 10 minutes
cron.schedule('*/10 * * * *', fetchAndProcessReleases);

// Also run immediately on startup
fetchAndProcessReleases();

module.exports = {
  fetchAndProcessReleases,
  rateLimiter
};