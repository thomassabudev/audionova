const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Debug environment variables
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);
console.log('Environment variables file path:', path.resolve(__dirname, '.env'));
console.log('Environment variables:');
console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Not set');
console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('PORT:', process.env.PORT || 5008);

const app = express();
const PORT = process.env.PORT || 5009;

// In-memory user storage for demo purposes
// In a real application, you would use a database
const users = [];

app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Spotify API credentials (you'll need to register your app at developer.spotify.com)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// SPOTIFY_REDIRECT_URI is not needed for Client Credentials flow
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5009/callback';

// JWT secret - in production, use a strong secret and store it in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Import the jiosaavnApi for fallback
const { JioSaavnAPI } = require('./services/jiosaavnApi');

// Initialize JioSaavn API
const jiosaavnApi = new JioSaavnAPI();

// Add new releases routes
const newReleasesRouter = require('./routes/new-releases');
app.use('/api/new-releases', newReleasesRouter);

// Add lyrics routes
const lyricsRouter = require('./routes/lyrics');
app.use('/api/lyrics', lyricsRouter);

// Add trending routes
const trendingRouter = require('./routes/trending');
app.use('/api/trending', trendingRouter);

// Add cover verification routes
const coverVerificationRouter = require('./routes/cover-verification');
app.use('/api/cover-verification', coverVerificationRouter);

// Function to get Spotify access token
async function getSpotifyAccessToken() {
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
        fields: 'id,name,description,images,tracks.items(track(id,name,duration_ms,explicit,external_urls,album(name,release_date,label,external_urls,images,copyrights),artists(name,id))),tracks.total',
        limit: limit,
        offset: offset
      }
    });
    
    const playlistData = initialResponse.data;
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
    throw new Error(`Failed to get Spotify playlist: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
  }
}

// Function to search for a song on JioSaavn
async function searchSongOnJioSaavn(query) {
  try {
    const response = await axios.get('https://jiosaavn-api-privatecvc2.vercel.app/search/songs', {
      params: { query, limit: 1 }
    });
    
    return response.data.data.results[0] || null;
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
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      name,
      password: hashedPassword
    };

    users.push(user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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
  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// API endpoint for user login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
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
  } catch (error) {
    console.error('Error logging in:', error.message);
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

// API endpoint to import Spotify playlist
app.get('/api/import/spotify/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken();
    
    // Get playlist data
    const playlistData = await getSpotifyPlaylistTracks(playlistId, accessToken);
    
    // Validate playlist data
    if (!playlistData || !playlistData.tracks || !playlistData.tracks.items) {
      throw new Error('Invalid playlist data received from Spotify');
    }
    
    console.log(`Successfully fetched playlist: ${playlistData.name} with ${playlistData.tracks.items.length} tracks`);
    
    // Convert tracks to JioSaavn format
    const convertedTracks = playlistData.tracks.items.map(item => {
      // Ensure item and track exist
      if (!item || !item.track) {
        console.warn('Skipping invalid track item');
        return null;
      }
      return convertSpotifyToJioSaavn(item.track);
    }).filter(track => track !== null); // Remove any null tracks
    
    console.log(`Converted ${convertedTracks.length} tracks to JioSaavn format`);
    
    // Try to find matching songs on JioSaavn
    const enrichedTracks = [];
    for (const track of convertedTracks) {
      try {
        // Create a search query with track name and primary artist
        const searchQuery = `${track.name} ${track.primaryArtists.split(',')[0] || ''}`;
        const jioSaavnMatch = await searchSongOnJioSaavn(searchQuery);
        
        if (jioSaavnMatch) {
          // Use JioSaavn data but keep some Spotify metadata
          enrichedTracks.push({
            ...jioSaavnMatch,
            spotifyUrl: track.url,
            album: track.album
          });
        } else {
          // Use converted Spotify data
          enrichedTracks.push(track);
        }
      } catch (trackError) {
        console.error('Error processing track:', trackError.message);
        // Still add the track even if enrichment fails
        enrichedTracks.push(track);
      }
    }
    
    console.log(`Enriched ${enrichedTracks.length} tracks`);
    
    res.json({
      success: true,
      playlist: {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        tracks: enrichedTracks,
        image: playlistData.images && playlistData.images[0] ? playlistData.images[0].url : null
      }
    });
  } catch (error) {
    console.error('Error importing Spotify playlist:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to import YouTube playlist (simplified)
app.get('/api/import/youtube/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    // For YouTube, we would use the YouTube Data API
    // This is a placeholder implementation
    res.json({
      success: true,
      message: 'YouTube playlist import would be implemented here',
      playlistId
    });
  } catch (error) {
    console.error('Error importing YouTube playlist:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trending endpoint is now handled by the trending router above

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve the React frontend for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});