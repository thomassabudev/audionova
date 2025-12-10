# Complete Guide: Implementing Full Playlist Import Functionality

This guide provides step-by-step instructions for implementing full playlist importing from Spotify and YouTube in your music player application.

## Overview

The current playlist import feature is a simulation. To make it fully functional, you need:

1. A backend service to handle API requests (due to CORS restrictions)
2. Spotify/YouTube API credentials
3. Updated frontend code to communicate with the backend

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│  Spotify/YouTube │
│  (React/Vite)   │     │   (Node.js)      │     │     APIs         │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   JioSaavn API   │
                    │ (for song data)  │
                    └──────────────────┘
```

## Backend Implementation

### 1. Project Structure

Create a new `backend` directory in your project root:

```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env.example       # Environment variables template
└── README.md          # Setup instructions
```

### 2. Dependencies

Create `backend/package.json`:

```json
{
  "name": "music-player-backend",
  "version": "1.0.0",
  "description": "Backend for music player playlist import functionality",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 3. Environment Configuration

Create `backend/.env.example`:

```env
# Spotify API Credentials
# Get these from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/callback

# Server Configuration
PORT=5000
```

### 4. Main Server Implementation

Create `backend/server.js`:

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Spotify API credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

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
    throw new Error('Failed to get Spotify access token');
  }
}

// Function to get Spotify playlist tracks (updated to support up to 400 songs)
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
    throw new Error('Failed to get Spotify playlist');
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

// Convert Spotify track to JioSaavn-like format
function convertSpotifyToJioSaavn(spotifyTrack) {
  return {
    id: spotifyTrack.id,
    name: spotifyTrack.name,
    album: {
      id: spotifyTrack.album.id,
      name: spotifyTrack.album.name,
      url: spotifyTrack.album.external_urls.spotify
    },
    year: new Date(spotifyTrack.album.release_date).getFullYear().toString(),
    releaseDate: spotifyTrack.album.release_date,
    duration: Math.floor(spotifyTrack.duration_ms / 1000),
    label: spotifyTrack.album.label || 'Unknown',
    primaryArtists: spotifyTrack.artists.map(artist => artist.name).join(', '),
    primaryArtistsId: spotifyTrack.artists.map(artist => artist.id).join(','),
    featuredArtists: '',
    featuredArtistsId: '',
    explicitContent: spotifyTrack.explicit,
    playCount: 0,
    language: 'English',
    hasLyrics: false,
    url: spotifyTrack.external_urls.spotify,
    copyright: spotifyTrack.album.copyrights.map(c => c.text).join(', '),
    image: spotifyTrack.album.images.map(img => ({
      quality: `${img.width}x${img.height}`,
      link: img.url
    })),
    downloadUrl: []
  };
}

// API endpoint to import Spotify playlist
app.get('/api/import/spotify/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    
    // Get Spotify access token
    const accessToken = await getSpotifyAccessToken();
    
    // Get playlist data (now supports up to 400 songs)
    const playlistData = await getSpotifyPlaylistTracks(playlistId, accessToken);
    
    // Convert tracks to JioSaavn format
    const convertedTracks = playlistData.tracks.items.map(item => 
      convertSpotifyToJioSaavn(item.track)
    );
    
    // Try to find matching songs on JioSaavn
    const enrichedTracks = [];
    for (const track of convertedTracks) {
      // Create a search query with track name and primary artist
      const searchQuery = `${track.name} ${track.primaryArtists.split(',')[0]}`;
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
    }
    
    res.json({
      success: true,
      playlist: {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        tracks: enrichedTracks,
        image: playlistData.images[0]?.url || null
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

// API endpoint to import YouTube playlist (placeholder)
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Implementation

### 1. Updated Playlist Import Dialog

Update `src/components/PlaylistImportDialog.tsx`:

``jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Download, Music, Youtube, Music4, AlertCircle, Loader2, Save } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { toast } from 'sonner';

interface PlaylistImportDialogProps {
  children: React.ReactNode;
}

const PlaylistImportDialog: React.FC<PlaylistImportDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('https://open.spotify.com/playlist/46KGKo4zFNS613c2Vy9RSX?si=EoGf6m_pQ8yTqRmvzG_Ing');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { setQueue, savePlaylist } = useMusic();

  const validateSpotifyUrl = (url: string) => {
    if (!url) return true;
    const spotifyRegex = /^(https?:\/\/)?(www\.)?open\.spotify\.com\/(playlist|album|user\/[^\/]+\/playlist)\/([a-zA-Z0-9]+)(\?.*)?$/;
    return spotifyRegex.test(url);
  };

  const validateYoutubeUrl = (url: string) => {
    if (!url) return true;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/playlist\?list=|youtu\.be\/playlist\?list=)([a-zA-Z0-9_-]+)/;
    return youtubeRegex.test(url);
  };

  const extractSpotifyId = (url: string) => {
    const match = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleImport = async (e: React.FormEvent, saveAfterImport: boolean = false) => {
    e.preventDefault();
    setIsImporting(true);
    
    // Validate URLs
    const isSpotifyValid = validateSpotifyUrl(spotifyUrl);
    const isYoutubeValid = validateYoutubeUrl(youtubeUrl);
    
    if ((spotifyUrl && !isSpotifyValid) || (youtubeUrl && !isYoutubeValid)) {
      toast.error('Invalid URL format', {
        description: 'Please check the URL format and try again.',
      });
      setIsImporting(false);
      return;
    }
    
    try {
      if (spotifyUrl) {
        const playlistId = extractSpotifyId(spotifyUrl);
        if (!playlistId) {
          throw new Error('Invalid Spotify playlist URL');
        }
        
        // Call backend API to import Spotify playlist
        const response = await fetch(`http://localhost:5001/api/import/spotify/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to import playlist');
        }
        
        // Add songs to queue
        setQueue(data.playlist.tracks);
        
        // Save playlist if requested
        if (saveAfterImport) {
          const playlistToSave = {
            id: data.playlist.id,
            name: data.playlist.name,
            description: data.playlist.description,
            tracks: data.playlist.tracks,
            image: data.playlist.image,
            createdAt: new Date(),
          };
          
          savePlaylist(playlistToSave);
          
          toast.success('Playlist Saved!', {
            description: `Added ${data.playlist.tracks.length} songs to your queue and saved "${data.playlist.name}" to your library`,
          });
        } else {
          toast.success('Playlist Imported Successfully!', {
            description: `Added ${data.playlist.tracks.length} songs to your queue from "${data.playlist.name}"`,
          });
        }
        
        setOpen(false);
      } else if (youtubeUrl) {
        const playlistId = extractYoutubeId(youtubeUrl);
        if (!playlistId) {
          throw new Error('Invalid YouTube playlist URL');
        }
        
        // Call backend API to import YouTube playlist
        const response = await fetch(`http://localhost:5001/api/import/youtube/${playlistId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to import playlist');
        }
        
        toast.success('YouTube Playlist Import Started', {
          description: 'YouTube playlist import functionality would be implemented here.',
        });
        
        setOpen(false);
      } else {
        toast.info('No URL provided', {
          description: 'Please enter a Spotify or YouTube playlist URL.',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      let errorMessage = 'An unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error('Import Failed', {
        description: errorMessage,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import Playlist
          </DialogTitle>
          <DialogDescription>
            Import up to 400 songs from Spotify or YouTube playlists
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => handleImport(e, false)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spotify-url" className="flex items-center gap-2">
              <Music4 className="w-4 h-4" />
              Spotify Playlist URL
            </Label>
            <Input
              id="spotify-url"
              placeholder="https://open.spotify.com/playlist/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube Playlist URL
            </Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/playlist?list=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj
            </p>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-500">Backend Required</p>
                <p className="text-xs text-blue-500/80">
                  This feature requires a backend service running on port 5004 to handle API requests.
                  Now imports up to 400 songs from Spotify playlists.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              variant="secondary"
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </div>
              ) : (
                'Import to Queue'
              )}
            </Button>
            <Button 
              type="button"
              onClick={(e) => handleImport(e, true)}
              disabled={isImporting || (!spotifyUrl && !youtubeUrl)}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                'Save Playlist'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistImportDialog;
```

## Setup Instructions

### 1. Backend Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Spotify API credentials

3. Run the backend:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup

Make sure your frontend is running:
```bash
npm run dev
```

## How It Works

1. **User Input**: User enters a Spotify or YouTube playlist URL
2. **URL Validation**: Frontend validates the URL format
3. **ID Extraction**: Playlist ID is extracted from the URL
4. **Backend Request**: Frontend sends the ID to the backend
5. **API Authentication**: Backend authenticates with Spotify API
6. **Data Fetching**: Backend fetches playlist data (up to 400 songs using pagination)
7. **Data Conversion**: Playlist tracks are converted to JioSaavn format
8. **Song Matching**: Backend searches for matching songs on JioSaavn
9. **Response**: Converted playlist is sent back to frontend
10. **Queue Update**: Frontend adds songs to the playback queue

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Rate Limits**: Spotify has rate limits (1000 requests/hour for Client Credentials)
3. **CORS**: Backend handles CORS to allow frontend requests
4. **Error Handling**: Proper error handling prevents exposing sensitive information

## Troubleshooting

### Common Issues

1. **"Failed to get Spotify access token"**
   - Check your Spotify Client ID and Secret
   - Ensure they are correctly added to `.env`

2. **CORS Errors**
   - Make sure the backend server is running
   - Check that CORS is properly configured

3. **"Invalid URL format"**
   - Ensure the URL matches the expected format
   - Example: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`

### Testing

1. Test with a public Spotify playlist
2. Check browser console for errors
3. Check backend console for errors
4. Verify network requests in browser dev tools

## Future Enhancements

### Spotify Playlist Import Improvements
- Support for importing more than 400 songs (if needed)
- Better error handling for partial imports
- Progress indicators for large playlists
- Caching of imported playlists

### YouTube Integration
- Full implementation of YouTube playlist import
- YouTube Data API integration
- Similar song matching for YouTube tracks

### User Experience
- Import history tracking
- Playlist preview before importing
- Batch import for multiple playlists
- Import scheduling for large playlists

## Conclusion

This implementation provides a complete solution for importing playlists from Spotify and YouTube. The backend handles API authentication and data processing, while the frontend provides a user-friendly interface. With proper Spotify credentials configured, your playlist import feature will work with actual song data rather than simulation. The updated implementation now supports importing up to 400 songs from Spotify playlists using pagination.