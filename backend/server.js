const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Innertube } = require('youtubei.js');
const ytdl = require('@distube/ytdl-core');

let innertubeClient = null;
Innertube.create().then(yt => {
  innertubeClient = yt;
  console.log('✅ YouTube Innertube client initialized');
}).catch(err => {
  console.error('❌ Failed to initialize YouTube client:', err.message);
});

// MongoDB connection
const { connectToMongoDB } = require('./config/mongodb');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5009;

// Initialize MongoDB connection
connectToMongoDB().then(() => {
  console.log('✅ MongoDB initialization completed');
}).catch(err => {
  console.warn('⚠️ MongoDB initialization failed, continuing with fallback storage:', err.message);
});

// Fallback in-memory user storage for when MongoDB is not available
const fallbackUsers = [];

// CORS - Manual middleware for Railway proxy compatibility
const allowedOrigins = [
  'https://audionova-app-b26cd.web.app',
  'https://audionova-app-b26cd.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5009',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Manual CORS middleware - more reliable than cors() package behind Railway proxy
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Set CORS headers for allowed origins
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
  }

  // Handle OPTIONS preflight immediately - return 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));
// Serve static uploads (uploaded songs, cover images, profile pictures)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Spotify API credentials (you'll need to register your app at developer.spotify.com)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000';
// Note: SPOTIFY_REDIRECT_URI is required by Spotify but not used for Client Credentials flow

// JWT secret - must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  process.exit(1);
}

// Import the jiosaavnApi for fallback
const { JioSaavnAPI } = require('./services/jiosaavnApi');

// Initialize JioSaavn API
const jiosaavnApi = new JioSaavnAPI();

// ── Route Registration (each wrapped in try-catch for resilience) ──────────────
// If any single route fails to load, server continues running

try {
  const newReleasesRouter = require('./routes/new-releases');
  app.use('/api/new-releases', newReleasesRouter);
  console.log('✅ Route loaded: /api/new-releases');
} catch (e) { console.error('❌ Failed to load new-releases route:', e.message); }

try {
  const lyricsRouter = require('./routes/lyrics');
  app.use('/api/lyrics', lyricsRouter);
  console.log('✅ Route loaded: /api/lyrics');
} catch (e) { console.error('❌ Failed to load lyrics route:', e.message); }

try {
  const trendingRouter = require('./routes/trending');
  app.use('/api/trending', trendingRouter);
  console.log('✅ Route loaded: /api/trending');
} catch (e) { console.error('❌ Failed to load trending route:', e.message); }

try {
  const coverVerificationRouter = require('./routes/cover-verification');
  app.use('/api/cover-verification', coverVerificationRouter);
  console.log('✅ Route loaded: /api/cover-verification');
} catch (e) { console.error('❌ Failed to load cover-verification route:', e.message); }

try {
  const adminRouter = require('./routes/admin');
  app.use('/api/admin', adminRouter);
  console.log('✅ Route loaded: /api/admin');
} catch (e) { console.error('❌ Failed to load admin route:', e.message); }

try {
  const analyticsRouter = require('./routes/analytics');
  app.use('/api', analyticsRouter);
  console.log('✅ Route loaded: /api/analytics');
} catch (e) { console.error('❌ Failed to load analytics route:', e.message); }

try {
  const socialRouter = require('./routes/social');
  app.use('/api/social', socialRouter);
  console.log('✅ Route loaded: /api/social');
} catch (e) { console.error('❌ Failed to load social route:', e.message); }

// Function to get Spotify access token
async function getSpotifyAccessToken() {
  // Check if Spotify credentials are configured
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify API credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env file.');
  }

  if (SPOTIFY_CLIENT_ID === 'your_spotify_client_id_here' || SPOTIFY_CLIENT_SECRET === 'your_spotify_client_secret_here') {
    throw new Error('Please replace the placeholder Spotify credentials with your actual API keys from https://developer.spotify.com/dashboard/applications');
  }

  const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error.response?.data || error.message);
    console.error('Spotify Client ID:', SPOTIFY_CLIENT_ID ? 'Set' : 'Not set');
    console.error('Spotify Client Secret:', SPOTIFY_CLIENT_SECRET ? 'Set' : 'Not set');
    throw new Error(`Failed to get Spotify access token: ${error.response?.data?.error_description || error.message}`);
  }
}

// Function to get Spotify playlist tracks
async function getSpotifyPlaylistTracks(playlistId, accessToken) {
  try {
    // First, let's try to get basic playlist info to see what the issue is
    console.log(`Attempting to fetch playlist: ${playlistId}`);

    // Fetch the first 100 tracks
    let allTracks = [];
    let offset = 0;
    const limit = 100;
    let totalTracks = 0;

    // First request to get playlist metadata and total track count
    const initialResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        fields: 'id,name,description,images,tracks.items(track(id,name,duration_ms,explicit,external_urls,album(name,release_date,label,external_urls,images,copyrights),artists(name,id))),tracks.total,public,owner.display_name',
        limit: limit,
        offset: offset
      }
    });

    const playlistData = initialResponse.data;
    console.log(`Playlist found: ${playlistData.name} by ${playlistData.owner?.display_name}`);
    console.log(`Playlist is public: ${playlistData.public}`);
    totalTracks = playlistData.tracks.total;

    // Add the first batch of tracks
    allTracks = [...playlistData.tracks.items];

    // Calculate how many more requests we need to make (up to 400 tracks max)
    const maxTracks = 400;
    const remainingTracks = Math.min(totalTracks, maxTracks) - allTracks.length;
    const additionalRequestsNeeded = Math.ceil(remainingTracks / limit);

    // Make additional requests for more tracks (up to 400 total)
    for (let i = 1; i <= additionalRequestsNeeded && allTracks.length < maxTracks; i++) {
      offset = i * limit;

      try {
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            fields: 'items(track(id,name,duration_ms,explicit,external_urls,album(name,release_date,label,external_urls,images,copyrights),artists(name,id)))',
            limit: limit,
            offset: offset
          }
        });

        // Add these tracks to our collection
        allTracks = [...allTracks, ...response.data.items];

        // Stop if we've reached our maximum
        if (allTracks.length >= maxTracks) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching tracks at offset ${offset}:`, error.response?.data || error.message);
        // Continue with whatever tracks we have so far
        break;
      }
    }

    // Trim to exactly 400 tracks if we have more
    if (allTracks.length > maxTracks) {
      allTracks = allTracks.slice(0, maxTracks);
    }

    // Return the playlist data with all tracks
    return {
      ...playlistData,
      tracks: {
        ...playlistData.tracks,
        items: allTracks,
        total: allTracks.length
      }
    };
  } catch (error) {
    console.error('Error getting Spotify playlist:', error.response?.data || error.message);
    console.error('Playlist ID:', playlistId);
    console.error('Access Token:', accessToken ? 'Set' : 'Not set');

    // Provide more specific error messages
    if (error.response?.status === 404) {
      throw new Error(`Playlist not found. This could be because: 1) The playlist is private, 2) The playlist ID is incorrect, or 3) The playlist has been deleted. Note: Spotify's Client Credentials flow cannot access private playlists or some curated playlists.`);
    } else if (error.response?.status === 403) {
      throw new Error(`Access forbidden. The playlist might be private or require user authentication. Our current setup uses Client Credentials which has limited access to playlists.`);
    } else {
      throw new Error(`Failed to get Spotify playlist: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

// Function to search for a song on JioSaavn using our local proxy
async function searchSongOnJioSaavn(query) {
  try {
    const cleanQuery = query.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const port = process.env.PORT || 5009;
    const response = await axios.get(`http://localhost:${port}/api/jiosaavn/search/songs`, {
      params: { query: cleanQuery || query, limit: 1 }
    });

    const result = response.data?.data?.results?.[0];
    if (result) {
      return result;
    }

    if (cleanQuery.includes(' ')) {
      const titleOnly = cleanQuery.split(' ')[0];
      const fallbackRes = await axios.get(`http://localhost:${port}/api/jiosaavn/search/songs`, {
        params: { query: titleOnly, limit: 1 }
      });
      return fallbackRes.data?.data?.results?.[0] || null;
    }

    return null;
  } catch (error) {
    console.error('Error searching on JioSaavn:', error.message);
    return null;
  }
}

// Convert Spotify track to JioSaavn format
function convertSpotifyToJioSaavn(spotifyTrack) {
  // Validate input
  if (!spotifyTrack) {
    console.warn('convertSpotifyToJioSaavn called with null/undefined track');
    return null;
  }

  return {
    id: spotifyTrack.id || '',
    name: spotifyTrack.name || 'Unknown Track',
    album: {
      id: spotifyTrack.album?.id || '',
      name: spotifyTrack.album?.name || 'Unknown Album',
      url: spotifyTrack.album?.external_urls?.spotify || ''
    },
    year: spotifyTrack.album?.release_date ? new Date(spotifyTrack.album.release_date).getFullYear().toString() : 'Unknown',
    releaseDate: spotifyTrack.album?.release_date || '',
    duration: spotifyTrack.duration_ms ? Math.floor(spotifyTrack.duration_ms / 1000) : 0,
    label: spotifyTrack.album?.label || 'Unknown',
    primaryArtists: spotifyTrack.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist',
    primaryArtistsId: spotifyTrack.artists?.map(artist => artist.id).join(',') || '',
    featuredArtists: '',
    featuredArtistsId: '',
    explicitContent: spotifyTrack.explicit || false,
    playCount: 0,
    language: 'English',
    hasLyrics: false,
    url: spotifyTrack.external_urls?.spotify || '',
    copyright: spotifyTrack.album?.copyrights?.map(c => c.text).join(', ') || '',
    image: spotifyTrack.album?.images?.map(img => ({
      quality: `${img.width}x${img.height}`,
      link: img.url
    })) || [],
    downloadUrl: []
  };
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// API endpoint for user registration
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Name must be between 2 and 50 characters'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    try {
      // Try MongoDB first
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Create user in MongoDB
      const user = new User({
        email: email.toLowerCase(),
        name,
        password // Will be hashed by the pre-save middleware
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ User registered successfully in MongoDB:', user.email);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name
        }
      });
    } catch (mongoError) {
      console.warn('⚠️ MongoDB registration failed, using fallback storage:', mongoError.message);

      // Fallback to in-memory storage
      const existingUser = fallbackUsers.find(u => u.email === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user in fallback storage
      const user = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        name,
        password: hashedPassword
      };

      fallbackUsers.push(user);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ User registered successfully in fallback storage:', user.email);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    }
  } catch (error) {
    console.error('❌ Error registering user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// API endpoint for user login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    try {
      // Try MongoDB first
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Verify password using the model method
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ User logged in successfully from MongoDB:', user.email);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name
        }
      });
    } catch (mongoError) {
      console.warn('⚠️ MongoDB login failed, using fallback storage:', mongoError.message);

      // Fallback to in-memory storage
      const user = fallbackUsers.find(u => u.email === email.toLowerCase());
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ User logged in successfully from fallback storage:', user.email);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    }
  } catch (error) {
    console.error('❌ Error logging in:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// API endpoint to get user profile (protected)
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Test endpoint to verify analytics system is working
app.post('/api/test/play', async (req, res) => {
  try {
    console.log('[Test] Received test play request:', req.body);
    res.json({
      success: true,
      message: 'Test endpoint working - check analytics routes for actual functionality'
    });
  } catch (error) {
    console.error('[Test] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to test Spotify connection
app.get('/api/test/spotify', async (req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken();

    // Test with a simple search instead of playlist access
    const testResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        q: 'test',
        type: 'track',
        limit: 1
      }
    });

    res.json({
      success: true,
      message: 'Spotify API connection working',
      testData: testResponse.data
    });
  } catch (error) {
    console.error('Spotify test error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

// Helper to scrape public Spotify playlist data from Embed page when official API fails (e.g. 403 Premium restriction)
async function getSpotifyEmbedPlaylistData(playlistId) {
  const axios = require('axios');
  const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  const html = response.data;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/) ||
    html.match(/<script id="initial-state" type="application\/json">([\s\S]*?)<\/script>/);

  if (!match) {
    throw new Error('Unable to extract playlist data from Spotify');
  }

  const data = JSON.parse(match[1].trim());
  const entity = data.props?.pageProps?.state?.data?.entity;

  if (!entity || !entity.trackList || entity.trackList.length === 0) {
    throw new Error('Playlist is empty or private');
  }

  const convertedTracks = entity.trackList.map((item, idx) => {
    const trackId = item.uid || (item.uri ? item.uri.split(':').pop() : `spotify-${playlistId}-${idx}`);
    const audioUrl = item.audioPreview?.url || `https://open.spotify.com/track/${trackId}`;
    const coverImage = entity.coverArt?.sources?.[0]?.url || item.images?.[0]?.url || null;

    return {
      id: trackId,
      name: item.title || 'Unknown Track',
      primaryArtists: item.subtitle || 'Unknown Artist',
      album: {
        id: `album-${playlistId}`,
        name: entity.name || entity.title || 'Spotify Playlist',
        url: ''
      },
      duration: item.duration ? Math.round(item.duration / 1000) : 180,
      url: audioUrl,
      downloadUrl: [
        { quality: '320kbps', link: audioUrl },
        { quality: '160kbps', link: audioUrl },
        { quality: '96kbps', link: audioUrl },
        { quality: '12kbps', link: audioUrl }
      ],
      image: coverImage ? [
        { quality: '500x500', link: coverImage },
        { quality: '150x150', link: coverImage }
      ] : []
    };
  });

  // Enrich tracks with JioSaavn search matches
  const enrichedTracks = [];
  for (const track of convertedTracks) {
    try {
      const searchQuery = `${track.name} ${track.primaryArtists.split(',')[0] || ''}`;
      const jioSaavnMatch = await searchSongOnJioSaavn(searchQuery);
      if (jioSaavnMatch && jioSaavnMatch.id) {
        enrichedTracks.push({
          ...jioSaavnMatch,
          spotifyUrl: track.url,
          album: track.album
        });
      } else {
        enrichedTracks.push(track);
      }
    } catch {
      enrichedTracks.push(track);
    }
  }

  return {
    id: playlistId,
    name: entity.name || entity.title || 'Spotify Playlist',
    description: entity.subtitle || '',
    tracks: enrichedTracks,
    image: entity.coverArt?.sources?.[0]?.url || null
  };
}

// API endpoint to import Spotify playlist
app.get('/api/import/spotify/:playlistId', apiLimiter, async (req, res) => {
  const { playlistId } = req.params;

  // Check for common Spotify curated playlist patterns that won't work
  if (playlistId.startsWith('37i9dQZF1D') || playlistId.startsWith('37i9dQZEVX')) {
    return res.status(400).json({
      success: false,
      error: 'Spotify curated playlists (like Discover Weekly, Daily Mix, etc.) cannot be imported using our current setup. Please try importing a public user-created playlist instead.'
    });
  }

  try {
    // Try Spotify Web API first
    const accessToken = await getSpotifyAccessToken();
    const playlistData = await getSpotifyPlaylistTracks(playlistId, accessToken);

    if (!playlistData || !playlistData.tracks || !playlistData.tracks.items) {
      throw new Error('Invalid playlist data received from Spotify API');
    }

    const convertedTracks = playlistData.tracks.items.map(item => {
      if (!item || !item.track) return null;
      return convertSpotifyToJioSaavn(item.track);
    }).filter(Boolean);

    const enrichedTracks = [];
    for (const track of convertedTracks) {
      try {
        const searchQuery = `${track.name} ${track.primaryArtists.split(',')[0] || ''}`;
        const jioSaavnMatch = await searchSongOnJioSaavn(searchQuery);
        enrichedTracks.push(jioSaavnMatch ? { ...jioSaavnMatch, spotifyUrl: track.url, album: track.album } : track);
      } catch {
        enrichedTracks.push(track);
      }
    }

    return res.json({
      success: true,
      playlist: {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        tracks: enrichedTracks,
        image: playlistData.images?.[0]?.url || null
      }
    });
  } catch (apiError) {
    console.warn(`Spotify Official API failed (${apiError.message}), using fallback Embed Scraper...`);
    try {
      const fallbackPlaylist = await getSpotifyEmbedPlaylistData(playlistId);
      return res.json({
        success: true,
        playlist: fallbackPlaylist
      });
    } catch (fallbackError) {
      console.error('Spotify import fallback also failed:', fallbackError.message);
      return res.status(500).json({
        success: false,
        error: `Import failed: ${fallbackError.message}`
      });
    }
  }
});

// API endpoint to import YouTube playlist
app.get('/api/import/youtube/:playlistId', apiLimiter, async (req, res) => {
  try {
    const { playlistId } = req.params;
    console.log(`\n--- DEBUGGING YOUTUBE IMPORT PIPELINE ---`);
    console.log(`1. Extracted playlist ID: ${playlistId}`);

    if (!innertubeClient) {
      console.log(`2. youtubei.js failed: Client not initialized`);
      return res.status(503).json({ success: false, error: 'YouTube client not initialized yet. Please try again in a few seconds.' });
    }

    console.log(`2. youtubei.js successfully initialized, fetching playlist...`);

    // Fetch playlist
    const playlist = await innertubeClient.getPlaylist(playlistId);

    if (!playlist || !playlist.items || playlist.items.length === 0) {
      console.log(`3. Playlist fetch failed: Not found or empty`);
      return res.status(404).json({ success: false, error: 'Playlist not found or empty' });
    }

    console.log(`3. Playlist loaded successfully. Title: "${playlist.info?.title}"`);
    console.log(`4. Total number of items returned by youtubei.js: ${playlist.items.length}`);

    if (playlist.items.length > 0) {
      console.log(`5. The constructor/type of the first 3 playlist items:`);
      for (let i = 0; i < Math.min(3, playlist.items.length); i++) {
        console.log(`   Item ${i}: type='${playlist.items[i].type}', constructor='${playlist.items[i].constructor.name}'`);
      }
      console.log(`6. Complete raw object of the first playlist item:`);
      console.log(JSON.stringify(playlist.items[0], null, 2).substring(0, 500) + '... (truncated for brevity)');
    }

    let allItems = [...playlist.items];
    let currentFeed = playlist;
    let continuation = currentFeed.has_continuation;

    // Fetch continuations for large playlists (up to 1000 items to prevent timeouts)
    let pageCount = 0;
    while (continuation && pageCount < 10) {
      pageCount++;
      try {
        const nextData = await currentFeed.getContinuation();
        if (nextData && nextData.items && nextData.items.length > 0) {
          allItems = [...allItems, ...nextData.items];
          continuation = nextData.has_continuation;
          currentFeed = nextData;
        } else {
          continuation = false;
        }
      } catch (err) {
        console.warn('[YouTube] Continuation error:', err.message);
        break; // Stop paginating on error, return what we have
      }
    }

    // Map to AudioNova Song format
    const tracks = allItems.map(item => {
      // Handle standard videos, playlist items, and music playlist items
      if (item.type !== 'Video' && item.type !== 'PlaylistItem' && item.type !== 'LockupView' && item.type !== 'PlaylistVideo') return null;

      let videoId = item.id || item.content_id || item.videoId;
      if (!videoId) return null;

      let title = item.title?.text || item.title || item.metadata?.title?.text || 'Unknown Video';
      let author = item.author?.name || item.metadata?.primary_text?.text || 'Unknown Channel';

      let durationSeconds = 0;
      if (item.duration?.seconds) {
        durationSeconds = item.duration.seconds;
      } else {
        let durationStr = item.metadata?.secondary_text?.text;

        // Search through thumbnail badges for duration (e.g. "5:00") in YouTube Music LockupViews
        if (!durationStr && item.content_image?.overlays) {
          for (const overlay of item.content_image.overlays) {
            if (overlay.badges) {
              for (const badge of overlay.badges) {
                if (badge.text && /^\d+(:\d+)+$/.test(badge.text)) {
                  durationStr = badge.text;
                  break;
                }
              }
            }
            if (durationStr) break;
          }
        }

        if (durationStr) {
          const parts = durationStr.split(':').reverse();
          durationSeconds = parts.reduce((acc, val, idx) => acc + parseInt(val || '0', 10) * Math.pow(60, idx), 0);
        }
      }

      // If we still don't have duration, default to 180 (3 mins) instead of throwing away the song
      // This is a much safer fallback than returning null for a valid song
      if (durationSeconds === 0) durationSeconds = 180;

      const rawThumbnails = item.thumbnails || item.content_image?.image || [];
      const image = rawThumbnails.length > 0 ? rawThumbnails.map(t => ({
        quality: `${t.width}x${t.height}`,
        link: t.url
      })) : [];

      return {
        id: `yt:${videoId}`,
        name: title,
        primaryArtists: author,
        album: playlist.info?.title || 'YouTube Playlist',
        duration: durationSeconds,
        image: image,
        url: `https://youtube.com/watch?v=${videoId}`,
        downloadUrl: [], // Intentionally empty, resolved JIT
        explicitContent: false,
        language: 'YouTube',
        hasLyrics: false,
        playCount: 0,
        year: new Date().getFullYear().toString(),
      };
    });

    console.log(`7. Number of mapped Song objects BEFORE filtering: ${tracks.length}`);
    let filteredTracks = tracks.filter(Boolean);

    // Deduplicate tracks by video ID (YouTube playlists can contain the same video multiple times)
    const uniqueIds = new Set();
    filteredTracks = filteredTracks.filter(track => {
      if (uniqueIds.has(track.id)) return false;
      uniqueIds.add(track.id);
      return true;
    });

    console.log(`8. Number of Song objects AFTER filtering and deduplication: ${filteredTracks.length}`);

    const finalResponse = {
      success: true,
      playlist: {
        id: playlistId,
        name: playlist.info?.title || 'YouTube Playlist',
        description: playlist.info?.description || '',
        tracks: filteredTracks,
        image: playlist.info?.thumbnails?.[0]?.url || filteredTracks[0]?.image?.[0]?.link || null
      }
    };

    console.log(`9. Final JSON response (tracks array length: ${finalResponse.playlist.tracks.length})`);

    res.json(finalResponse);
  } catch (error) {
    console.error('Error importing YouTube playlist:', error.message);
    res.status(500).json({
      success: false,
      error: `Failed to import YouTube playlist: ${error.message}`
    });
  }
});

// API endpoint to stream YouTube audio JIT (Backend Proxy)
app.get('/api/stream/youtube/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    // Use @distube/ytdl-core to reliably resolve the streaming URL.
    // This runs completely in Node.js and avoids Python/yt-dlp binary dependencies on Railway.
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });

    if (!format || !format.url) {
      return res.status(404).json({ success: false, error: 'No suitable audio format found via ytdl-core' });
    }

    const streamUrl = format.url;

    // Set CORS headers for the frontend Web Audio API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Encoding, Content-Length, Content-Range');

    const range = req.headers.range;

    // Setup fetch options for streaming from Google
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    };

    if (range) {
      fetchOptions.headers['Range'] = range;
    }

    const streamResponse = await axios({
      method: 'GET',
      url: streamUrl,
      headers: fetchOptions.headers,
      responseType: 'stream',
      validateStatus: (status) => status >= 200 && status < 400
    });

    // Forward headers from Google to the client
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    headersToForward.forEach(header => {
      if (streamResponse.headers[header]) {
        res.setHeader(header, streamResponse.headers[header]);
      }
    });

    res.status(streamResponse.status);

    // Pipe the audio stream to the client
    streamResponse.data.pipe(res);

  } catch (error) {
    console.error('Error streaming YouTube audio:', error.message);
    res.status(500).json({
      success: false,
      error: `Failed to stream YouTube audio: ${error.message}`
    });
  }
});

// Trending endpoint is now handled by the trending router above

// Add JioSaavn proxy routes (avoids browser CORS issues)
const jiosaavnProxyRouter = require('./routes/jiosaavn-proxy');
app.use('/api/jiosaavn', jiosaavnProxyRouter);

// Add user data sync routes (liked songs, playlists)
const userSyncRouter = require('./routes/user-sync');
app.use('/api/sync', userSyncRouter);

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the React frontend for any unmatched routes (only if dist exists)
const fs = require('fs');
const distIndexPath = path.join(__dirname, '../dist/index.html');
app.get('*', (req, res) => {
  // Don't interfere with API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Only serve React app if dist folder exists (not available on Railway backend-only)
  if (fs.existsSync(distIndexPath)) {
    res.sendFile(distIndexPath);
  } else {
    res.status(200).json({
      status: 'ok',
      message: 'AudioNova API Server running',
      version: '1.0.0'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});