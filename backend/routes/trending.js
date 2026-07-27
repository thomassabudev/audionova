const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Pool } = require('pg');

const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.jiosaavn.com/',
  Origin: 'https://www.jiosaavn.com',
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Database connection (optional)
let pool;
try {
  pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic' });
} catch (e) { pool = null; }

// In-memory cache
let trendingCache = { data: null, timestamp: 0 };
const historyStore = {};

// ── Album-based fresh song fetch ─────────────────────────────────────────────
const COMPILATION_KW = ['best of', 'top songs', 'top hits', 'collection', 'greatest hits', 'hits of', 'playlist'];
const isCompAlbum = (title = '') => { const t = title.toLowerCase(); return COMPILATION_KW.some(k => t.includes(k)); };

async function fetchAlbumSongs(albumId) {
  const r = await axios.get(JIOSAAVN_API, {
    params: { __call: 'content.getAlbumDetails', albumid: albumId, _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0' },
    headers: COMMON_HEADERS, timeout: 8000,
  });
  return (r.data.songs || r.data.list || []).map(normalizeSong).filter(Boolean);
}

async function getRecentSongsForLanguage(language, maxAlbums = 8) {
  const year = new Date().getFullYear();
  const albumRes = await axios.get(JIOSAAVN_API, {
    params: { __call: 'search.getAlbumResults', _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0', q: `${language} ${year}`, n: 25, p: 1 },
    headers: COMMON_HEADERS, timeout: 10000,
  });
  const albums = (albumRes.data.results || [])
    .filter(a => !isCompAlbum(a.title))
    .slice(0, maxAlbums);

  if (!albums.length) return [];

  const results = await Promise.allSettled(albums.map(a => fetchAlbumSongs(a.id)));
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

async function searchJioSaavn(query, limit = 50) {
  const response = await axios.get(JIOSAAVN_API, {
    params: { __call: 'search.getResults', _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0', n: limit, p: 1, q: query },
    headers: COMMON_HEADERS,
    timeout: 12000,
  });
  return response.data.results || [];
}

function upgradeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace('150x150', '500x500').replace('50x50', '500x500');
}

function normalizeSong(raw) {
  if (!raw || raw.type !== 'song') return null;
  const info = raw.more_info || {};
  const artists = info.artistMap || {};
  const primaryArtists = (artists.primary_artists || []).map(a => a.name).join(', ');
  const baseImage = raw.image || '';
  const imageArr = [
    { quality: '50x50',   link: baseImage },
    { quality: '150x150', link: baseImage },
    { quality: '500x500', link: upgradeImageUrl(baseImage) },
  ].filter(i => i.link);
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
    image: imageArr,
    downloadUrl: [],
  };
}

/**
 * Compute trend score
 */
function computeTrendScore(song, history = [], config = {}) {
  const weights = config.weights || { w1: 1, w2: 2, w3: 0.5, w4: 0.3, w5: 0.2 };
  const currentYear = 2025;
  const previousYear = 2024;

  // 1. Absolute score
  const playCount = Number(song.playCount) || 0;
  const absoluteScore = Math.log1p(playCount) * weights.w1;

  // 2. Velocity score
  let velocity = 0;
  if (history.length >= 2) {
    const latest = history[history.length - 1].playCount;
    const previous = history[history.length - 2].playCount;

    if (previous > 0) {
      velocity = (latest - previous) / previous;
    } else if (latest > 0) {
      velocity = 1;
    }
  } else if (playCount > 0) {
    velocity = 0.3; // Default for new entries
  }

  velocity = Math.max(-1, Math.min(velocity, 5)); // Cap velocity
  const velocityScore = Math.max(0, velocity) * weights.w2;

  // 3. Engagement score
  const likes = Number(song.likes || song.likedCount || 0);
  const saves = Number(song.saves || 0);
  const engagementScore = Math.log1p(likes + saves) * weights.w3;

  // 4. Recency boost - prioritize 2025, then 2024
  let recencyBoost = 0;
  if (song.releaseDate) {
    const releaseYear = new Date(song.releaseDate).getFullYear();
    if (releaseYear === currentYear) {
      recencyBoost = 2 * weights.w4; // Double boost for 2025
    } else if (releaseYear === previousYear) {
      recencyBoost = 1 * weights.w4; // Normal boost for 2024
    }
  } else if (song.year) {
    const year = Number(song.year);
    if (year === currentYear) {
      recencyBoost = 2 * weights.w4; // Double boost for 2025
    } else if (year === previousYear) {
      recencyBoost = 1 * weights.w4; // Normal boost for 2024
    }
  }

  const totalScore = absoluteScore + velocityScore + engagementScore + recencyBoost;

  return { score: totalScore, velocity };
}

/**
 * Determine badges
 */
function determineBadges(song, score, velocity) {
  const badges = [];
  const thresholds = { hot: 15, rising: 0.5, newDays: 14 };
  const currentYear = 2025;

  if (score >= thresholds.hot) badges.push('HOT');
  if (velocity >= thresholds.rising) badges.push('RISING');

  const now = Date.now();
  if (song.releaseDate) {
    const releaseTime = new Date(song.releaseDate).getTime();
    const daysSinceRelease = (now - releaseTime) / (1000 * 60 * 60 * 24);
    if (daysSinceRelease >= 0 && daysSinceRelease <= thresholds.newDays) {
      badges.push('NEW');
    }
  } else if (song.year && Number(song.year) === currentYear) {
    badges.push('NEW');
  }

  return badges;
}

/**
 * Merge and deduplicate songs by song ID
 */
function mergeAndDedupe(songs) {
  const map = new Map();
  for (const song of songs) {
    const existing = map.get(song.id);
    if (!existing || (Number(song.playCount) || 0) > (Number(existing.playCount) || 0)) {
      map.set(song.id, song);
    }
  }
  return Array.from(map.values());
}

/**
 * Deduplicate by name+artist, keeping non-compilation version when both exist
 */
function dedupePreferOriginal(songs) {
  const map = new Map();
  for (const song of songs) {
    const key = `${song.name.toLowerCase().trim()}|${(song.primaryArtists || '').toLowerCase().trim()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, song);
    } else {
      const existingIsComp = isCompilationAlbum(existing);
      const newIsComp      = isCompilationAlbum(song);
      // Prefer original over compilation; otherwise keep higher playCount
      if (existingIsComp && !newIsComp) {
        map.set(key, song);
      } else if (!existingIsComp && newIsComp) {
        // keep existing
      } else if ((Number(song.playCount) || 0) > (Number(existing.playCount) || 0)) {
        map.set(key, song);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Calculate rank deltas
 */
function calculateDeltas(current, previous) {
  const prevRankMap = new Map();
  previous.forEach((song, index) => {
    prevRankMap.set(song.id, index + 1);
  });

  return current.map((song, index) => {
    const currentRank = index + 1;
    const previousRank = prevRankMap.get(song.id);

    let delta = 0;
    if (previousRank !== undefined) {
      delta = previousRank - currentRank;
    }

    return {
      ...song,
      rank: currentRank,
      delta,
    };
  });
}

/**
 * Keywords that indicate a compilation/playlist album — not a real movie/single cover
 */
const COMPILATION_KEYWORDS = ['best of', 'top songs', 'top hits', 'collection', 'playlist', 'greatest hits', 'hits of'];

function isCompilationAlbum(song) {
  const albumName = (
    song.album?.name || song.album || ''
  ).toLowerCase();
  return COMPILATION_KEYWORDS.some(kw => albumName.includes(kw));
}

/**
 * For compilation-album songs, try fetching individual song details
 * from JioSaavn to get the original release artwork.
 */
async function enrichCompilationImages(songs) {
  const needsFix = songs.filter(isCompilationAlbum);
  if (!needsFix.length) return songs;

  const CONCURRENCY = 8;
  const byId = Object.fromEntries(songs.map(s => [s.id, s]));

  for (let i = 0; i < needsFix.length; i += CONCURRENCY) {
    const batch = needsFix.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(song =>
        axios.get(JIOSAAVN_API, {
          params: { __call: 'song.getDetails', _format: 'json', _marker: 0, api_version: 4, ctx: 'web6dot0', pids: song.id },
          headers: COMMON_HEADERS,
          timeout: 5000,
        }).then(r => {
          const raw = r.data;
          const songRaw = raw[song.id] || Object.values(raw)[0];
          const normalized = normalizeSong(songRaw);
          return { id: song.id, image: normalized?.image, album: normalized?.album };
        })
      )
    );

    results.forEach(result => {
      if (result.status !== 'fulfilled') return;
      const { id, image, album } = result.value;
      if (image && byId[id] && !isCompilationAlbum({ album })) {
        byId[id] = { ...byId[id], image };
      }
    });
  }

  return songs.map(s => byId[s.id] || s);
}

/**
 * Fetch and process trending songs
 */
async function fetchAndProcessTrending() {
  try {
    // Fetch real songs from actual movie/album releases (no compilations)
    const [malSongs, taSongs, hiSongs, enSongs] = await Promise.all([
      getRecentSongsForLanguage('malayalam', 8).catch(() => []),
      getRecentSongsForLanguage('tamil',     8).catch(() => []),
      getRecentSongsForLanguage('hindi',     8).catch(() => []),
      searchJioSaavn('new english songs 2025', 30).then(r => r.map(normalizeSong).filter(Boolean)).catch(() => []),
    ]);

    const combined = [...malSongs, ...taSongs, ...hiSongs, ...enSongs];

    const unique = dedupePreferOriginal(mergeAndDedupe(combined));

    // Fix cover images for songs that came from compilation albums
    const enriched = await enrichCompilationImages(unique);

    // --- Cover Verification (PostgreSQL optional) ---
    const songIds = enriched.map(s => s.id);
    let verifiedIds = new Set();
    if (songIds.length > 0 && pool) {
      try {
        const client = await pool.connect();
        try {
          const res = await client.query(
            'SELECT song_id FROM badges WHERE song_id = ANY($1) AND cover_verified = true',
            [songIds]
          );
          res.rows.forEach(row => verifiedIds.add(row.song_id));
        } finally {
          client.release();
        }
      } catch (err) {
        // PostgreSQL not available — skip cover verification, show all songs
      }
    }

    // Compute scores
    const scored = enriched.map(song => {
      const history = historyStore[song.id] || [];
      const { score, velocity } = computeTrendScore(song, history);
      const badges = determineBadges(song, score, velocity);
      const isVerified = verifiedIds.has(song.id);

      return {
        ...song,
        score,
        velocity,
        badges,
        coverVerified: isVerified, // Add this field
        lastUpdated: Date.now(),
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Calculate deltas
    const previous = trendingCache.data || [];
    const withDeltas = calculateDeltas(scored, previous);

    // Update history
    const now = Date.now();
    withDeltas.forEach(song => {
      if (!historyStore[song.id]) {
        historyStore[song.id] = [];
      }

      historyStore[song.id].push({
        songId: song.id,
        playCount: Number(song.playCount) || 0,
        timestamp: now,
      });

      // Keep only last 100 snapshots
      if (historyStore[song.id].length > 100) {
        historyStore[song.id] = historyStore[song.id].slice(-100);
      }
    });

    // Update cache
    trendingCache = {
      data: withDeltas,
      timestamp: now,
    };

    // Removed verbose logging for cleaner console

    return withDeltas;
  } catch (error) {
    console.error('[Trending] Error:', error);
    throw error;
  }
}

/**
 * GET /api/trending
 * Get trending songs
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, forceRefresh = false, includeUnverified = false } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 50, 100);

    // Check cache
    const cacheAge = Date.now() - trendingCache.timestamp;
    const isCacheValid = cacheAge < CACHE_TTL;

    let data = trendingCache.data;

    if (forceRefresh || !isCacheValid || !data) {
      try {
        data = await fetchAndProcessTrending();
      } catch (err) {
        console.error('[Trending] Refresh failed, using stale data if available');
        data = trendingCache.data;
      }
    }

    if (!data) {
      return res.status(500).json({ success: false, error: 'No trending data available' });
    }

    // Filter by coverVerified unless includeUnverified is true
    let filteredData = data;
    if (includeUnverified !== 'true') {
      filteredData = data.filter(song => song.coverVerified === true);
    }

    res.json({
      success: true,
      data: filteredData.slice(0, maxLimit),
      cached: isCacheValid,
      timestamp: trendingCache.timestamp,
    });
  } catch (error) {
    console.error('[Trending] Error:', error);

    // Return cached data if available
    if (trendingCache.data) {
      const maxLimit = Math.min(parseInt(req.query.limit) || 50, 100);
      return res.json({
        success: true,
        data: trendingCache.data.slice(0, maxLimit),
        cached: true,
        stale: true,
        error: 'Failed to fetch new data, returning cached',
        timestamp: trendingCache.timestamp,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending songs',
    });
  }
});

/**
 * POST /api/trending/refresh
 * Manually trigger refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const trending = await fetchAndProcessTrending();

    res.json({
      success: true,
      message: 'Trending songs refreshed',
      count: trending.length,
      timestamp: trendingCache.timestamp,
    });
  } catch (error) {
    console.error('[Trending] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh trending songs',
    });
  }
});

/**
 * GET /api/cover-checks/:songId
 * Admin endpoint to inspect cover checks
 */
router.get('/cover-checks/:songId', async (req, res) => {
  const { songId } = req.params;
  const client = await pool.connect();
  try {
    const checkRes = await client.query('SELECT * FROM cover_checks WHERE song_id = $1', [songId]);
    const badgeRes = await client.query('SELECT * FROM badges WHERE song_id = $1', [songId]);

    res.json({
      success: true,
      coverCheck: checkRes.rows[0] || null,
      badge: badgeRes.rows[0] || null
    });
  } catch (err) {
    console.error('[CoverCheck] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
