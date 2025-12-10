const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// Database connection with fallback
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
  });
  
  // Test the connection
  pool.query('SELECT 1')
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
      console.warn('Database connection failed, using in-memory storage:', err.message);
      pool = null;
    });
} catch (err) {
  console.warn('Database initialization failed, using in-memory storage:', err.message);
  pool = null;
}

// In-memory storage for when database is not available
let inMemorySongs = [
  {
    id: '1',
    external_id: 'ml_new_1',
    title: 'Chithram Bhalare Chithram',
    artists: 'K. J. Yesudas',
    album: 'Chithram',
    release_date: new Date().toISOString(),
    featured: true,
    language: 'ml',
    added_at: new Date().toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/ff6b6b/white?text=Chithram'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/chithram-bhalare-chithram.mp3'
      }]
    })
  },
  {
    id: '2',
    external_id: 'ta_new_1',
    title: 'Chinna Chinna Aasai',
    artists: 'S. P. Balasubrahmanyam',
    album: 'Roja',
    release_date: new Date().toISOString(),
    featured: true,
    language: 'ta',
    added_at: new Date().toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/ff6b6b/white?text=Roja'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/chinna-chinna-aasai.mp3'
      }]
    })
  },
  {
    id: '3',
    external_id: 'hi_new_1',
    title: 'Tum Hi Ho',
    artists: 'Arijit Singh',
    album: 'Aashiqui 2',
    release_date: new Date().toISOString(),
    featured: true,
    language: 'hi',
    added_at: new Date().toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/ff6b6b/white?text=Aashiqui+2'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/tum-hi-ho.mp3'
      }]
    })
  },
  {
    id: '4',
    external_id: 'ml_new_2',
    title: 'Mouna Raagam',
    artists: 'Malaysia Vasudevan',
    album: 'Mouna Raagam',
    release_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    featured: true,
    language: 'ml',
    added_at: new Date(Date.now() - 86400000).toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/4ecdc4/white?text=Mouna+Raagam'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/mouna-raagam.mp3'
      }]
    })
  },
  {
    id: '5',
    external_id: 'ta_new_2',
    title: 'Enna Satham Indha Neram',
    artists: 'K. S. Chithra',
    album: 'Punnagai Mannan',
    release_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    featured: true,
    language: 'ta',
    added_at: new Date(Date.now() - 86400000).toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/4ecdc4/white?text=Punnagai+Mannan'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/enna-satham-indha-neram.mp3'
      }]
    })
  },
  {
    id: '6',
    external_id: 'hi_new_2',
    title: 'Kal Ho Naa Ho',
    artists: 'Sonu Nigam',
    album: 'Kal Ho Naa Ho',
    release_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    featured: true,
    language: 'hi',
    added_at: new Date(Date.now() - 86400000).toISOString(),
    metadata: JSON.stringify({
      image: [{
        quality: '500x500',
        link: 'https://placehold.co/500x500/4ecdc4/white?text=Kal+Ho+Naa+Ho'
      }],
      downloadUrl: [{
        quality: '320kbps',
        link: 'https://example.com/kal-ho-naa-ho.mp3'
      }]
    })
  }
];

// Function to fetch real new releases from JioSaavn API
async function fetchRealNewReleases() {
  try {
    const API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';
    
    // Fetch trending songs for each language using better queries - INCLUDING ENGLISH
    const [malayalamResponse, tamilResponse, hindiResponse, englishResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'new malayalam songs 2025', limit: 30 } }),
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'new tamil songs 2025', limit: 30 } }),
      // Use better queries for Hindi songs to avoid religious songs
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'bollywood songs 2025', limit: 30 } }),
      // Add English songs for 2025
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'english songs 2025', limit: 30 } })
    ]);
    
    // Process Malayalam songs
    const malayalamSongs = (malayalamResponse.data.data.results || []).map(song => ({
      ...song,
      language: 'ml' // Explicitly set language
    }));
    
    // Process Tamil songs
    const tamilSongs = (tamilResponse.data.data.results || []).map(song => ({
      ...song,
      language: 'ta' // Explicitly set language
    }));
    
    // Process Hindi songs
    const hindiSongs = (hindiResponse.data.data.results || []).map(song => ({
      ...song,
      language: 'hi' // Explicitly set language
    }));
    
    // Process English songs
    const englishSongs = (englishResponse.data.data.results || []).map(song => ({
      ...song,
      language: 'en' // Explicitly set language
    }));
    
    // Combine and process songs
    const allSongs = [...malayalamSongs, ...tamilSongs, ...hindiSongs, ...englishSongs];
    
    // Convert to our internal format
    const processedSongs = allSongs.map((song, index) => ({
      id: `${index + 1}`,
      external_id: song.id,
      title: song.name,
      artists: song.primaryArtists,
      album: song.album.name,
      release_date: song.releaseDate || new Date().toISOString(),
      featured: true,
      language: song.language, // Use the explicitly set language
      added_at: new Date().toISOString(),
      metadata: JSON.stringify({
        image: song.image || [],
        downloadUrl: song.downloadUrl || []
      })
    }));
    
    // Remove duplicates by external_id
    const uniqueSongs = processedSongs.filter((song, index, self) => 
      index === self.findIndex(s => s.external_id === song.external_id)
    );
    
    // Filter only 2025 songs or very recent songs (last 14 days)
    const now = Date.now();
    const recentDays = 14;
    const targetYear = 2025;
    
    const filteredSongs = uniqueSongs.filter(song => {
      // Check releaseDate first
      if (song.release_date) {
        const parsed = Date.parse(song.release_date);
        if (!isNaN(parsed)) {
          const diffDays = (now - parsed) / (1000 * 60 * 60 * 24);
          // Very recent (within 14 days)
          if (diffDays >= 0 && diffDays <= recentDays) return true;
          // Year is 2025
          const relYear = new Date(parsed).getFullYear();
          if (relYear === targetYear) return true;
          return false;
        }
      }
      // Fallback: check year field
      return false; // Only include songs with valid release dates
    });
    
    // Ensure we have a good mix of languages
    const mlSongs = filteredSongs.filter(song => song.language === 'ml');
    const taSongs = filteredSongs.filter(song => song.language === 'ta');
    const hiSongs = filteredSongs.filter(song => song.language === 'hi');
    const enSongs = filteredSongs.filter(song => song.language === 'en');
    
    // Take up to 15 songs from each language to ensure good distribution
    const mixedSongs = [
      ...mlSongs.slice(0, 15),
      ...taSongs.slice(0, 15),
      ...hiSongs.slice(0, 15),
      ...enSongs.slice(0, 15)
    ];
    
    // Shuffle the mixed songs to randomize the order
    for (let i = mixedSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixedSongs[i], mixedSongs[j]] = [mixedSongs[j], mixedSongs[i]];
    }
    
    return mixedSongs.slice(0, 50); // Return top 50 songs
  } catch (error) {
    console.error('Error fetching real new releases:', error);
    return inMemorySongs; // Fallback to sample data
  }
}

// Redis connection for SSE with error handling
let redisSubscriber = null;
let redisConnected = false;

try {
  redisSubscriber = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  redisSubscriber.connect()
    .then(() => {
      console.log('Redis connected successfully');
      redisConnected = true;
    })
    .catch((err) => {
      console.warn('Redis connection failed, SSE will not be available:', err.message);
      redisConnected = false;
    });
} catch (err) {
  console.warn('Redis client initialization failed:', err.message);
  redisConnected = false;
}

// In-memory storage for new releases when Redis is not available
let recentReleases = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// Function to fetch recent releases from database or in-memory storage
async function fetchRecentReleases() {
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT id, external_id, title, artists, album, release_date, featured, language, added_at, metadata
         FROM songs 
         WHERE featured = true 
         ORDER BY release_date DESC 
         LIMIT 25`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent releases from database:', error);
      // Fetch real new releases from JioSaavn API
      return await fetchRealNewReleases();
    }
  } else {
    // Fetch real new releases from JioSaavn API
    return await fetchRealNewReleases();
  }
}

// Get featured new releases (one per album) - mixed feed of all languages
router.get('/', async (req, res) => {
  try {
    const { limit = 25, offset = 0 } = req.query;
    
    // Ensure limit doesn't exceed 25
    const maxLimit = Math.min(parseInt(limit) || 25, 25);
    
    if (pool) {
      // Try to fetch from database
      try {
        const result = await pool.query(
          `SELECT id, external_id, title, artists, album, release_date, featured, language, added_at, metadata
           FROM songs 
           WHERE featured = true 
           ORDER BY release_date DESC 
           LIMIT $1 OFFSET $2`,
          [maxLimit, offset]
        );
        
        return res.json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });
      } catch (dbError) {
        console.error('Database error, using fallback:', dbError.message);
      }
    }
    
    // Fetch real new releases from JioSaavn API with error handling
    let realSongs;
    try {
      realSongs = await fetchRealNewReleases();
    } catch (apiError) {
      console.error('API fetch error, using in-memory fallback:', apiError.message);
      realSongs = inMemorySongs;
    }
    
    const startIndex = Math.min(offset, realSongs.length);
    const endIndex = Math.min(startIndex + maxLimit, realSongs.length);
    const data = realSongs.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching new releases:', error);
    // Final fallback - return in-memory songs
    const maxLimit = Math.min(parseInt(req.query.limit) || 25, 25);
    const offset = parseInt(req.query.offset) || 0;
    const startIndex = Math.min(offset, inMemorySongs.length);
    const endIndex = Math.min(startIndex + maxLimit, inMemorySongs.length);
    const data = inMemorySongs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: data,
      count: data.length
    });
  }
});

// Get featured new releases for a specific language
router.get('/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { limit = 25, offset = 0 } = req.query;
    
    // Ensure limit doesn't exceed 25
    const maxLimit = Math.min(parseInt(limit) || 25, 25);
    
    // Validate language parameter
    const validLanguages = ['ml', 'hi', 'ta'];
    if (!validLanguages.includes(lang)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language. Supported languages: ml (Malayalam), hi (Hindi), ta (Tamil)'
      });
    }
    
    if (pool) {
      // Try to fetch from database
      try {
        const result = await pool.query(
          `SELECT id, external_id, title, artists, album, release_date, featured, language, added_at, metadata
           FROM songs 
           WHERE featured = true AND language = $1
           ORDER BY release_date DESC 
           LIMIT $2 OFFSET $3`,
          [lang, maxLimit, offset]
        );
        
        return res.json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });
      } catch (dbError) {
        console.error('Database error, using fallback:', dbError.message);
      }
    }
    
    // Fetch real new releases from JioSaavn API for the specific language with error handling
    let realSongs;
    try {
      realSongs = await fetchRealNewReleases();
    } catch (apiError) {
      console.error('API fetch error, using in-memory fallback:', apiError.message);
      realSongs = inMemorySongs;
    }
    
    const filteredSongs = realSongs.filter(song => song.language === lang);
    
    const startIndex = Math.min(offset, filteredSongs.length);
    const endIndex = Math.min(startIndex + maxLimit, filteredSongs.length);
    const data = filteredSongs.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching new releases by language:', error);
    // Final fallback - return in-memory songs for the language
    const filteredSongs = inMemorySongs.filter(song => song.language === req.params.lang);
    const maxLimit = Math.min(parseInt(req.query.limit) || 25, 25);
    const offset = parseInt(req.query.offset) || 0;
    const startIndex = Math.min(offset, filteredSongs.length);
    const endIndex = Math.min(startIndex + maxLimit, filteredSongs.length);
    const data = filteredSongs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: data,
      count: data.length
    });
  }
});

// Get song details by ID
router.get('/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (pool) {
      // Try to fetch from database
      try {
        const result = await pool.query(
          'SELECT * FROM songs WHERE id = $1',
          [id]
        );
        
        if (result.rows.length === 0) {
          // Try in-memory fallback
          const song = inMemorySongs.find(s => s.id === id);
          if (song) {
            return res.json({
              success: true,
              data: song
            });
          }
          
          return res.status(404).json({
            success: false,
            error: 'Song not found'
          });
        }
        
        return res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (dbError) {
        console.error('Database error, using fallback:', dbError.message);
      }
    }
    
    // Fallback to in-memory data
    const song = inMemorySongs.find(s => s.id === id);
    if (song) {
      return res.json({
        success: true,
        data: song
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Song not found'
    });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch song'
    });
  }
});

// Get all songs from an album/movie
router.get('/albums/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100 } = req.query;
    
    if (pool) {
      // Try to fetch from database
      try {
        const result = await pool.query(
          `SELECT * FROM songs 
           WHERE album = $1 
           ORDER BY release_date DESC 
           LIMIT $2`,
          [name, limit]
        );
        
        return res.json({
          success: true,
          data: result.rows,
          count: result.rows.length
        });
      } catch (dbError) {
        console.error('Database error, using fallback:', dbError.message);
      }
    }
    
    // Fallback to in-memory data
    const data = inMemorySongs.filter(song => song.album === name);
    return res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching album songs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch album songs'
    });
  }
});

// Manual trigger for fetching (admin only)
router.post('/fetch', async (req, res) => {
  // In a real implementation, you would check for admin authentication here
  // For now, we'll just allow it for demo purposes
  
  try {
    // Import and run the fetch function
    const { fetchAndProcessReleases } = require('../worker/fetcher');
    await fetchAndProcessReleases();
    
    res.json({
      success: true,
      message: 'Fetch initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate fetch: ' + error.message
    });
  }
});

// SSE endpoint for realtime updates
router.get('/events', (req, res) => {
  // Check if Redis is available
  if (!redisConnected || !redisSubscriber) {
    // Fallback to polling-based approach when Redis is not available
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send a message indicating SSE is not available but polling will be used
    res.write('data: {"type": "info", "message": "Realtime updates not available - Using polling fallback"}\n\n');
    
    // Implement polling fallback
    let pollInterval = setInterval(async () => {
      try {
        // Check if request is still alive
        if (res.writableEnded) {
          clearInterval(pollInterval);
          return;
        }
        
        // Fetch recent releases if cache is expired
        const now = Date.now();
        if (now - lastFetchTime > CACHE_DURATION) {
          const releases = await fetchRecentReleases();
          recentReleases = releases;
          lastFetchTime = now;
        }
        
        // Send releases as events
        if (recentReleases.length > 0) {
          // Send the most recent release
          const latestRelease = recentReleases[0];
          const eventData = {
            type: 'new_release',
            song: latestRelease
          };
          res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000); // Poll every 30 seconds
    
    // Handle client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
      res.end();
    });
    
    // Handle errors
    req.on('error', (err) => {
      console.error('SSE error:', err);
      clearInterval(pollInterval);
      res.end();
    });
    
    return;
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection message
  res.write('data: {"type": "connected"}\n\n');
  
  // Handle Redis messages
  const handleMessage = (channel, message) => {
    if (channel === 'new_releases') {
      res.write(`data: ${message}\n\n`);
    }
  };
  
  // Subscribe to Redis channel
  redisSubscriber.subscribe('new_releases', handleMessage);
  
  // Handle client disconnect
  req.on('close', () => {
    redisSubscriber.unsubscribe('new_releases', handleMessage);
    res.end();
  });
  
  // Handle errors
  req.on('error', (err) => {
    console.error('SSE error:', err);
    redisSubscriber.unsubscribe('new_releases', handleMessage);
    res.end();
  });
});

module.exports = router;