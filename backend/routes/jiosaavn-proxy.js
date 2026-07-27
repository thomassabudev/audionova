const express  = require('express');
const axios    = require('axios');
const CryptoJS = require('crypto-js');
const router   = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:  'application/json, text/plain, */*',
  Referer: 'https://www.jiosaavn.com/',
  Origin:  'https://www.jiosaavn.com',
};

// In-memory response cache (key → { data, ts })
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt JioSaavn encrypted_media_url → real CDN URL.
 * Algorithm: DES-CBC, Key: '38346591', IV: '00000000'
 * (Same as sumitkolhe/jiosaavn-api — the most widely used JioSaavn wrapper)
 */
function decryptMediaUrl(encryptedUrl) {
  try {
    if (!encryptedUrl) return null;
    const key        = CryptoJS.enc.Utf8.parse('38346591');
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedUrl);
    const decrypted  = CryptoJS.DES.decrypt(
      { ciphertext },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result || !result.startsWith('http')) {
      console.warn('[JioSaavn Proxy] Decryption produced non-URL result');
      return null;
    }
    return result.trim();
  } catch (e) {
    console.warn('[JioSaavn Proxy] URL decryption failed:', e.message);
    return null;
  }
}

/**
 * Build proxied download links for all quality levels.
 * The CDN URL is routed through /api/jiosaavn/stream to avoid browser CORS.
 */
function createDownloadLinks(encryptedUrl) {
  const base = decryptMediaUrl(encryptedUrl);
  if (!base) return [];
  const qualities = ['12', '48', '96', '160', '320'];
  return qualities.map((q) => {
    const cdnUrl    = base.replace(/_\d+\.mp4/, `_${q}.mp4`);
    const proxied   = `/api/jiosaavn/stream?url=${encodeURIComponent(cdnUrl)}`;
    return { quality: `${q}kbps`, link: proxied };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upgradeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace('150x150', '500x500').replace('50x50', '500x500');
}

function normalizeSong(raw) {
  if (!raw || raw.type !== 'song') return null;

  const info    = raw.more_info || {};
  const artists = info.artistMap || {};

  const primaryArtists  = (artists.primary_artists  || []).map((a) => a.name).join(', ');
  const featuredArtists = (artists.featured_artists || []).map((a) => a.name).join(', ');

  const baseImage = raw.image || '';
  const imageArr  = [
    { quality: '50x50',   link: baseImage },
    { quality: '150x150', link: baseImage },
    { quality: '500x500', link: upgradeImageUrl(baseImage) },
  ].filter((i) => i.link);

  const downloadUrl = createDownloadLinks(info.encrypted_media_url);

  return {
    id:                raw.id,
    name:              raw.title,
    album: {
      id:  info.album_id  || '',
      name: info.album    || '',
      url:  info.album_url || '',
    },
    year:              raw.year          || '',
    releaseDate:       info.release_date || '',
    duration:          parseInt(info.duration, 10) || 0,
    label:             info.label        || '',
    primaryArtists,
    primaryArtistsId:  (artists.primary_artists  || []).map((a) => a.id).join(','),
    featuredArtists,
    featuredArtistsId: (artists.featured_artists || []).map((a) => a.id).join(','),
    explicitContent:   raw.explicit_content === '1' || raw.explicit_content === 1,
    playCount:         parseInt(raw.play_count, 10) || 0,
    language:          raw.language || '',
    hasLyrics:         info.has_lyrics === 'true' || info.has_lyrics === true,
    url:               raw.perma_url    || '',
    copyright:         info.copyright_text || '',
    image:             imageArr,
    downloadUrl,
  };
}

// ─── JioSaavn API helpers ─────────────────────────────────────────────────────

async function searchJioSaavn(query, limit = 20, page = 1) {
  const cacheKey = `search:${query}:${limit}:${page}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const response = await axios.get(JIOSAAVN_API, {
    params: {
      __call: 'search.getResults',
      _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
      n: limit, p: page, q: query,
    },
    headers: COMMON_HEADERS,
    timeout: 12000,
  });

  const results = (response.data.results || []).map(normalizeSong).filter(Boolean);
  cache.set(cacheKey, { data: results, ts: Date.now() });
  return results;
}

async function getSongById(songId) {
  const cacheKey = `song:${songId}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const response = await axios.get(JIOSAAVN_API, {
    params: {
      __call: 'song.getDetails',
      _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
      pids: songId,
    },
    headers: COMMON_HEADERS,
    timeout: 10000,
  });

  const raw     = response.data;
  const songRaw = raw[songId] || Object.values(raw)[0];
  if (!songRaw) return null;

  const result = normalizeSong(songRaw);
  cache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/jiosaavn/search/songs?query=...&limit=20&page=1
router.get('/search/songs', async (req, res) => {
  const { query, limit = 20, page = 1 } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'query param required' });
  try {
    const results = await searchJioSaavn(query, parseInt(limit, 10), parseInt(page, 10));
    return res.json({ data: { results, total: results.length }, success: true });
  } catch (err) {
    console.error('[JioSaavn Proxy] search/songs error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/jiosaavn/search/albums?query=...
router.get('/search/albums', async (req, res) => {
  const { query, limit = 10 } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'query param required' });
  try {
    const response = await axios.get(JIOSAAVN_API, {
      params: {
        __call: 'search.getAlbumResults',
        _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
        n: parseInt(limit, 10), p: 1, q: query,
      },
      headers: COMMON_HEADERS,
      timeout: 10000,
    });
    return res.json({ data: { results: response.data.results || [] } });
  } catch (err) {
    console.error('[JioSaavn Proxy] search/albums error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/jiosaavn/search/all?query=...
router.get('/search/all', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'query param required' });
  try {
    const songs = await searchJioSaavn(query, 10);
    return res.json({
      data: { songs: { results: songs }, albums: { results: [] }, playlists: { results: [] } },
    });
  } catch (err) {
    console.error('[JioSaavn Proxy] search/all error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/jiosaavn/songs/:id
router.get('/songs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const song = await getSongById(id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });
    return res.json({ data: [song] });
  } catch (err) {
    console.error('[JioSaavn Proxy] songs/:id error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/jiosaavn/albums?id=...
router.get('/albums', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id param required' });
  try {
    const response = await axios.get(JIOSAAVN_API, {
      params: {
        __call: 'content.getAlbumDetails',
        _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
        albumid: id,
      },
      headers: COMMON_HEADERS,
      timeout: 10000,
    });
    return res.json({ data: response.data });
  } catch (err) {
    console.error('[JioSaavn Proxy] albums error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jiosaavn/stream?url=<encoded-cdn-url>
 *
 * Pipes the JioSaavn CDN audio stream through the backend.
 * - Fixes browser CORS on aac.saavncdn.com
 * - Forwards Range headers so seeking works
 */
router.get('/stream', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url param required' });
  }

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
    const parsed = new URL(decodedUrl);
    if (parsed.hostname !== 'saavncdn.com' && !parsed.hostname.endsWith('.saavncdn.com')) {
      return res.status(403).json({ error: 'Only saavncdn.com URLs are allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const upstreamHeaders = {
      'User-Agent': COMMON_HEADERS['User-Agent'],
      Referer:      'https://www.jiosaavn.com/',
      Origin:       'https://www.jiosaavn.com',
    };
    const rangeHeader = req.headers['range'];
    if (rangeHeader) upstreamHeaders['Range'] = rangeHeader;

    const upstream = await axios.get(decodedUrl, {
      headers:      upstreamHeaders,
      responseType: 'stream',
      timeout:      30000,
    });

    res.setHeader('Content-Type',  upstream.headers['content-type']  || 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range'])  res.setHeader('Content-Range',  upstream.headers['content-range']);

    res.status(upstream.status);
    upstream.data.pipe(res);
    upstream.data.on('error', (err) => {
      console.error('[JioSaavn Stream] Pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err) {
    console.error('[JioSaavn Stream] Error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Failed to stream audio' });
  }
});

// ─── Compilation detection ────────────────────────────────────────────────────
const COMPILATION_KEYWORDS = [
  'best of', 'top songs', 'top hits', 'collection', 'greatest hits',
  'hits of', 'playlist', 'mixtape',
];
function isCompilation(title = '') {
  const t = title.toLowerCase();
  return COMPILATION_KEYWORDS.some(kw => t.includes(kw));
}

/**
 * Fetch fresh songs for a language using real album releases (not search).
 *   1. search.getAlbumResults → recent albums for language+year
 *   2. Filter out compilation albums
 *   3. content.getAlbumDetails for each album → individual songs with correct covers
 */
async function getFreshSongsByLanguage(language, maxAlbums = 10) {
  const year = new Date().getFullYear();
  const prevYear = year - 1;

  // Step 1 – find recent albums for this language
  const albumRes = await axios.get(JIOSAAVN_API, {
    params: {
      __call: 'search.getAlbumResults',
      _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
      q: `${language} ${year}`,
      n: 30, p: 1,
    },
    headers: COMMON_HEADERS,
    timeout: 10000,
  });

  const albums = (albumRes.data.results || []).filter(a => {
    if (isCompilation(a.title)) return false;
    const y = parseInt(a.year || '0', 10);
    return y === year || y === prevYear || !a.year; // include undated too
  }).slice(0, maxAlbums);

  if (!albums.length) return [];

  // Step 2 – fetch songs from each album in parallel
  const results = await Promise.allSettled(
    albums.map(album =>
      axios.get(JIOSAAVN_API, {
        params: {
          __call: 'content.getAlbumDetails',
          albumid: album.id,
          _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0',
        },
        headers: COMMON_HEADERS,
        timeout: 8000,
      }).then(r => (r.data.songs || r.data.list || []).map(normalizeSong).filter(Boolean))
    )
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// GET /api/jiosaavn/fresh-songs/:language
// Returns real new songs from actual album releases (correct covers, no compilations)
router.get('/fresh-songs/:language', async (req, res) => {
  const { language } = req.params;
  const { limit = 30 } = req.query;

  const cacheKey = `fresh:${language}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return res.json({ data: cached.data.slice(0, parseInt(limit)), success: true, cached: true });
  }

  try {
    const songs = await getFreshSongsByLanguage(language, 10);
    cache.set(cacheKey, { data: songs, ts: Date.now() });
    return res.json({ data: songs.slice(0, parseInt(limit)), success: true, cached: false });
  } catch (err) {
    console.error('[fresh-songs] Error:', err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
});

// Catch-all
router.use((req, res) => {
  res.status(404).json({ success: false, error: `No proxy handler for ${req.path}` });
});

module.exports = router;
