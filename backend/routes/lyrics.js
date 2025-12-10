// backend/routes/lyrics.js
// Backend proxy for lyrics API to keep provider keys secure

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Mock lyrics data for development
const mockLyrics = {
  'mock-song-1': {
    providerId: 'mock',
    providerName: 'Mock Lyrics Provider',
    lines: [
      { time: 0, text: 'Lyrics not available for this track' },
      { time: 5, text: 'This is a mock response for development' },
      { time: 10, text: 'In a real implementation, this would fetch from a licensed provider' }
    ],
    attribution: 'Lyrics provided by Mock Provider',
    externalUrl: 'https://example.com/lyrics'
  }
};

// GET /api/lyrics?songId=...
router.get('/', async (req, res) => {
  try {
    const { songId } = req.query;
    
    if (!songId) {
      return res.status(400).json({
        error: 'Missing songId parameter'
      });
    }
    
    // Check if we have mock data for this song
    if (mockLyrics[songId]) {
      return res.json(mockLyrics[songId]);
    }
    
    // Try to fetch from Musixmatch API
    const musixmatchApiKey = process.env.MUSIXMATCH_API_KEY;
    if (musixmatchApiKey) {
      try {
        // First, search for the track
        const searchResponse = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
          params: {
            q_track: songId,
            page_size: 1,
            page: 1,
            s_track_rating: 'desc',
            format: 'json',
            apikey: musixmatchApiKey
          }
        });
        
        if (searchResponse.data.message.body.track_list.length > 0) {
          const track = searchResponse.data.message.body.track_list[0].track;
          const trackId = track.track_id;
          
          // Then, get the lyrics for the track
          const lyricsResponse = await axios.get('https://api.musixmatch.com/ws/1.1/track.lyrics.get', {
            params: {
              track_id: trackId,
              format: 'json',
              apikey: musixmatchApiKey
            }
          });
          
          if (lyricsResponse.data.message.body.lyrics) {
            const lyricsBody = lyricsResponse.data.message.body.lyrics.lyrics_body;
            const lyricsUrl = lyricsResponse.data.message.body.lyrics.backlink_url;
            
            // Parse the lyrics into timed lines (simplified parsing)
            const lines = parseLyricsBody(lyricsBody);
            
            return res.json({
              providerId: 'musixmatch',
              providerName: 'Musixmatch',
              lines: lines,
              attribution: 'Lyrics provided by Musixmatch',
              externalUrl: lyricsUrl
            });
          }
        }
      } catch (musixmatchError) {
        console.error('Musixmatch API error:', musixmatchError);
        // Fall through to return not found
      }
    }
    
    // If no lyrics found, return appropriate response
    return res.json({
      providerId: 'none',
      providerName: 'No Provider',
      lines: null,
      attribution: '',
      externalUrl: null
    });
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    res.status(500).json({
      error: 'Failed to fetch lyrics'
    });
  }
});

// Simple function to parse lyrics body into timed lines
function parseLyricsBody(lyricsBody) {
  if (!lyricsBody) return [];
  
  // This is a simplified parser - in a real implementation, you would parse LRC format
  // or use a more sophisticated timing mechanism
  const lines = lyricsBody.split('\n')
    .filter(line => line.trim() !== '')
    .map((text, index) => ({
      time: index * 3, // Simple 3-second intervals for demo
      text: text.trim()
    }));
  
  return lines;
}

// POST /api/lyrics/upload - User submitted lyrics
router.post('/upload', async (req, res) => {
  try {
    const { songId, lyricsText, userHasRights } = req.body;
    
    if (!songId || !lyricsText) {
      return res.status(400).json({
        error: 'Missing required fields: songId, lyricsText'
      });
    }
    
    if (!userHasRights) {
      return res.status(400).json({
        error: 'User must confirm they have rights to publish these lyrics'
      });
    }
    
    // In a real implementation, you would save this to a database for moderation
    console.log(`User submitted lyrics for song ${songId}`);
    console.log('Lyrics text:', lyricsText);
    console.log('User confirmed rights:', userHasRights);
    
    // For now, just return success
    return res.json({
      success: true,
      message: 'Lyrics submitted for moderation'
    });
  } catch (error) {
    console.error('Error uploading lyrics:', error);
    res.status(500).json({
      error: 'Failed to upload lyrics'
    });
  }
});

module.exports = router;