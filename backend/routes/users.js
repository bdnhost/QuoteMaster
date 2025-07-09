const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 }
});

// @route   PUT /users/:userId/business-info
// @desc    Update user's business info
router.put('/:userId/business-info', authMiddleware, async (req, res) => {
  const { name, phone, address, logoUrl } = req.body;

  try {
    await db.execute(
      `UPDATE users 
       SET business_name = ?, business_phone = ?, business_address = ?, logo_url = ?
       WHERE id = ?`,
      [name, phone, address, logoUrl, req.user.id]
    );

    const [user] = await db.query(
      'SELECT id, email, business_name, business_phone, business_address, logo_url FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      id: user.id,
      email: user.email,
      businessInfo: {
        name: user.business_name,
        phone: user.business_phone,
        address: user.business_address,
        logoUrl: user.logo_url
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /users/:userId/logo
// @desc    Upload business logo
router.post('/:userId/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const logoUrl = `/uploads/${req.file.filename}`;
    
    await db.execute(
      'UPDATE users SET logo_url = ? WHERE id = ?',
      [logoUrl, req.user.id]
    );

    res.json({ logoUrl });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
