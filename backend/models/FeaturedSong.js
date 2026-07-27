const mongoose = require('mongoose');

const featuredSongSchema = new mongoose.Schema({
  // JioSaavn Song ID
  songId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  primaryArtists: String,
  image: mongoose.Schema.Types.Mixed, // string | string[] | {quality,link}[]
  url: String,
  downloadUrl: mongoose.Schema.Types.Mixed,
  duration: Number,
  album: mongoose.Schema.Types.Mixed,
  language: String,
  year: String,
  // Admin control
  featuredAt: {
    type: Date,
    default: Date.now
  },
  featuredBy: String, // admin uid
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

featuredSongSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('FeaturedSong', featuredSongSchema);
