const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs').promises;

// Check if Cloudinary is configured
const CLOUDINARY_CONFIGURED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured successfully for cloud:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('⚠️ Cloudinary credentials missing in backend/.env');
}

// ── Multer Storage Setup ─────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/images');
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const profileImageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const albumImageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * Upload a local file to Cloudinary.
 * @param {string} filePath - Absolute path to local file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - Secure Cloudinary CDN URL
 */
const uploadToCloudinary = async (filePath, folder = 'audionova') => {
  if (!CLOUDINARY_CONFIGURED) {
    throw new Error('Cloudinary not configured');
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
  });

  // Remove temporary local file after successful upload to Cloudinary
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // Ignore deletion errors
  }

  return result.secure_url;
};

module.exports = {
  cloudinary,
  CLOUDINARY_CONFIGURED,
  profileImageUpload,
  albumImageUpload,
  uploadToCloudinary,
};
