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
    .then(() => {
      // Database connected successfully - removed verbose logging
    })
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
    const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';
    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.jiosaavn.com/',
      Origin: 'https://www.jiosaavn.com',
    };
    const COMP_KW = ['best of', 'top songs', 'top hits', 'collection', 'greatest hits', 'hits of', 'playlist'];
    const isComp = (title = '') => { const t = title.toLowerCase(); return COMP_KW.some(k => t.includes(k)); };

    const year = new Date().getFullYear();

    // Upgrade image from 150x150 → 500x500
    const upgradeImg = url => url ? url.replace('150x150', '500x500').replace('50x50', '500x500') : url;

    // Normalize a raw JioSaavn song object
    const normSong = raw => {
      if (!raw || raw.type !== 'song') return null;
      const info = raw.more_info || {};
      const artists = info.artistMap || {};
      const primaryArtists = (artists.primary_artists || []).map(a => a.name).join(', ');
      const encUrl = info.encrypted_media_url;
      let downloadUrl = [];
      if (encUrl) {
        try {
          const CryptoJS = require('crypto-js');
          const key = CryptoJS.enc.Utf8.parse('38346591');
          const base = CryptoJS.DES.decrypt(
            { ciphertext: CryptoJS.enc.Base64.parse(encUrl) }, key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
          ).toString(CryptoJS.enc.Utf8).trim();
          if (base && base.startsWith('http')) {
            const backendOrigin = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
            downloadUrl = ['12','48','96','160','320'].map(q => ({
              quality: `${q}kbps`,
              link: `${backendOrigin}/api/jiosaavn/stream?url=${encodeURIComponent(base.replace(/_\d+\.mp4/, `_${q}.mp4`))}`,
            }));
          }
        } catch {}
      }
      const baseImg = raw.image || '';
      return {
        id: raw.id,
        name: raw.title,
        album: { id: info.album_id || '', name: info.album || '', url: info.album_url || '' },
        year: raw.year || '',
        releaseDate: info.release_date || '',
        duration: parseInt(info.duration, 10) || 0,
        primaryArtists,
        language: raw.language || '',
        playCount: parseInt(raw.play_count, 10) || 0,
        hasLyrics: info.has_lyrics === 'true' || info.has_lyrics === true,
        image: [
          { quality: '50x50',   link: baseImg },
          { quality: '150x150', link: baseImg },
          { quality: '500x500', link: upgradeImg(baseImg) },
        ].filter(i => i.link),
        downloadUrl,
      };
    };

    // Fetch recent albums for a language, return their songs
    const fetchLangSongs = async (language, maxAlbums = 8) => {
      const albumRes = await axios.get(JIOSAAVN_API, {
        params: { __call: 'search.getAlbumResults', _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0', q: `${language} ${year}`, n: 25, p: 1 },
        headers: HEADERS, timeout: 10000,
      });
      const albums = (albumRes.data.results || []).filter(a => !isComp(a.title)).slice(0, maxAlbums);
      const results = await Promise.allSettled(
        albums.map(a =>
          axios.get(JIOSAAVN_API, {
            params: { __call: 'content.getAlbumDetails', albumid: a.id, _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0' },
            headers: HEADERS, timeout: 8000,
          }).then(r => (r.data.songs || r.data.list || []).map(normSong).filter(Boolean))
        )
      );
      return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    };

    // Fetch for all 4 languages in parallel
    const [mlSongs, taSongs, hiSongs, enSongs] = await Promise.all([
      fetchLangSongs('malayalam', 8).catch(() => []),
      fetchLangSongs('tamil',     8).catch(() => []),
      fetchLangSongs('hindi',     6).catch(() => []),
      fetchLangSongs('english',   4).catch(() => []),
    ]);

    // Deduplicate by song id and shuffle for variety
    const allSongs = [...mlSongs, ...taSongs, ...hiSongs, ...enSongs];
    const seen = new Set();
    const unique = allSongs.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });

    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return unique.slice(0, 60);
  } catch (error) {
    console.error('Error fetching real new releases:', error.message);
    return inMemorySongs;
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
      // Redis connected successfully - removed verbose logging
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