const express = require('express');
const router = express.Router();
const { verifyUser } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/sync/liked-songs
router.get('/liked-songs', verifyUser, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).lean();
    return res.json({ success: true, data: user?.likedSongsData || [] });
  } catch (err) {
    console.error('[Sync] Error fetching liked songs:', err.message);
    return res.status(200).json({ success: false, data: [] });
  }
});

// POST /api/sync/liked-songs
router.post('/liked-songs', verifyUser, async (req, res) => {
  try {
    const { songs } = req.body;
    if (!Array.isArray(songs)) {
      return res.status(400).json({ success: false, error: 'songs must be an array' });
    }
    const email = req.user.email || `${req.user.uid}@firebase.user`;
    const name = req.user.name || req.user.email?.split('@')[0] || 'User';

    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { 
        $set: { likedSongsData: songs },
        $setOnInsert: { 
          email: email, 
          name: name,
          password: 'firebase_auth_user'
        }
      },
      { upsert: true, new: true, runValidators: false }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[Sync] Error pushing liked songs:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

// GET /api/sync/playlists
router.get('/playlists', verifyUser, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).lean();
    return res.json({ success: true, data: user?.savedPlaylists || [] });
  } catch (err) {
    console.error('[Sync] Error fetching playlists:', err.message);
    return res.status(200).json({ success: false, data: [] });
  }
});

// POST /api/sync/playlists
router.post('/playlists', verifyUser, async (req, res) => {
  try {
    const { playlists } = req.body;
    if (!Array.isArray(playlists)) {
      return res.status(400).json({ success: false, error: 'playlists must be an array' });
    }
    const email = req.user.email || `${req.user.uid}@firebase.user`;
    const name = req.user.name || req.user.email?.split('@')[0] || 'User';

    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { 
        $set: { savedPlaylists: playlists },
        $setOnInsert: { 
          email: email, 
          name: name,
          password: 'firebase_auth_user'
        }
      },
      { upsert: true, new: true, runValidators: false }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[Sync] Error pushing playlists:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

// POST /api/sync/profile-picture (Upload user profile picture)
const { profileImageUpload, CLOUDINARY_CONFIGURED, uploadToCloudinary } = require('../config/cloudinary');

router.post('/profile-picture', verifyUser, profileImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    let photoUrl = '';
    if (CLOUDINARY_CONFIGURED) {
      try {
        photoUrl = await uploadToCloudinary(req.file.path, 'audionova/profiles');
      } catch (err) {
        console.warn('[Sync] Cloudinary upload failed, falling back to local:', err.message);
        photoUrl = `/uploads/images/${req.file.filename}`;
      }
    } else {
      photoUrl = `/uploads/images/${req.file.filename}`;
    }

    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { $set: { profilePicture: photoUrl } },
      { upsert: true }
    );

    return res.json({ success: true, profilePicture: photoUrl });
  } catch (err) {
    console.error('[Sync] Profile picture upload error:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
  }
});

module.exports = router;

