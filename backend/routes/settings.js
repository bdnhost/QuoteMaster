const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const { validate, sanitizeInput } = require('../middlewares/validation');
const db = require('../config/database');

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// @route   GET /settings
// @desc    Get all system settings (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM system_settings ORDER BY setting_key');
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Parse value based on type
      switch (setting.setting_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = null;
          }
          break;
        default:
          // string - keep as is
          break;
      }
      
      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      };
    });
    
    res.json({ settings: settingsObj });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /settings
// @desc    Update system settings (admin only)
router.put('/', authMiddleware, adminMiddleware, sanitizeInput, validate('systemSettings'), async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const [key, data] of Object.entries(settings)) {
      let value = data.value;
      
      // Convert value to string for storage
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }
      
      await db.execute(`
        UPDATE system_settings 
        SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE setting_key = ?
      `, [value, key]);
    }
    
    // Log activity
    await db.execute(`
      INSERT INTO activity_log (user_id, action, entity_type, details)
      VALUES (?, 'update_settings', 'system_settings', ?)
    `, [req.user.id, JSON.stringify({ updated_keys: Object.keys(settings) })]);
    
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /settings/activity-log
// @desc    Get activity log (admin only)
router.get('/activity-log', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const activities = await db.query(`
      SELECT 
        al.*,
        u.email as user_email,
        u.business_name
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    
    const [{ total }] = await db.query('SELECT COUNT(*) as total FROM activity_log');
    
    res.json({
      activities: activities.map(activity => ({
        ...activity,
        details: activity.details ? JSON.parse(activity.details) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /settings/templates
// @desc    Get quote templates
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT * FROM quote_templates WHERE is_active = TRUE';
    let params = [];
    
    if (req.user.role !== 'admin') {
      query += ' AND (created_by = ? OR created_by IS NULL)';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY is_default DESC, name ASC';
    
    const templates = await db.query(query, params);
    
    res.json({
      templates: templates.map(template => ({
        ...template,
        template_data: JSON.parse(template.template_data)
      }))
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /settings/templates
// @desc    Create quote template
router.post('/templates', authMiddleware, async (req, res) => {
  try {
    const { name, description, templateData, isDefault = false } = req.body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await db.execute('UPDATE quote_templates SET is_default = FALSE');
    }
    
    const [result] = await db.execute(`
      INSERT INTO quote_templates (name, description, template_data, is_default, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [name, description, JSON.stringify(templateData), isDefault, req.user.id]);
    
    const [newTemplate] = await db.query('SELECT * FROM quote_templates WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      ...newTemplate,
      template_data: JSON.parse(newTemplate.template_data)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /settings/users/:userId/role
// @desc    Update user role (admin only)
router.put('/users/:userId/role', authMiddleware, adminMiddleware, sanitizeInput, validate('userRole'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Don't allow changing own role
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    
    // Log activity
    await db.execute(`
      INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
      VALUES (?, 'update_user_role', 'users', ?, ?)
    `, [req.user.id, userId, JSON.stringify({ new_role: role })]);
    
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
