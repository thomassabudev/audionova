const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  // JioSaavn ID or other platform ID / Admin ID
  songId: {
    type: String,
    required: true,
    unique: true,
    default: () => `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  },
  isAdminUploaded: {
    type: Boolean,
    default: false
  },
  filename: String,
  filePath: String,
  fileSize: Number,
  uploadedBy: String,
  name: {
    type: String,
    required: true,
    trim: true
  },
  album: {
    id: String,
    name: String,
    url: String
  },
  year: String,
  releaseDate: String,
  duration: {
    type: Number, // in seconds
    required: true
  },
  label: String,
  primaryArtists: String,
  primaryArtistsId: String,
  featuredArtists: String,
  featuredArtistsId: String,
  explicitContent: {
    type: Boolean,
    default: false
  },
  playCount: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    default: 'Unknown'
  },
  hasLyrics: {
    type: Boolean,
    default: false
  },
  url: String, // Platform URL (Spotify, JioSaavn, etc.)
  copyright: String,
  image: [{
    quality: String,
    link: String
  }],
  downloadUrl: [{
    quality: String,
    link: String
  }],
  // Additional metadata
  genre: [String],
  mood: [String],
  popularity: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Platform-specific data
  platforms: {
    jiosaavn: {
      id: String,
      url: String,
      downloadUrls: [{
        quality: String,
        link: String
      }]
    },
    spotify: {
      id: String,
      url: String,
      previewUrl: String
    },
    youtube: {
      id: String,
      url: String
    }
  },
  // Analytics
  analytics: {
    totalPlays: {
      type: Number,
      default: 0
    },
    uniqueListeners: {
      type: Number,
      default: 0
    },
    lastPlayedAt: Date,
    trending: {
      score: {
        type: Number,
        default: 0
      },
      lastUpdated: Date
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance (removed duplicates)
songSchema.index({ name: 'text', primaryArtists: 'text', 'album.name': 'text' });
songSchema.index({ language: 1 });
songSchema.index({ year: 1 });
songSchema.index({ 'analytics.totalPlays': -1 });
songSchema.index({ 'analytics.trending.score': -1 });
songSchema.index({ createdAt: -1 });

// Virtual for formatted duration
songSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to increment play count
songSchema.methods.incrementPlayCount = function() {
  this.analytics.totalPlays += 1;
  this.analytics.lastPlayedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Song', songSchema);