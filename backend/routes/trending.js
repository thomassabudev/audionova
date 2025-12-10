const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Pool } = require('pg');

const API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

// In-memory cache
let trendingCache = {
  data: null,
  timestamp: 0,
};

// In-memory history store (in production, use Redis or database)
const historyStore = {};

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
 * Merge and deduplicate songs
 */
function mergeAndDedupe(songs) {
  const map = new Map();

  for (const song of songs) {
    const existing = map.get(song.id);

    if (!existing) {
      map.set(song.id, song);
    } else {
      const existingPlayCount = Number(existing.playCount) || 0;
      const newPlayCount = Number(song.playCount) || 0;

      if (newPlayCount > existingPlayCount) {
        map.set(song.id, song);
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
 * Fetch and process trending songs
 */
async function fetchAndProcessTrending() {
  try {
    console.log('[Trending] Fetching from APIs...');

    const currentYear = 2025;
    const previousYear = 2024;

    // Fetch from all language endpoints with updated queries
    const [malResponse, taResponse, hiResponse, enResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'malayalam latest songs 2025', limit: 50 } }).catch(() => ({ data: { data: { results: [] } } })),
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'tamil latest songs 2025', limit: 50 } }).catch(() => ({ data: { data: { results: [] } } })),
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'hindi latest songs 2025', limit: 50 } }).catch(() => ({ data: { data: { results: [] } } })),
      axios.get(`${API_BASE_URL}/search/songs`, { params: { query: 'english latest songs 2025', limit: 50 } }).catch(() => ({ data: { data: { results: [] } } })),
    ]);

    const mal = malResponse.data.data.results || [];
    const ta = taResponse.data.data.results || [];
    const hi = hiResponse.data.data.results || [];
    const en = enResponse.data.data.results || [];

    console.log('[Trending] Fetched:', { mal: mal.length, ta: ta.length, hi: hi.length, en: en.length });

    // Combine and filter by year (2024-2025 only)
    const combined = [...mal, ...ta, ...hi, ...en].filter(song => {
      if (song.year) {
        const year = parseInt(song.year);
        return year === currentYear || year === previousYear;
      } else if (song.releaseDate) {
        const releaseYear = new Date(song.releaseDate).getFullYear();
        return releaseYear === currentYear || releaseYear === previousYear;
      }
      return false; // Exclude songs without year info
    });

    const unique = mergeAndDedupe(combined);

    console.log('[Trending] Unique songs:', unique.length);

    // --- NEW: Filter by Cover Verification ---
    // Get all song IDs
    const songIds = unique.map(s => s.id);

    // Query badges table
    let verifiedIds = new Set();
    if (songIds.length > 0) {
      const client = await pool.connect();
      try {
        const res = await client.query(
          'SELECT song_id FROM badges WHERE song_id = ANY($1) AND cover_verified = true',
          [songIds]
        );
        res.rows.forEach(row => verifiedIds.add(row.song_id));
      } catch (err) {
        console.error('[Trending] Error querying badges:', err);
        // Fallback: if DB fails, keep verifiedIds empty -> result empty (conservative)
      } finally {
        client.release();
      }
    }

    // Compute scores
    const scored = unique.map(song => {
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

    console.log('[Trending] Processed:', withDeltas.length, 'songs');

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
