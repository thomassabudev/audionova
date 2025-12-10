/**
 * Cover Art Verification Service
 * Implements canonical ID flow with metadata verification and fallback sequence
 */

const axios = require('axios');
const { isMatch } = require('../utils/stringUtils');
const { validateImageUrl } = require('../utils/imageValidator');

const JIOSAAVN_API_BASE = process.env.JIOSAAVN_API_BASE || 'https://jiosaavn-api-privatecvc2.vercel.app';
const ITUNES_API_BASE = 'https://itunes.apple.com/search';
const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const COVERART_ARCHIVE_BASE = 'https://coverartarchive.org';

// Rate limiting
const rateLimits = {
  jiosaavn: { delay: 100, lastCall: 0 },
  itunes: { delay: 200, lastCall: 0 },
  musicbrainz: { delay: 1000, lastCall: 0 },
};

async function rateLimit(service) {
  const limit = rateLimits[service];
  if (!limit) return;
  
  const now = Date.now();
  const timeSinceLastCall = now - limit.lastCall;
  
  if (timeSinceLastCall < limit.delay) {
    await new Promise(resolve => setTimeout(resolve, limit.delay - timeSinceLastCall));
  }
  
  limit.lastCall = Date.now();
}

/**
 * Fetch song detail from JioSaavn by canonical ID
 */
async function fetchJioSaavnDetail(songId) {
  await rateLimit('jiosaavn');
  
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE}/songs/${songId}`, {
      timeout: 10000,
    });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error) {
    console.error(`[JioSaavn] Failed to fetch detail for ${songId}:`, error.message);
    return null;
  }
}

/**
 * Search and verify cover from JioSaavn
 */
async function verifyFromJioSaavn(queryMeta) {
  await rateLimit('jiosaavn');
  
  try {
    const searchQuery = `${queryMeta.title} ${queryMeta.artist}`;
    const response = await axios.get(`${JIOSAAVN_API_BASE}/search/songs`, {
      params: { query: searchQuery, limit: 8 },
      timeout: 10000,
    });
    
    const candidates = response.data?.data?.results || [];
    
    console.log(`[JioSaavn] Found ${candidates.length} candidates for "${searchQuery}"`);
    
    // Iterate through candidates
    for (let i = 0; i < Math.min(candidates.length, 8); i++) {
      const candidate = candidates[i];
      
      // Fetch canonical detail
      const detail = await fetchJioSaavnDetail(candidate.id);
      
      if (!detail) {
        console.log(`[JioSaavn] Skipping candidate ${i + 1}: no detail`);
        continue;
      }
      
      // Verify metadata match
      const matchResult = isMatch(detail, queryMeta);
      
      if (!matchResult.match) {
        console.log(`[JioSaavn] Candidate ${i + 1} rejected: ${matchResult.reason}`, matchResult.scores);
        continue;
      }
      
      // Extract cover URL (prefer high quality)
      const coverUrl = detail.image?.[2]?.link || detail.image?.[1]?.link || detail.image?.[0]?.link;
      
      if (!coverUrl) {
        console.log(`[JioSaavn] Candidate ${i + 1} has no cover URL`);
        continue;
      }
      
      // Validate image
      const imageValidation = await validateImageUrl(coverUrl);
      
      if (!imageValidation.valid) {
        console.log(`[JioSaavn] Candidate ${i + 1} image invalid:`, imageValidation.error);
        continue;
      }
      
      // Success!
      console.log(`[JioSaavn] ✓ Match found (candidate ${i + 1})`, matchResult.scores);
      
      return {
        song_id: detail.id,
        cover_url: coverUrl,
        source: 'saavn',
        verified: true,
        metadata: {
          title: detail.name || detail.title,
          artist: detail.primaryArtists || detail.artist,
          album: detail.album?.name || detail.album,
          language: detail.language,
        },
        similarity_scores: matchResult.scores,
      };
    }
    
    console.log('[JioSaavn] No matching candidates found');
    return null;
  } catch (error) {
    console.error('[JioSaavn] Search error:', error.message);
    return null;
  }
}

/**
 * Search and verify cover from iTunes
 */
async function verifyFromItunes(queryMeta) {
  await rateLimit('itunes');
  
  try {
    const searchTerm = `${queryMeta.title} ${queryMeta.artist}`;
    const response = await axios.get(ITUNES_API_BASE, {
      params: {
        term: searchTerm,
        entity: 'song',
        limit: 8,
      },
      timeout: 10000,
    });
    
    const results = response.data?.results || [];
    
    console.log(`[iTunes] Found ${results.length} results for "${searchTerm}"`);
    
    for (const result of results) {
      const detail = {
        title: result.trackName,
        artist: result.artistName,
        album: result.collectionName,
        language: null, // iTunes doesn't provide language
      };
      
      // Verify metadata (skip language check for iTunes)
      const matchResult = isMatch(detail, { ...queryMeta, language: null });
      
      if (!matchResult.match) {
        continue;
      }
      
      // Get cover URL (prefer high resolution)
      const coverUrl = result.artworkUrl100?.replace('100x100', '600x600') || result.artworkUrl100;
      
      if (!coverUrl) continue;
      
      // Validate image
      const imageValidation = await validateImageUrl(coverUrl);
      
      if (!imageValidation.valid) continue;
      
      console.log('[iTunes] ✓ Match found', matchResult.scores);
      
      return {
        song_id: `itunes_${result.trackId}`,
        cover_url: coverUrl,
        source: 'itunes',
        verified: true,
        metadata: detail,
        similarity_scores: matchResult.scores,
      };
    }
    
    console.log('[iTunes] No matching results found');
    return null;
  } catch (error) {
    console.error('[iTunes] Search error:', error.message);
    return null;
  }
}

/**
 * Search and verify cover from MusicBrainz + Cover Art Archive
 */
async function verifyFromMusicBrainz(queryMeta) {
  await rateLimit('musicbrainz');
  
  try {
    const searchQuery = `recording:"${queryMeta.title}" AND artist:"${queryMeta.artist}"`;
    const response = await axios.get(`${MUSICBRAINZ_API_BASE}/recording`, {
      params: {
        query: searchQuery,
        fmt: 'json',
        limit: 5,
      },
      headers: {
        'User-Agent': 'MusicStreamingApp/1.0 (contact@example.com)',
      },
      timeout: 10000,
    });
    
    const recordings = response.data?.recordings || [];
    
    console.log(`[MusicBrainz] Found ${recordings.length} recordings`);
    
    for (const recording of recordings) {
      const detail = {
        title: recording.title,
        artist: recording['artist-credit']?.[0]?.name,
        album: recording.releases?.[0]?.title,
      };
      
      const matchResult = isMatch(detail, { ...queryMeta, language: null });
      
      if (!matchResult.match) continue;
      
      // Try to get cover from Cover Art Archive
      const releaseId = recording.releases?.[0]?.id;
      if (!releaseId) continue;
      
      try {
        await rateLimit('musicbrainz');
        const coverResponse = await axios.get(`${COVERART_ARCHIVE_BASE}/release/${releaseId}`, {
          timeout: 10000,
        });
        
        const coverUrl = coverResponse.data?.images?.[0]?.thumbnails?.large || 
                        coverResponse.data?.images?.[0]?.image;
        
        if (!coverUrl) continue;
        
        const imageValidation = await validateImageUrl(coverUrl);
        
        if (!imageValidation.valid) continue;
        
        console.log('[MusicBrainz] ✓ Match found', matchResult.scores);
        
        return {
          song_id: `mb_${recording.id}`,
          cover_url: coverUrl,
          source: 'musicbrainz',
          verified: true,
          metadata: detail,
          similarity_scores: matchResult.scores,
        };
      } catch (coverError) {
        // Cover not available for this release
        continue;
      }
    }
    
    console.log('[MusicBrainz] No matching results with covers found');
    return null;
  } catch (error) {
    console.error('[MusicBrainz] Search error:', error.message);
    return null;
  }
}

/**
 * Main function: Fetch cover for song with fallback sequence
 */
async function fetchCoverForSong(queryMeta) {
  console.log('[CoverVerification] Starting verification for:', queryMeta);
  
  const startTime = Date.now();
  
  // 1. Try JioSaavn (primary source)
  let result = await verifyFromJioSaavn(queryMeta);
  if (result) {
    result.verification_time_ms = Date.now() - startTime;
    return result;
  }
  
  // 2. Fallback to iTunes
  console.log('[CoverVerification] Falling back to iTunes...');
  result = await verifyFromItunes(queryMeta);
  if (result) {
    result.verification_time_ms = Date.now() - startTime;
    return result;
  }
  
  // 3. Fallback to MusicBrainz
  console.log('[CoverVerification] Falling back to MusicBrainz...');
  result = await verifyFromMusicBrainz(queryMeta);
  if (result) {
    result.verification_time_ms = Date.now() - startTime;
    return result;
  }
  
  // 4. All sources failed
  console.log('[CoverVerification] All sources failed, returning null');
  
  return {
    song_id: null,
    cover_url: null,
    source: 'none',
    verified: false,
    verification_time_ms: Date.now() - startTime,
    error: 'No matching cover found in any source',
  };
}

module.exports = {
  fetchCoverForSong,
  verifyFromJioSaavn,
  verifyFromItunes,
  verifyFromMusicBrainz,
};
