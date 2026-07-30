const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// Parse LRC format "[mm:ss.xx] text" into timed lines
function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines  = [];
  const timeRe = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  lrcText.split('\n').forEach(line => {
    const matches = [...line.matchAll(timeRe)];
    if (!matches.length) return;
    const text = line.substring(line.lastIndexOf(']') + 1).trim();
    if (!text) return;
    matches.forEach(m => {
      const time = parseInt(m[1], 10) * 60
                 + parseInt(m[2], 10)
                 + parseInt(m[3].padEnd(3, '0'), 10) / 1000;
      lines.push({ time, text });
    });
  });

  return lines.sort((a, b) => a.time - b.time);
}

// Convert plain (unsynced) lyrics to estimated timed lines (3 s per line)
function parsePlainLyrics(text) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map((text, i) => ({ time: i * 3, text }));
}

// Normalize metadata to improve matching (Phase 1)
function normalizeMetadata(text) {
  if (!text) return '';
  // Normalize unicode
  let normalized = text.normalize('NFC');
  
  // Remove common tags
  normalized = normalized
    .replace(/\(official.*?\)/gi, '')
    .replace(/\(lyrics\)/gi, '')
    .replace(/\(audio\)/gi, '')
    .replace(/\(hd\)/gi, '')
    .replace(/\(4k\)/gi, '')
    .replace(/\[official.*?\]/gi, '')
    .replace(/\[lyrics\]/gi, '')
    .replace(/\[audio\]/gi, '')
    .replace(/\[remastered\]/gi, '')
    .replace(/\bfeat\.?\b/gi, '')
    .replace(/\bft\.?\b/gi, '');
    
  // Remove unnecessary symbols (keep unicode letters, numbers, and spaces)
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  
  return normalized.replace(/\s+/g, ' ').trim();
}

// GET /api/lyrics?songId=...&songName=...&artistName=...&hasLyrics=true&duration=...&albumName=...
router.get('/', async (req, res) => {
  const { songId, songName, artistName, hasLyrics, duration, albumName } = req.query;

  if (!songId) {
    return res.status(400).json({ error: 'Missing songId parameter' });
  }

  const normSongName = songName ? normalizeMetadata(songName) : '';
  const normArtistName = artistName ? normalizeMetadata(artistName) : '';
  const normAlbumName = albumName ? normalizeMetadata(albumName) : '';

  // ── 1. Try lrclib.net (free, no key needed — good for English/Hindi) ──────
  if (songName) {

    console.log(`[Lyrics] Trying LRCLib for: ${normSongName} - ${normArtistName}`);
    const lrcStart = Date.now();
    try {
      const lrclibParams = { 
        track_name: normSongName, 
        artist_name: normArtistName || ''
      };
      
      if (normAlbumName) lrclibParams.album_name = normAlbumName;
      if (duration) lrclibParams.duration = duration;

      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: lrclibParams,
        timeout: 6000,
      });

      const results = searchRes.data || [];
      if (results.length > 0) {
        const best = results.find(r => r.syncedLyrics) || results[0];

        if (best.syncedLyrics) {
          return res.json({
            providerId:   'lrclib',
            providerName: 'LRClib',
            lines:        parseLRC(best.syncedLyrics),
            attribution:  'Lyrics from LRClib.net',
            externalUrl:  'https://lrclib.net',
          });
        }
        if (best.plainLyrics) {
          return res.json({
            providerId:   'lrclib',
            providerName: 'LRClib',
            lines:        parsePlainLyrics(best.plainLyrics),
            attribution:  'Lyrics from LRClib.net',
            externalUrl:  'https://lrclib.net',
          });
        }
      }
      console.log(`[Lyrics] LRCLib failed (no results). Time: ${Date.now() - lrcStart}ms`);
    } catch (err) {
      console.warn(`[Lyrics] LRCLib error: ${err.message}. Time: ${Date.now() - lrcStart}ms`);
    }
  } else {
    console.log(`[Lyrics] LRCLib skipped (no songName)`);
  }

  // ── 2. JioSaavn lyrics (Fallback for Indian songs) ────────────────────────
  // We no longer depend on hasLyrics === 'true' because the JioSaavn API natively 
  // returns a safe failure response if lyrics do not exist, and relying on the flag 
  // sometimes prevents legitimate lyrics lookups (e.g. metadata glitches or updates).
  if (songId) {
    console.log(`[Lyrics] Trying JioSaavn for songId: ${songId}`);
    const jioStart = Date.now();
    try {
      const jiosaavnRes = await axios.get('https://www.jiosaavn.com/api.php', {
        params: {
          __call:      'lyrics.getLyrics',
          lyrics_id:   songId,
          ctx:         'web6dot0',
          api_version: 4,
          _format:     'json',
          _marker:     0,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer:      'https://www.jiosaavn.com/',
        },
        timeout: 8000,
      });

      const lyricsText = jiosaavnRes.data?.lyrics;
      if (lyricsText && lyricsText.trim()) {
        // JioSaavn returns HTML-encoded plain text — decode it
        const decoded = lyricsText
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        return res.json({
          providerId:   'jiosaavn',
          providerName: 'JioSaavn',
          lines:        parsePlainLyrics(decoded),
          attribution:  'Lyrics from JioSaavn',
          externalUrl:  null,
        });
      }
      console.log(`[Lyrics] JioSaavn failed (no lyrics text). Time: ${Date.now() - jioStart}ms`);
    } catch (err) {
      console.warn(`[Lyrics] JioSaavn error: ${err.message}. Time: ${Date.now() - jioStart}ms`);
    }
  }

  // ── 3. Try Musixmatch if API key is set ───────────────────────────────────
  const musixmatchApiKey = process.env.MUSIXMATCH_API_KEY;
  if (musixmatchApiKey && songName) {
    console.log(`[Lyrics] Trying Musixmatch for: ${songName}`);
    const mmStart = Date.now();
    try {
      const searchRes = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
        params: {
          q_track:        normSongName,
          q_artist:       normArtistName || '',
          page_size:      1,
          s_track_rating: 'desc',
          format:         'json',
          apikey:         musixmatchApiKey,
        },
        timeout: 8000,
      });

      const trackList = searchRes.data?.message?.body?.track_list || [];
      if (trackList.length > 0) {
        const trackId   = trackList[0].track.track_id;
        const lyricsRes = await axios.get('https://api.musixmatch.com/ws/1.1/track.lyrics.get', {
          params: { track_id: trackId, format: 'json', apikey: musixmatchApiKey },
          timeout: 8000,
        });

        const lyricsBody = lyricsRes.data?.message?.body?.lyrics?.lyrics_body;
        const lyricsUrl  = lyricsRes.data?.message?.body?.lyrics?.backlink_url;
        if (lyricsBody) {
          return res.json({
            providerId:   'musixmatch',
            providerName: 'Musixmatch',
            lines:        parsePlainLyrics(lyricsBody),
            attribution:  'Lyrics provided by Musixmatch',
            externalUrl:  lyricsUrl || null,
          });
        }
      }
      console.log(`[Lyrics] Musixmatch failed (no lyrics body). Time: ${Date.now() - mmStart}ms`);
    } catch (err) {
      console.warn(`[Lyrics] Musixmatch error: ${err.message}. Time: ${Date.now() - mmStart}ms`);
    }
  } else {
    console.log(`[Lyrics] Musixmatch skipped (missing API key or songName)`);
  }

  // ── 4. Try Vagalume API (Final Fallback) ──────────────────────────────────
  if (songName && artistName) {
    console.log(`[Lyrics] Trying Vagalume for: ${songName} - ${artistName}`);
    const vagStart = Date.now();
    try {
      const vagalumeApiKey = process.env.VAGALUME_API_KEY || '';
      const vagalumeRes = await axios.get('https://api.vagalume.com.br/search.php', {
        params: {
          art: normArtistName,
          mus: normSongName,
          apikey: vagalumeApiKey,
        },
        timeout: 8000,
      });

      if (vagalumeRes.data?.type === 'exact' || vagalumeRes.data?.type === 'aprox') {
        const mus = vagalumeRes.data?.mus?.[0];
        if (mus && mus.text) {
          return res.json({
            providerId:   'vagalume',
            providerName: 'Vagalume',
            lines:        parsePlainLyrics(mus.text),
            attribution:  'Lyrics provided by Vagalume',
            externalUrl:  mus.url || null,
          });
        }
      }
      console.log(`[Lyrics] Vagalume failed (no exact match). Time: ${Date.now() - vagStart}ms`);
    } catch (err) {
      console.warn(`[Lyrics] Vagalume error: ${err.message}. Time: ${Date.now() - vagStart}ms`);
    }
  } else {
    console.log(`[Lyrics] Vagalume skipped (missing songName or artistName)`);
  }

  // ── 5. No lyrics found ────────────────────────────────────────────────────
  console.log(`[Lyrics] Returning No Lyrics Found`);
  return res.json({
    providerId:   'none',
    providerName: 'No Provider',
    lines:        null,
    attribution:  '',
    externalUrl:  null,
  });
});

// POST /api/lyrics/translate - Process lyric lines for Singing (Malayalam/Manglish Transliteration) or Meaning
router.post('/translate', async (req, res) => {
  try {
    const { lines, mode = 'sing_ml', targetLang = 'ml' } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Missing or empty lines array' });
    }

    const fullText = lines.join('\n');

    // MODE 1: Meaning Translation (Semantic translation in Malayalam, English, Hindi, etc.)
    if (mode === 'meaning') {
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(fullText)}`;
      const response = await axios.get(translateUrl, { timeout: 8000 });

      if (response.data && Array.isArray(response.data[0])) {
        const translatedFullText = response.data[0]
          .map(chunk => (chunk && chunk[0]) ? chunk[0] : '')
          .join('');

        const translatedLines = translatedFullText.split('\n');
        const resultLines = lines.map((originalLine, idx) => {
          return (translatedLines[idx] && translatedLines[idx].trim())
            ? translatedLines[idx].trim()
            : originalLine;
        });

        return res.json({ success: true, translatedLines: resultLines, mode, targetLang });
      }
    }

    // MODE 2: English/Manglish Pronunciation (Sing in English Script)
    if (mode === 'sing_en') {
      const romanUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&dt=t&q=${encodeURIComponent(fullText)}`;
      const response = await axios.get(romanUrl, { timeout: 8000 });

      let romanizedFullText = '';
      if (response.data && Array.isArray(response.data[0])) {
        // Find chunks that explicitly provide romanization (index 3)
        const romanChunks = response.data[0].filter(chunk => chunk && chunk[3]);
        if (romanChunks.length > 0) {
          romanizedFullText = romanChunks.map(chunk => chunk[3]).join('');
        }
      }

      // If no romanization was returned (e.g. text is already in English letters), use original text.
      // We NEVER fallback to chunk[0] because chunk[0] is semantic translation!
      if (!romanizedFullText || !romanizedFullText.trim()) {
        romanizedFullText = fullText;
      }

      if (!romanizedFullText) romanizedFullText = fullText;

      const romanizedLines = romanizedFullText.split('\n');
      const resultLines = lines.map((originalLine, idx) => {
        return (romanizedLines[idx] && romanizedLines[idx].trim())
          ? romanizedLines[idx].trim()
          : originalLine;
      });

      return res.json({ success: true, translatedLines: resultLines, mode, targetLang });
    }



  } catch (err) {
    console.error('[Lyrics Translate] Error:', err.message);
    return res.status(500).json({ error: 'Failed to process lyrics', details: err.message });
  }
});

// POST /api/lyrics/upload
router.post('/upload', async (req, res) => {
  try {
    const { songId, lyricsText, userHasRights } = req.body;
    if (!songId || !lyricsText) {
      return res.status(400).json({ error: 'Missing required fields: songId, lyricsText' });
    }
    if (!userHasRights) {
      return res.status(400).json({ error: 'User must confirm they have rights to publish these lyrics' });
    }
    return res.json({ success: true, message: 'Lyrics submitted for moderation' });
  } catch (err) {
    console.error('[Lyrics] Upload error:', err.message);
    return res.status(500).json({ error: 'Failed to upload lyrics' });
  }
});

module.exports = router;
