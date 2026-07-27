const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Event tracking
  eventType: {
    type: String,
    required: true,
    enum: [
      'song_play',
      'song_pause',
      'song_skip',
      'song_like',
      'song_unlike',
      'playlist_create',
      'playlist_play',
      'search',
      'user_login',
      'user_register',
      'admin_action'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  sessionId: String,
  // Event data
  data: mongoose.Schema.Types.Mixed,
  // Admin-specific data
  adminData: {
    adminUserId: String,
    action: String,
    targetUserId: String,
    changes: mongoose.Schema.Types.Mixed,
    success: Boolean,
    errorMessage: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We're using our own timestamp field
});

// Indexes for analytics queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ 'data.songId': 1, timestamp: -1 });
analyticsSchema.index({ 'data.playlistId': 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });

// TTL index to automatically delete old analytics data after 1 year
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods for common analytics queries
analyticsSchema.statics.getTopSongs = function(limit = 10, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        eventType: 'song_play',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$data.songId',
        playCount: { $sum: 1 },
        uniqueListeners: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        songId: '$_id',
        playCount: 1,
        uniqueListeners: { $size: '$uniqueListeners' }
      }
    },
    {
      $sort: { playCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

analyticsSchema.statics.getUserActivity = function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema);