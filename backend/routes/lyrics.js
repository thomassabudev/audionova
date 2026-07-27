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

// GET /api/lyrics?songId=...&songName=...&artistName=...&hasLyrics=true
router.get('/', async (req, res) => {
  const { songId, songName, artistName, hasLyrics } = req.query;

  if (!songId) {
    return res.status(400).json({ error: 'Missing songId parameter' });
  }

  // ── 1. Try lrclib.net (free, no key needed — good for English/Hindi) ──────
  if (songName) {
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: { track_name: songName, artist_name: artistName || '' },
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
    } catch (err) {
      console.warn('[Lyrics] lrclib.net error:', err.message);
    }
  }

  // ── 2. JioSaavn lyrics (for Indian songs with hasLyrics=true) ─────────────
  if (hasLyrics === 'true') {
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
    } catch (err) {
      console.warn('[Lyrics] JioSaavn lyrics error:', err.message);
    }
  }

  // ── 3. Try Musixmatch if API key is set ───────────────────────────────────
  const musixmatchApiKey = process.env.MUSIXMATCH_API_KEY;
  if (musixmatchApiKey && songName) {
    try {
      const searchRes = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
        params: {
          q_track:        songName,
          q_artist:       artistName || '',
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
    } catch (err) {
      console.warn('[Lyrics] Musixmatch error:', err.message);
    }
  }

  // ── 4. No lyrics found ────────────────────────────────────────────────────
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
        romanizedFullText = response.data[0]
          .map(chunk => (chunk && chunk[3]) ? chunk[3] : (chunk && chunk[0] ? chunk[0] : ''))
          .join('');
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

    // MODE 3: Malayalam Pronunciation (Sing in Malayalam Script - മലയാളം ലിപിയിൽ പാടാൻ)
    const romanUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&dt=t&q=${encodeURIComponent(fullText)}`;
    const response = await axios.get(romanUrl, { timeout: 8000 });

    let romanizedFullText = '';
    if (response.data && Array.isArray(response.data[0])) {
      romanizedFullText = response.data[0]
        .map(chunk => (chunk && chunk[3]) ? chunk[3] : (chunk && chunk[0] ? chunk[0] : ''))
        .join('');
    }

    if (!romanizedFullText) romanizedFullText = fullText;

    const resultLines = await Promise.all(
      lines.map(async (origLine, idx) => {
        const textToConvert = (romanizedFullText.split('\n')[idx] || origLine).trim();
        if (!textToConvert) return origLine;

        try {
          // Google InputTools API for Malayalam script transliteration
          const inputToolsUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(textToConvert)}&itc=ml-t-i0-und&num=1`;
          const itRes = await axios.get(inputToolsUrl, { timeout: 4000 });
          
          if (itRes.data && itRes.data[0] === 'SUCCESS' && itRes.data[1] && itRes.data[1][0] && itRes.data[1][0][1]) {
            const mlResult = itRes.data[1][0][1][0];
            if (mlResult && mlResult.trim()) return mlResult.trim();
          }
        } catch (e) { /* ignore */ }

        // Fallback: translate to Malayalam
        try {
          const mlTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ml&dt=t&q=${encodeURIComponent(origLine)}`;
          const mlRes = await axios.get(mlTransUrl, { timeout: 4000 });
          if (mlRes.data && mlRes.data[0] && mlRes.data[0][0] && mlRes.data[0][0][0]) {
            return mlRes.data[0][0][0];
          }
        } catch (e) { /* ignore */ }

        return textToConvert;
      })
    );

    return res.json({ success: true, translatedLines: resultLines, mode, targetLang: 'ml' });

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
