/**
 * Cover Verification API Routes
 * Handles cover art verification, admin overrides, and user reports
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { fetchCoverForSong } = require('../services/coverVerificationService');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/vibemusic',
});

/**
 * Middleware: Simple admin auth check
 * In production, replace with your actual auth middleware
 */
function requireAdmin(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Admin authorization required',
    });
  }
  
  // In production, decode JWT and attach user info
  req.adminUser = { id: 'admin', email: 'admin@example.com' };
  next;
}

/**
 * POST /api/cover-verification/verify
 * Verify cover art for a song
 * Body: { title, artist, language?, album?, song_id? }
 */
router.post('/verify', async (req, res) => {
  const { title, artist, language, album, song_id } = req.body;
  
  if (!title || !artist) {
    return res.status(400).json({
      success: false,
      error: 'title and artist are required',
    });
  }
  
  const client = await pool.connect();
  
  try {
    // Check if already verified (and not expired)
    if (song_id) {
      const existing = await client.query(
        `SELECT * FROM song_cover_map 
         WHERE song_id = $1 
         AND (manual_override = true OR verified_at > NOW() - INTERVAL '30 days')`,
        [song_id]
      );
      
      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        console.log(`[CoverVerification] Using cached result for ${song_id}`);
        
        return res.json({
          success: true,
          cached: true,
          data: {
            song_id: record.song_id,
            cover_url: record.cover_url,
            source: record.source,
            verified: true,
            manual_override: record.manual_override,
            verified_at: record.verified_at,
          },
        });
      }
    }
    
    // Perform verification
    const queryMeta = { title, artist, language, album };
    const result = await fetchCoverForSong(queryMeta);
    
    // Log verification attempt
    await client.query(
      `INSERT INTO cover_verification_logs 
       (song_id, query_title, query_artist, query_language, query_album, 
        chosen_source, chosen_candidate_id, similarity_scores, verification_time_ms, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        result.song_id,
        title,
        artist,
        language,
        album,
        result.source,
        result.song_id,
        JSON.stringify(result.similarity_scores || {}),
        result.verification_time_ms,
        result.verified,
        result.error || null,
      ]
    );
    
    // If verified, upsert into song_cover_map
    if (result.verified && result.song_id) {
      await client.query(
        `INSERT INTO song_cover_map 
         (song_id, title, artist, language, album, cover_url, source, similarity_scores, metadata, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (song_id) 
         DO UPDATE SET
           cover_url = EXCLUDED.cover_url,
           source = EXCLUDED.source,
           similarity_scores = EXCLUDED.similarity_scores,
           metadata = EXCLUDED.metadata,
           verified_at = NOW()
         WHERE song_cover_map.manual_override = false`,
        [
          result.song_id,
          result.metadata?.title || title,
          result.metadata?.artist || artist,
          result.metadata?.language || language,
          result.metadata?.album || album,
          result.cover_url,
          result.source,
          JSON.stringify(result.similarity_scores || {}),
          JSON.stringify(result.metadata || {}),
        ]
      );
    }
    
    res.json({
      success: true,
      cached: false,
      data: result,
    });
  } catch (error) {
    console.error('[CoverVerification] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/cover-verification/:songId
 * Get cover mapping for a song
 */
router.get('/:songId', async (req, res) => {
  const { songId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM song_cover_map WHERE song_id = $1',
      [songId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cover mapping not found',
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[CoverVerification] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cover mapping',
    });
  }
});

/**
 * POST /api/cover-verification/batch
 * Batch verify multiple songs
 * Body: { songs: [{ title, artist, language?, album?, song_id? }] }
 */
router.post('/batch', async (req, res) => {
  const { songs } = req.body;
  
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'songs array is required',
    });
  }
  
  if (songs.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 50 songs per batch',
    });
  }
  
  const results = [];
  
  for (const song of songs) {
    if (!song.title || !song.artist) {
      results.push({
        input: song,
        success: false,
        error: 'title and artist are required',
      });
      continue;
    }
    
    try {
      // Check cache first
      let cached = null;
      if (song.song_id) {
        const cacheResult = await pool.query(
          `SELECT * FROM song_cover_map 
           WHERE song_id = $1 
           AND (manual_override = true OR verified_at > NOW() - INTERVAL '30 days')`,
          [song.song_id]
        );
        
        if (cacheResult.rows.length > 0) {
          cached = cacheResult.rows[0];
        }
      }
      
      if (cached) {
        results.push({
          input: song,
          success: true,
          cached: true,
          data: {
            song_id: cached.song_id,
            cover_url: cached.cover_url,
            source: cached.source,
            verified: true,
          },
        });
      } else {
        // Verify
        const queryMeta = {
          title: song.title,
          artist: song.artist,
          language: song.language,
          album: song.album,
        };
        
        const result = await fetchCoverForSong(queryMeta);
        
        // Store if verified
        if (result.verified && result.song_id) {
          await pool.query(
            `INSERT INTO song_cover_map 
             (song_id, title, artist, language, album, cover_url, source, similarity_scores, metadata, verified_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (song_id) 
             DO UPDATE SET
               cover_url = EXCLUDED.cover_url,
               source = EXCLUDED.source,
               verified_at = NOW()
             WHERE song_cover_map.manual_override = false`,
            [
              result.song_id,
              result.metadata?.title || song.title,
              result.metadata?.artist || song.artist,
              result.metadata?.language || song.language,
              result.metadata?.album || song.album,
              result.cover_url,
              result.source,
              JSON.stringify(result.similarity_scores || {}),
              JSON.stringify(result.metadata || {}),
            ]
          );
        }
        
        results.push({
          input: song,
          success: true,
          cached: false,
          data: result,
        });
      }
    } catch (error) {
      results.push({
        input: song,
        success: false,
        error: error.message,
      });
    }
  }
  
  res.json({
    success: true,
    results,
    total: songs.length,
    verified: results.filter(r => r.success && r.data?.verified).length,
    cached: results.filter(r => r.cached).length,
  });
});

/**
 * POST /api/cover-verification/admin/override
 * Admin: Manually set cover URL for a song
 * Body: { song_id, cover_url, reason, title?, artist?, language? }
 */
router.post('/admin/override', requireAdmin, async (req, res) => {
  const { song_id, cover_url, reason, title, artist, language, album } = req.body;
  
  if (!song_id || !cover_url || !reason) {
    return res.status(400).json({
      success: false,
      error: 'song_id, cover_url, and reason are required',
    });
  }
  
  try {
    await pool.query(
      `INSERT INTO song_cover_map 
       (song_id, title, artist, language, album, cover_url, source, manual_override, admin_user_id, override_reason, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual', true, $7, $8, NOW())
       ON CONFLICT (song_id)
       DO UPDATE SET
         cover_url = EXCLUDED.cover_url,
         source = 'manual',
         manual_override = true,
         admin_user_id = EXCLUDED.admin_user_id,
         override_reason = EXCLUDED.override_reason,
         verified_at = NOW()`,
      [
        song_id,
        title || 'Manual Override',
        artist || 'Unknown',
        language,
        album,
        cover_url,
        req.adminUser.id,
        reason,
      ]
    );
    
    res.json({
      success: true,
      message: 'Cover override applied',
      song_id,
      cover_url,
    });
  } catch (error) {
    console.error('[CoverVerification] Override error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply override',
    });
  }
});

/**
 * DELETE /api/cover-verification/admin/override/:songId
 * Admin: Remove manual override and allow re-verification
 */
router.delete('/admin/override/:songId', requireAdmin, async (req, res) => {
  const { songId } = req.params;
  
  try {
    const result = await pool.query(
      `UPDATE song_cover_map 
       SET manual_override = false, admin_user_id = NULL, override_reason = NULL
       WHERE song_id = $1 AND manual_override = true
       RETURNING *`,
      [songId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No manual override found for this song',
      });
    }
    
    res.json({
      success: true,
      message: 'Manual override removed, song can be re-verified',
      song_id: songId,
    });
  } catch (error) {
    console.error('[CoverVerification] Error removing override:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove override',
    });
  }
});

/**
 * POST /api/cover-verification/report
 * User: Report wrong cover art
 * Body: { song_id, displayed_cover_url, correct_hint?, user_id? }
 */
router.post('/report', async (req, res) => {
  const { song_id, displayed_cover_url, correct_hint, user_id } = req.body;
  
  if (!song_id || !displayed_cover_url) {
    return res.status(400).json({
      success: false,
      error: 'song_id and displayed_cover_url are required',
    });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO wrong_cover_reports 
       (song_id, displayed_cover_url, correct_hint, user_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [song_id, displayed_cover_url, correct_hint, user_id]
    );
    
    res.json({
      success: true,
      message: 'Report submitted successfully',
      report_id: result.rows[0].id,
    });
  } catch (error) {
    console.error('[CoverVerification] Report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report',
    });
  }
});

/**
 * GET /api/cover-verification/admin/reports
 * Admin: Get all wrong cover reports
 */
router.get('/admin/reports', requireAdmin, async (req, res) => {
  const { status = 'pending', limit = 50 } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT r.*, s.title, s.artist, s.cover_url as current_cover_url
       FROM wrong_cover_reports r
       LEFT JOIN song_cover_map s ON r.song_id = s.song_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [status, parseInt(limit)]
    );
    
    res.json({
      success: true,
      reports: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[CoverVerification] Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
    });
  }
});

/**
 * GET /api/cover-verification/stats
 * Get verification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM cover_verification_stats');
    const totalSongs = await pool.query('SELECT COUNT(*) as total FROM song_cover_map');
    const recentLogs = await pool.query(
      `SELECT 
         COUNT(*) as total_attempts,
         COUNT(*) FILTER (WHERE success = true) as successful,
         AVG(verification_time_ms) as avg_time_ms
       FROM cover_verification_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    
    res.json({
      success: true,
      stats: {
        by_source: stats.rows,
        total_songs: parseInt(totalSongs.rows[0].total),
        last_24h: recentLogs.rows[0],
      },
    });
  } catch (error) {
    console.error('[CoverVerification] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
});

module.exports = router;
