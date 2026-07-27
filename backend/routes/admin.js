const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireZeroTrustAdmin } = require('../middleware/zero-trust-auth');
const { admin } = require('../config/firebase-admin');
const Song = require('../models/Song');
const User = require('../models/User');
const FeaturedSong = require('../models/FeaturedSong');
const CoAdmin = require('../models/CoAdmin');
const jwt = require('jsonwebtoken');

const router = express.Router();

const { CLOUDINARY_CONFIGURED, uploadToCloudinary } = require('../config/cloudinary');

// ─── Multer for file uploads (Song + Cover image) ───────────────────────────
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const isImage = file.fieldname === 'cover';
    const uploadDir = path.join(__dirname, isImage ? '../uploads/images' : '../uploads/songs');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'song' && (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|m4a|flac|ogg)$/i))) {
      cb(null, true);
    } else if (file.fieldname === 'cover' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for field ${file.fieldname}`));
    }
  }
});

// ═══════════════════════════════════════════════════════
// 🎵 SONG MANAGEMENT (MongoDB persistent)
// ═══════════════════════════════════════════════════════

/**
 * POST /admin/songs/upload — Upload a new song with optional cover art (Admin only, stored in MongoDB)
 */
router.post('/songs/upload', requireZeroTrustAdmin, upload.fields([{ name: 'song', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const songFile = req.files?.song?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!songFile) {
      return res.status(400).json({ success: false, error: 'No song file uploaded' });
    }

    const { title, artist, album, genre, duration } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ success: false, error: 'Title and artist are required' });
    }

    const songId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fileUrl = `/uploads/songs/${songFile.filename}`;

    let imageUrl = null;
    if (coverFile) {
      if (CLOUDINARY_CONFIGURED) {
        try {
          imageUrl = await uploadToCloudinary(coverFile.path, 'audionova/covers');
        } catch (e) {
          console.warn('Cloudinary cover upload failed, falling back to local:', e.message);
          imageUrl = `/uploads/images/${coverFile.filename}`;
        }
      } else {
        imageUrl = `/uploads/images/${coverFile.filename}`;
      }
    }

    const newSong = await Song.create({
      songId,
      name: title,
      primaryArtists: artist,
      album: { name: album || 'Single' },
      genre: genre ? [genre] : ['Pop'],
      duration: parseInt(duration, 10) || 180,
      url: fileUrl,
      image: imageUrl ? [{ quality: '500x500', link: imageUrl }] : [],
      filename: songFile.filename,
      filePath: songFile.path,
      fileSize: songFile.size,
      uploadedBy: req.user.uid,
      isAdminUploaded: true
    });

    res.status(201).json({
      success: true,
      message: 'Song uploaded successfully',
      song: {
        id: newSong._id,
        songId: newSong.songId,
        title: newSong.name,
        artist: newSong.primaryArtists,
        album: newSong.album?.name,
        genre: newSong.genre[0],
        duration: newSong.duration,
        url: newSong.url,
        image: imageUrl,
        uploadedAt: newSong.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading song:', error.message);
    res.status(500).json({ success: false, error: 'Failed to upload song' });
  }
});

/**
 * GET /admin/songs — Get all admin-uploaded songs from MongoDB
 */
router.get('/songs', requireZeroTrustAdmin, async (req, res) => {
  try {
    const mongoSongs = await Song.find({ isAdminUploaded: true }).sort({ createdAt: -1 });

    const formattedSongs = mongoSongs.map(song => ({
      id: song._id,
      songId: song.songId,
      title: song.name,
      artist: song.primaryArtists,
      album: song.album?.name || 'Single',
      genre: song.genre?.[0] || 'Unknown',
      duration: song.duration,
      url: song.url,
      uploadedBy: song.uploadedBy,
      uploadedAt: song.createdAt
    }));

    res.json({ success: true, songs: formattedSongs, total: formattedSongs.length });
  } catch (error) {
    console.error('Error fetching songs:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch songs' });
  }
});

/**
 * PUT /admin/songs/:id — Update song metadata in MongoDB
 */
router.put('/songs/:id', requireZeroTrustAdmin, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

    const { title, artist, album, genre, duration } = req.body;
    if (title) song.name = title;
    if (artist) song.primaryArtists = artist;
    if (album) song.album = { ...song.album, name: album };
    if (genre) song.genre = [genre];
    if (duration) song.duration = parseInt(duration, 10);
    await song.save();

    res.json({
      success: true,
      message: 'Song updated successfully',
      song: { id: song._id, title: song.name, artist: song.primaryArtists, album: song.album?.name, genre: song.genre?.[0], duration: song.duration, updatedAt: song.updatedAt }
    });
  } catch (error) {
    console.error('Error updating song:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update song' });
  }
});

/**
 * DELETE /admin/songs/:id — Delete a song from MongoDB
 */
router.delete('/songs/:id', requireZeroTrustAdmin, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

    if (song.filePath) {
      try { await fs.unlink(song.filePath); } catch (e) { /* ignore file errors */ }
    }

    await Song.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete song' });
  }
});

// ═══════════════════════════════════════════════════════
// 👥 USER MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * GET /admin/users — List all users from MongoDB + Firebase
 */
router.get('/users', requireZeroTrustAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(200);

    const formattedUsers = users.map(u => ({
      id: u._id,
      firebaseUid: u.firebaseUid,
      email: u.email,
      name: u.name,
      profilePicture: u.profilePicture || null,
      isBlocked: u.isBlocked || false,
      isActive: u.isActive,
      blockedAt: u.blockedAt,
      blockedReason: u.blockedReason,
      createdAt: u.createdAt,
      likedSongsCount: u.likedSongsData?.length || u.likedSongs?.length || 0
    }));

    res.json({ success: true, users: formattedUsers, total: formattedUsers.length });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * POST /admin/users/:uid/block — Block a user
 */
router.post('/users/:uid/block', requireZeroTrustAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const targetUid = req.params.uid;

    // Prevent admin from blocking themselves
    if (targetUid === req.user.uid) {
      return res.status(400).json({ success: false, error: 'Cannot block yourself' });
    }

    const user = await User.findOne({ firebaseUid: targetUid }) || await User.findById(targetUid);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = reason || 'Blocked by admin';
    await user.save();

    // Optionally disable in Firebase
    if (user.firebaseUid) {
      try { await admin.auth().updateUser(user.firebaseUid, { disabled: true }); } catch (e) { /* Firebase optional */ }
    }

    res.json({ success: true, message: `User ${user.email} has been blocked` });
  } catch (error) {
    console.error('Error blocking user:', error.message);
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
});

/**
 * POST /admin/users/:uid/unblock — Unblock a user
 */
router.post('/users/:uid/unblock', requireZeroTrustAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.uid }) || await User.findById(req.params.uid);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.isBlocked = false;
    user.blockedAt = undefined;
    user.blockedReason = undefined;
    await user.save();

    if (user.firebaseUid) {
      try { await admin.auth().updateUser(user.firebaseUid, { disabled: false }); } catch (e) { /* Firebase optional */ }
    }

    res.json({ success: true, message: `User ${user.email} has been unblocked` });
  } catch (error) {
    console.error('Error unblocking user:', error.message);
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
});

// ═══════════════════════════════════════════════════════
// ⭐ FEATURED SONGS (Home page showcase)
// ═══════════════════════════════════════════════════════

/**
 * GET /admin/featured-songs — Get all featured songs (admin view)
 */
router.get('/featured-songs', requireZeroTrustAdmin, async (req, res) => {
  try {
    const featured = await FeaturedSong.find({}).sort({ order: 1, featuredAt: -1 });
    res.json({ success: true, songs: featured });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch featured songs' });
  }
});

/**
 * POST /admin/featured-songs — Add a song to featured list
 */
router.post('/featured-songs', requireZeroTrustAdmin, async (req, res) => {
  try {
    const { songId, name, primaryArtists, image, url, downloadUrl, duration, album, language, year } = req.body;

    if (!songId || !name) {
      return res.status(400).json({ success: false, error: 'songId and name are required' });
    }

    // Remove existing featured song with same songId
    await FeaturedSong.deleteOne({ songId });

    const count = await FeaturedSong.countDocuments({ isActive: true });

    const featured = await FeaturedSong.create({
      songId, name, primaryArtists, image, url, downloadUrl, duration, album, language, year,
      featuredBy: req.user.uid,
      order: count
    });

    res.status(201).json({ success: true, message: 'Song featured successfully', song: featured });
  } catch (error) {
    console.error('Error adding featured song:', error.message);
    res.status(500).json({ success: false, error: 'Failed to feature song' });
  }
});

/**
 * DELETE /admin/featured-songs/:id — Remove a song from featured list
 */
router.delete('/featured-songs/:id', requireZeroTrustAdmin, async (req, res) => {
  try {
    await FeaturedSong.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Song removed from featured list' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove featured song' });
  }
});

/**
 * GET /admin/featured-songs/public — Public endpoint for home page (no auth needed)
 */
router.get('/featured-songs/public', async (req, res) => {
  try {
    const featured = await FeaturedSong.find({ isActive: true }).sort({ order: 1, featuredAt: -1 }).limit(10);
    res.json({ success: true, songs: featured });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch featured songs' });
  }
});

// ═══════════════════════════════════════════════════════
// 🔑 CO-ADMIN PORTAL MANAGEMENT & AUTHENTICATION
// ═══════════════════════════════════════════════════════

/**
 * POST /admin/coadmin/login — Public Co-Admin Portal Login
 */
router.post('/coadmin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const coAdmin = await CoAdmin.findOne({ username: username.toLowerCase().trim() });
    if (!coAdmin) {
      return res.status(401).json({ success: false, error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });
    }

    if (!coAdmin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'This Co-Admin account access has been REVOKED by Super Admin.',
        code: 'ACCOUNT_REVOKED'
      });
    }

    const isMatch = await coAdmin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Generate JWT for Co-Admin
    const token = jwt.sign(
      {
        coAdminId: coAdmin._id,
        username: coAdmin.username,
        name: coAdmin.name,
        isCoAdmin: true,
        role: 'co_admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      coAdmin: {
        id: coAdmin._id,
        username: coAdmin.username,
        name: coAdmin.name,
        role: 'co_admin',
        permissions: coAdmin.permissions
      }
    });
  } catch (error) {
    console.error('Co-Admin login error:', error.message);
    res.status(500).json({ success: false, error: 'Co-Admin login failed' });
  }
});

/**
 * POST /admin/coadmin/create — Create new Co-Admin account (Super Admin only)
 */
router.post('/coadmin/create', requireZeroTrustAdmin, async (req, res) => {
  try {
    if (req.user.isCoAdmin) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can create Co-Admin accounts' });
    }

    const { username, password, name, permissions } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, error: 'Username, password and name are required' });
    }

    const existing = await CoAdmin.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    const newCoAdmin = await CoAdmin.create({
      username: username.toLowerCase().trim(),
      password,
      name: name.trim(),
      permissions: permissions || ['songs', 'featured', 'users'],
      createdBy: req.user?.email || req.user?.uid || 'super_admin'
    });

    res.status(201).json({
      success: true,
      message: `Co-Admin account ${newCoAdmin.username} created successfully`,
      coAdmin: newCoAdmin
    });
  } catch (error) {
    console.error('Error creating Co-Admin detailed error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create Co-Admin account' });
  }
});

/**
 * GET /admin/coadmin/list — Get all Co-Admin accounts (Super Admin only)
 */
router.get('/coadmin/list', requireZeroTrustAdmin, async (req, res) => {
  try {
    if (req.user.isCoAdmin) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can view Co-Admin accounts' });
    }

    const coAdmins = await CoAdmin.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, coAdmins });
  } catch (error) {
    console.error('Error fetching Co-Admins:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch Co-Admins' });
  }
});

/**
 * DELETE /admin/coadmin/:id — Revoke/Delete a Co-Admin account (Super Admin only)
 */
router.delete('/coadmin/:id', requireZeroTrustAdmin, async (req, res) => {
  try {
    if (req.user.isCoAdmin) {
      return res.status(403).json({ success: false, error: 'Only Super Admin can revoke Co-Admin accounts' });
    }

    await CoAdmin.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Co-Admin account revoked successfully' });
  } catch (error) {
    console.error('Error deleting Co-Admin:', error.message);
    res.status(500).json({ success: false, error: 'Failed to revoke Co-Admin account' });
  }
});

module.exports = router;