const express = require('express');
const router = express.Router();
const { connectToMongoDB } = require('../config/mongodb');
const mongoose = require('mongoose');
const { verifyUser } = require('../middleware/auth');

// ─── Mongoose schemas (lazy, defined once) ─────────────────────────────────────
let ArtistFollow, PlayHistory;

function getModels() {
  if (!ArtistFollow) {
    const artistFollowSchema = new mongoose.Schema({
      userId: { type: String, required: true, index: true },
      artistId: { type: String, required: true },
      artistName: { type: String, required: true },
      artistImage: { type: String, default: '' },
      followedAt: { type: Date, default: Date.now },
    });
    artistFollowSchema.index({ userId: 1, artistId: 1 }, { unique: true });
    ArtistFollow = mongoose.models.ArtistFollow || mongoose.model('ArtistFollow', artistFollowSchema);
  }

  if (!PlayHistory) {
    const playHistorySchema = new mongoose.Schema({
      userId: { type: String, required: true, index: true },
      songId: { type: String, required: true },
      songName: { type: String, required: true },
      artistName: { type: String, default: '' },
      language: { type: String, default: '' },
      playedAt: { type: Date, default: Date.now },
    });
    PlayHistory = mongoose.models.PlayHistory || mongoose.model('PlayHistory', playHistorySchema);
  }

  return { ArtistFollow, PlayHistory };
}

// ─── In-memory fallback storage ────────────────────────────────────────────────
const fallbackFollows = {}; // { userId: ArtistFollow[] }
const fallbackHistory = {}; // { userId: PlayHistory[] }

// ─── FOLLOW ARTISTS ────────────────────────────────────────────────────────────

/**
 * GET /api/social/follow/artists
 * Returns all artists followed by the authenticated user
 */
router.get('/follow/artists', verifyUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    await connectToMongoDB();
    const { ArtistFollow } = getModels();

    const follows = await ArtistFollow.find({ userId }).sort({ followedAt: -1 });
    return res.json({ success: true, data: follows });
  } catch (err) {
    // Fallback
    const userId = req.user.id || req.user.uid;
    const follows = fallbackFollows[userId] || [];
    return res.json({ success: true, data: follows });
  }
});

/**
 * POST /api/social/follow/artists
 * Body: { artistId, artistName, artistImage, action: 'follow' | 'unfollow' }
 */
router.post('/follow/artists', verifyUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const { artistId, artistName, artistImage, action } = req.body;

    if (!artistId || !artistName || !action) {
      return res.status(400).json({ success: false, error: 'artistId, artistName, and action are required' });
    }

    await connectToMongoDB();
    const { ArtistFollow } = getModels();

    if (action === 'follow') {
      await ArtistFollow.findOneAndUpdate(
        { userId, artistId },
        { userId, artistId, artistName, artistImage: artistImage || '', followedAt: new Date() },
        { upsert: true, new: true }
      );
      return res.json({ success: true, message: `Now following ${artistName}` });
    } else if (action === 'unfollow') {
      await ArtistFollow.deleteOne({ userId, artistId });
      return res.json({ success: true, message: `Unfollowed ${artistName}` });
    } else {
      return res.status(400).json({ success: false, error: 'action must be "follow" or "unfollow"' });
    }
  } catch (err) {
    // Fallback
    const userId = req.user.id || req.user.uid;
    const { artistId, artistName, artistImage, action } = req.body;

    if (!fallbackFollows[userId]) fallbackFollows[userId] = [];

    if (action === 'follow') {
      const exists = fallbackFollows[userId].find(f => f.artistId === artistId);
      if (!exists) {
        fallbackFollows[userId].push({ artistId, artistName, artistImage, followedAt: new Date() });
      }
      return res.json({ success: true, message: `Now following ${artistName}` });
    } else {
      fallbackFollows[userId] = fallbackFollows[userId].filter(f => f.artistId !== artistId);
      return res.json({ success: true, message: `Unfollowed ${artistName}` });
    }
  }
});

// ─── PLAY HISTORY ──────────────────────────────────────────────────────────────

/**
 * GET /api/social/history
 * Returns last 50 songs played by the user
 */
router.get('/history', verifyUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    await connectToMongoDB();
    const { PlayHistory } = getModels();

    const history = await PlayHistory.find({ userId })
      .sort({ playedAt: -1 })
      .limit(50);

    return res.json({ success: true, data: history });
  } catch (err) {
    const userId = req.user.id || req.user.uid;
    const history = (fallbackHistory[userId] || []).slice(0, 50);
    return res.json({ success: true, data: history });
  }
});

/**
 * POST /api/social/history
 * Body: { songId, songName, artistName, language }
 */
router.post('/history', verifyUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const { songId, songName, artistName, language } = req.body;

    if (!songId || !songName) {
      return res.status(400).json({ success: false, error: 'songId and songName are required' });
    }

    await connectToMongoDB();
    const { PlayHistory } = getModels();

    await PlayHistory.create({ userId, songId, songName, artistName: artistName || '', language: language || '', playedAt: new Date() });

    // Keep only last 200 entries per user to avoid unbounded growth
    const count = await PlayHistory.countDocuments({ userId });
    if (count > 200) {
      const oldest = await PlayHistory.find({ userId }).sort({ playedAt: 1 }).limit(count - 200);
      const oldestIds = oldest.map(h => h._id);
      await PlayHistory.deleteMany({ _id: { $in: oldestIds } });
    }

    return res.json({ success: true });
  } catch (err) {
    // Fallback
    const userId = req.user.id || req.user.uid;
    const { songId, songName, artistName, language } = req.body;

    if (!fallbackHistory[userId]) fallbackHistory[userId] = [];
    fallbackHistory[userId].unshift({ songId, songName, artistName, language, playedAt: new Date() });
    if (fallbackHistory[userId].length > 200) fallbackHistory[userId] = fallbackHistory[userId].slice(0, 200);

    return res.json({ success: true });
  }
});

module.exports = router;
