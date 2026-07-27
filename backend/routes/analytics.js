const express = require('express');
const { verifyUser } = require('../middleware/auth');
const { requireZeroTrustAdmin } = require('../middleware/zero-trust-auth');
const mongoService = require('../services/mongoService');

const router = express.Router();

// Fallback in-memory storage for when MongoDB is not available
let fallbackPlayHistory = [];
let playIdCounter = 1;

// NOTE: No sample/fake data. Only real user play data from MongoDB.


/**
 * POST /play/anonymous
 * Record a song play without authentication (for basic analytics)
 */
router.post('/play/anonymous', async (req, res) => {
  try {
    console.log('[Analytics] Received anonymous play tracking request:', {
      songId: req.body.songId,
      songTitle: req.body.songTitle,
      timestamp: new Date().toISOString()
    });

    const { songId, songTitle, artist, duration } = req.body;

    if (!songId) {
      console.log('[Analytics] Missing songId in anonymous request');
      return res.status(400).json({
        success: false,
        error: 'Song ID is required'
      });
    }

    const playRecord = {
      eventType: 'song_play',
      userId: 'anonymous_' + Date.now(),
      sessionId: `session_${Date.now()}`,
      data: {
        songId,
        songTitle: songTitle || 'Unknown',
        artist: artist || 'Unknown',
        duration: duration || 0,
        userEmail: 'anonymous@user.com'
      },
      timestamp: new Date()
    };

    try {
      await mongoService.logEvent(playRecord);
      console.log('[Analytics] Anonymous play recorded in MongoDB');
    } catch (e) {
      fallbackPlayHistory.push({
        id: Date.now(),
        userId: playRecord.userId,
        userEmail: 'anonymous@user.com',
        songId,
        songTitle: songTitle || 'Unknown',
        artist: artist || 'Unknown',
        duration: duration || 0,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      });
    }

    res.json({
      success: true,
      message: 'Anonymous play recorded successfully'
    });
  } catch (error) {
    console.error('Error recording anonymous play:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to record anonymous play'
    });
  }
});

/**
 * POST /test/play
 * Test endpoint to verify analytics system (No auth required)
 */
router.post('/test/play', async (req, res) => {
  try {
    console.log('[Test] Received test play request:', req.body);
    
    // Create a test play record
    const testPlayRecord = {
      id: Date.now(),
      userId: 'test_user_' + Date.now(),
      userEmail: 'test@example.com',
      songId: req.body.songId || 'test_song_123',
      songTitle: req.body.songTitle || 'Test Song',
      artist: req.body.artist || 'Test Artist',
      duration: req.body.duration || 180,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    
    // Add to fallback storage
    fallbackPlayHistory.push(testPlayRecord);
    console.log('[Test] Test play recorded in fallback storage. Total plays:', fallbackPlayHistory.length);
    console.log('[Test] Latest test record:', testPlayRecord);
    
    res.json({
      success: true,
      message: 'Test play recorded successfully',
      totalPlays: fallbackPlayHistory.length,
      record: testPlayRecord
    });
  } catch (error) {
    console.error('[Test] Error recording test play:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /play
 * Record a song play (Authenticated users)
 */
router.post('/play', verifyUser, async (req, res) => {
  try {
    console.log('[Analytics] Received play tracking request:', {
      userId: req.user.uid,
      userEmail: req.user.email,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const { songId, songTitle, artist, duration, position, source, platform, quality } = req.body;

    if (!songId) {
      console.log('[Analytics] Missing songId in request');
      return res.status(400).json({
        success: false,
        error: 'Song ID is required'
      });
    }

    const playRecord = {
      eventType: 'song_play',
      userId: req.user.uid,
      sessionId: req.sessionId || `session_${Date.now()}`,
      data: {
        songId,
        songTitle: songTitle || 'Unknown',
        artist: artist || 'Unknown',
        duration: duration || 0,
        position: position || 0,
        source: source || 'unknown',
        platform: platform || 'jiosaavn',
        quality: quality || 'unknown',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userEmail: req.user.email // Add user email to data for analytics
      },
      timestamp: new Date()
    };

    try {
      // Try MongoDB first
      await mongoService.logEvent(playRecord);
      console.log('[Analytics] Play recorded successfully in MongoDB');

      // Also update song play count if song exists
      try {
        const song = await mongoService.findSongById(songId);
        if (song) {
          await song.incrementPlayCount();
        }
      } catch (songError) {
        console.warn('[Analytics] Could not update song play count:', songError.message);
      }

      res.json({
        success: true,
        message: 'Play recorded successfully'
      });
    } catch (mongoError) {
      console.warn('[Analytics] MongoDB logging failed, using fallback storage:', mongoError.message);
      
      // Fallback to in-memory storage
      const fallbackRecord = {
        id: playIdCounter++,
        userId: req.user.uid,
        userEmail: req.user.email,
        songId,
        songTitle: songTitle || 'Unknown',
        artist: artist || 'Unknown',
        duration: duration || 0,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };

      fallbackPlayHistory.push(fallbackRecord);
      console.log('[Analytics] Play recorded in fallback storage. Total plays:', fallbackPlayHistory.length);
      console.log('[Analytics] Latest play record:', fallbackRecord);

      res.json({
        success: true,
        message: 'Play recorded successfully'
      });
    }
  } catch (error) {
    console.error('Error recording play:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to record play'
    });
  }
});

/**
 * GET /admin/analytics
 * Get analytics data (Admin only)
 */
router.get('/admin/analytics', requireZeroTrustAdmin, async (req, res) => {
  try {
    console.log('[Analytics] Admin analytics request from:', req.user.email);
    let playHistory = [];
    
    try {
      // Try to get data from MongoDB first
      const mongoPlays = await mongoService.getPlayHistory();
      if (mongoPlays && mongoPlays.length > 0) {
        playHistory = mongoPlays;
        console.log('[Analytics] Using MongoDB data:', playHistory.length, 'plays');
      } else {
        // Fallback to in-memory storage
        playHistory = fallbackPlayHistory;
        console.log('[Analytics] Using fallback data:', playHistory.length, 'plays');
        console.log('[Analytics] Fallback data sample:', fallbackPlayHistory.slice(0, 2));
      }
    } catch (mongoError) {
      console.warn('[Analytics] MongoDB query failed, using fallback:', mongoError.message);
      playHistory = fallbackPlayHistory;
      console.log('[Analytics] Fallback data after error:', playHistory.length, 'plays');
    }

    // Calculate analytics
    const totalPlays = playHistory.length;
    const uniqueUsers = new Set(playHistory.map(play => play.userId)).size;
    const uniqueSongs = new Set(playHistory.map(play => play.songId)).size;

    console.log('[Analytics] Calculated stats:', { totalPlays, uniqueUsers, uniqueSongs });

    // Top played songs
    const songPlayCounts = {};
    playHistory.forEach(play => {
      const key = `${play.songId}-${play.songTitle || 'Unknown'}-${play.artist || 'Unknown'}`;
      songPlayCounts[key] = (songPlayCounts[key] || 0) + 1;
    });

    const topSongs = Object.entries(songPlayCounts)
      .map(([key, count]) => {
        const parts = key.split('-');
        const songId = parts[0];
        const songTitle = parts.slice(1, -1).join('-') || 'Unknown';
        const artist = parts[parts.length - 1] || 'Unknown';
        return { songId, songTitle, artist, playCount: count };
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);

    console.log('[Analytics] Top songs:', topSongs);

    // Plays by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPlays = playHistory.filter(play => 
      new Date(play.timestamp) >= thirtyDaysAgo
    );

    const playsByDate = {};
    recentPlays.forEach(play => {
      const date = play.date || new Date(play.timestamp).toISOString().split('T')[0];
      playsByDate[date] = (playsByDate[date] || 0) + 1;
    });

    // Most active users
    const userPlayCounts = {};
    playHistory.forEach(play => {
      const key = `${play.userId}-${play.userEmail || 'Unknown'}`;
      userPlayCounts[key] = (userPlayCounts[key] || 0) + 1;
    });

    const topUsers = Object.entries(userPlayCounts)
      .map(([key, count]) => {
        const parts = key.split('-');
        const userId = parts[0];
        const userEmail = parts.slice(1).join('-') || 'Unknown';
        return { userId, userEmail, playCount: count };
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);

    const analyticsResult = {
      success: true,
      analytics: {
        overview: {
          totalPlays,
          uniqueUsers,
          uniqueSongs,
          totalUsers: uniqueUsers // Assuming all users who played are total users for demo
        },
        topSongs,
        topUsers,
        playsByDate: Object.entries(playsByDate).map(([date, count]) => ({
          date,
          plays: count
        })).sort((a, b) => a.date.localeCompare(b.date))
      }
    };

    console.log('[Analytics] Sending response:', JSON.stringify(analyticsResult, null, 2));
    res.json(analyticsResult);
  } catch (error) {
    console.error('Error fetching analytics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /admin/analytics/test
 * Test endpoint to check analytics data (Admin only)
 */
router.get('/admin/analytics/test', requireZeroTrustAdmin, async (req, res) => {
  try {
    let playHistory = [];
    
    try {
      // Try to get data from MongoDB first
      const mongoPlays = await mongoService.getPlayHistory();
      if (mongoPlays && mongoPlays.length > 0) {
        playHistory = mongoPlays;
      } else {
        playHistory = fallbackPlayHistory;
      }
    } catch (mongoError) {
      console.warn('[Analytics] MongoDB query failed, using fallback:', mongoError.message);
      playHistory = fallbackPlayHistory;
    }

    res.json({
      success: true,
      message: 'Analytics test endpoint working',
      data: {
        totalPlays: playHistory.length,
        playHistory: playHistory.slice(-5), // Last 5 plays
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in analytics test:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get test data'
    });
  }
});

/**
 * GET /admin/analytics/users
 * Get detailed user analytics (Admin only)
 */
router.get('/admin/analytics/users', requireZeroTrustAdmin, async (req, res) => {
  try {
    let playHistory = [];
    
    try {
      // Try to get data from MongoDB first
      const mongoPlays = await mongoService.getPlayHistory();
      if (mongoPlays && mongoPlays.length > 0) {
        playHistory = mongoPlays;
        console.log('[Analytics] Using MongoDB data for user analytics:', playHistory.length, 'plays');
      } else {
        playHistory = fallbackPlayHistory;
        console.log('[Analytics] Using fallback data for user analytics:', playHistory.length, 'plays');
      }
    } catch (mongoError) {
      console.warn('[Analytics] MongoDB query failed, using fallback:', mongoError.message);
      playHistory = fallbackPlayHistory;
    }

    const userStats = {};
    
    playHistory.forEach(play => {
      if (!userStats[play.userId]) {
        userStats[play.userId] = {
          userId: play.userId,
          userEmail: play.userEmail || 'Unknown',
          totalPlays: 0,
          uniqueSongs: new Set(),
          firstPlay: play.timestamp,
          lastPlay: play.timestamp
        };
      }
      
      const user = userStats[play.userId];
      user.totalPlays++;
      user.uniqueSongs.add(play.songId);
      
      if (new Date(play.timestamp) < new Date(user.firstPlay)) {
        user.firstPlay = play.timestamp;
      }
      if (new Date(play.timestamp) > new Date(user.lastPlay)) {
        user.lastPlay = play.timestamp;
      }
    });

    // Convert to array and format
    const users = Object.values(userStats).map(user => ({
      userId: user.userId,
      userEmail: user.userEmail,
      totalPlays: user.totalPlays,
      uniqueSongs: user.uniqueSongs.size,
      firstPlay: user.firstPlay,
      lastPlay: user.lastPlay
    }));

    res.json({
      success: true,
      users: users.sort((a, b) => b.totalPlays - a.totalPlays)
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
});

/**
 * GET /admin/analytics/debug
 * Debug endpoint to check analytics system status (Admin only)
 */
router.get('/admin/analytics/debug', requireZeroTrustAdmin, async (req, res) => {
  try {
    console.log('[Analytics] Debug request from admin:', req.user.email);
    
    let mongoStatus = 'disconnected';
    let mongoPlays = [];
    let mongoError = null;
    
    try {
      const mongoService = require('../services/mongoService');
      const isConnected = await mongoService.checkConnection();
      mongoStatus = isConnected ? 'connected' : 'disconnected';
      
      if (isConnected) {
        mongoPlays = await mongoService.getPlayHistory(10); // Get last 10 plays
      }
    } catch (error) {
      mongoError = error.message;
    }
    
    const debugInfo = {
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        mongodb: {
          status: mongoStatus,
          error: mongoError,
          playsCount: mongoPlays.length,
          samplePlays: mongoPlays.slice(0, 3)
        },
        fallbackStorage: {
          playsCount: fallbackPlayHistory.length,
          samplePlays: fallbackPlayHistory.slice(0, 3)
        },
        system: {
          nodeEnv: process.env.NODE_ENV,
          mongoUri: process.env.MONGODB_URI ? 'configured' : 'not configured'
        }
      }
    };
    
    console.log('[Analytics] Debug info:', JSON.stringify(debugInfo, null, 2));
    res.json(debugInfo);
  } catch (error) {
    console.error('Error in analytics debug:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug info'
    });
  }
});

/**
 * DELETE /admin/analytics/sample-data
 * Clear sample analytics data (Admin only)
 */
router.delete('/admin/analytics/sample-data', requireZeroTrustAdmin, async (req, res) => {
  try {
    console.log('[Analytics] Clearing sample analytics data by admin:', req.user.email);
    
    // Clear fallback storage
    fallbackPlayHistory = [];
    playIdCounter = 1;
    
    console.log('[Analytics] Sample data cleared successfully');
    
    res.json({
      success: true,
      message: 'Sample analytics data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing sample data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear sample data'
    });
  }
});

module.exports = router;