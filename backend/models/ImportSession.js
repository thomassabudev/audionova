const mongoose = require('mongoose');

/**
 * ImportSession — stores one YouTube→JioSaavn import job.
 *
 * TTL: auto-deleted 2 hours after createdAt via MongoDB TTL index.
 * Tokens are stored as-is (encrypted at rest via MongoDB Atlas encryption
 * or Railway volume — do not log them).
 */
const importSessionSchema = new mongoose.Schema({
  importId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'done', 'error'],
    default: 'pending',
  },
  progress: {
    processed:     { type: Number, default: 0 },
    total:         { type: Number, default: 0 },
    matchedCount:  { type: Number, default: 0 },
    unmatchedCount:{ type: Number, default: 0 },
  },
  // Full ImportResult stored here on completion — includes matched[]/unmatched[] with confidence scores
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: MongoDB auto-deletes documents 2 hours after createdAt
importSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

module.exports = mongoose.model('ImportSession', importSessionSchema);
