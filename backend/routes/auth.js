const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const router = express.Router();

// @route   POST /auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { email, password, businessName, businessPhone, businessAddress } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (email, password, business_name, business_phone, business_address) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, businessName, businessPhone, businessAddress]
    );

    const userId = result.insertId;

    // Create JWT payload
    const payload = {
      user: {
        id: userId,
        email: email
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          token, 
          user: {
            id: userId,
            email: email,
            businessInfo: {
              name: businessName,
              phone: businessPhone,
              address: businessAddress
            }
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for email:', email);

    // Check if user exists
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('Query result:', users);

    if (users.length === 0) {
      console.log('User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const user = users[0];

    console.log('User found:', user);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    console.log('Password matched');

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        email: user.email
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: {
          id: user.id,
          email: user.email,
          businessInfo: {
            name: user.business_name,
            phone: user.business_phone,
            address: user.business_address,
            logoUrl: user.logo_url
          }
        }});
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /auth/logout
// @desc    Logout user (invalidate token)
router.post('/logout', (req, res) => {
  // In a real app, you might want to implement token blacklisting
  res.status(204).end();
});

// @route   GET /auth/me
// @desc    Get current user
router.get('/me', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

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

module.exports = router;
