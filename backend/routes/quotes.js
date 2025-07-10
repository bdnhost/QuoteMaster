const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

// @route   GET /quotes
// @desc    Get all quotes for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const quotes = await db.query(
      `SELECT q.*,
       COALESCE(JSON_OBJECT(
         'name', COALESCE(q.customer_name, ''),
         'email', COALESCE(q.customer_email, ''),
         'phone', COALESCE(q.customer_phone, ''),
         'address', COALESCE(q.customer_address, '')
       ), '{}') as customer,
       COALESCE((SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', i.id,
           'description', COALESCE(i.description, ''),
           'quantity', COALESCE(i.quantity, 0),
           'unitPrice', COALESCE(i.unit_price, 0)
         )
       ) FROM service_items i WHERE i.quote_id = q.id), '[]') as items
       FROM quotes q
       WHERE q.user_id = ?
       ORDER BY q.created_at DESC`,
      [req.user.id]
    );

    res.json({
      quotes: quotes.map(q => ({
        ...q,
        customer: typeof q.customer === 'string' ? JSON.parse(q.customer) : q.customer,
        items: typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || [])
      })),
      total: quotes.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /quotes/:quoteId
// @desc    Get single quote
router.get('/:quoteId', authMiddleware, async (req, res) => {
  try {
    const [quote] = await db.query(
      `SELECT q.*,
       COALESCE(JSON_OBJECT(
         'name', COALESCE(q.customer_name, ''),
         'email', COALESCE(q.customer_email, ''),
         'phone', COALESCE(q.customer_phone, ''),
         'address', COALESCE(q.customer_address, '')
       ), '{}') as customer,
       COALESCE((SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', i.id,
           'description', COALESCE(i.description, ''),
           'quantity', COALESCE(i.quantity, 0),
           'unitPrice', COALESCE(i.unit_price, 0)
         )
       ) FROM service_items i WHERE i.quote_id = q.id), '[]') as items
       FROM quotes q
       WHERE q.id = ? AND q.user_id = ?`,
      [req.params.quoteId, req.user.id]
    );

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({
      ...quote,
      customer: typeof quote.customer === 'string' ? JSON.parse(quote.customer) : quote.customer,
      items: typeof quote.items === 'string' ? JSON.parse(quote.items) : (quote.items || [])
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /quotes
// @desc    Create new quote
router.post('/', authMiddleware, async (req, res) => {
  const { customer, items, notes, validUntil, taxRate } = req.body;

  try {
    // Get user's business info
    const [user] = await db.query(
      'SELECT business_name, business_phone, business_address FROM users WHERE id = ?',
      [req.user.id]
    );

    // Generate quote number
    const year = new Date().getFullYear();
    const [lastQuote] = await db.query(
      'SELECT quote_number FROM quotes WHERE user_id = ? AND quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1',
      [req.user.id, `${year}-%`]
    );

    let nextNum = 1;
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quote_number.split('-')[1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const quoteNumber = `${year}-${nextNum.toString().padStart(3, '0')}`;

    // Create quote
    const [result] = await db.execute(
      `INSERT INTO quotes 
       (user_id, quote_number, business_name, business_phone, business_address,
        customer_name, customer_email, customer_phone, customer_address,
        notes, issue_date, valid_until, tax_rate, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, 'draft')`,
      [
        req.user.id,
        quoteNumber,
        user.business_name,
        user.business_phone,
        user.business_address,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        notes,
        validUntil,
        taxRate || 17
      ]
    );

    const quoteId = result.insertId;

    // Add service items
    if (items && items.length > 0) {
      for (const item of items) {
        await db.execute(
          `INSERT INTO service_items
           (quote_id, description, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [quoteId, item.description, item.quantity, item.unitPrice]
        );
      }
    }

    // Get full quote with items
    const [newQuote] = await db.query(
      `SELECT q.*,
       COALESCE(JSON_OBJECT(
         'name', COALESCE(q.customer_name, ''),
         'email', COALESCE(q.customer_email, ''),
         'phone', COALESCE(q.customer_phone, ''),
         'address', COALESCE(q.customer_address, '')
       ), '{}') as customer,
       COALESCE((SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', i.id,
           'description', COALESCE(i.description, ''),
           'quantity', COALESCE(i.quantity, 0),
           'unitPrice', COALESCE(i.unit_price, 0)
         )
       ) FROM service_items i WHERE i.quote_id = q.id), '[]') as items
       FROM quotes q
       WHERE q.id = ?`,
      [quoteId]
    );

    res.status(201).json({
      ...newQuote,
      customer: typeof newQuote.customer === 'string' ? JSON.parse(newQuote.customer) : newQuote.customer,
      items: typeof newQuote.items === 'string' ? JSON.parse(newQuote.items) : (newQuote.items || [])
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /quotes/:quoteId
// @desc    Update quote
router.put('/:quoteId', authMiddleware, async (req, res) => {
  const { customer, items, notes, validUntil, taxRate, status } = req.body;

  try {
    // Update quote
    await db.execute(
      `UPDATE quotes SET
        customer_name = ?,
        customer_email = ?,
        customer_phone = ?,
        customer_address = ?,
        notes = ?,
        valid_until = ?,
        tax_rate = ?,
        status = ?
       WHERE id = ? AND user_id = ?`,
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        notes,
        validUntil,
        taxRate,
        status,
        req.params.quoteId,
        req.user.id
      ]
    );

    // Delete existing items
    await db.execute(
      'DELETE FROM service_items WHERE quote_id = ?',
      [req.params.quoteId]
    );

    // Add updated items
    if (items && items.length > 0) {
      for (const item of items) {
        await db.execute(
          `INSERT INTO service_items
           (quote_id, description, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [req.params.quoteId, item.description, item.quantity, item.unitPrice]
        );
      }
    }

    // Get full updated quote
    const [updatedQuote] = await db.query(
      `SELECT q.*,
       COALESCE(JSON_OBJECT(
         'name', COALESCE(q.customer_name, ''),
         'email', COALESCE(q.customer_email, ''),
         'phone', COALESCE(q.customer_phone, ''),
         'address', COALESCE(q.customer_address, '')
       ), '{}') as customer,
       COALESCE((SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', i.id,
           'description', COALESCE(i.description, ''),
           'quantity', COALESCE(i.quantity, 0),
           'unitPrice', COALESCE(i.unit_price, 0)
         )
       ) FROM service_items i WHERE i.quote_id = q.id), '[]') as items
       FROM quotes q
       WHERE q.id = ?`,
      [req.params.quoteId]
    );

    res.json({
      ...updatedQuote,
      customer: typeof updatedQuote.customer === 'string' ? JSON.parse(updatedQuote.customer) : updatedQuote.customer,
      items: typeof updatedQuote.items === 'string' ? JSON.parse(updatedQuote.items) : (updatedQuote.items || [])
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /quotes/new 
// @desc    Create new quote template
router.post('/new', authMiddleware, async (req, res) => {
  try {
    // Get user's business info
    const [user] = await db.query(
      'SELECT business_name, business_phone, business_address FROM users WHERE id = ?',
      [req.user.id]
    );

    // Generate quote number
    const year = new Date().getFullYear();
    const [lastQuote] = await db.query(
      'SELECT quote_number FROM quotes WHERE user_id = ? AND quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1',
      [req.user.id, `${year}-%`]
    );

    let nextNum = 1;
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quote_number.split('-')[1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const quoteNumber = `${year}-${nextNum.toString().padStart(3, '0')}`;

    const date = new Date();
    const issueDate = date.toISOString().split('T')[0];
    date.setDate(date.getDate() + 30);
    const validUntil = date.toISOString().split('T')[0];

    const newQuote = {
      quoteNumber,
      businessInfo: {
        name: user.business_name,
        phone: user.business_phone,
        address: user.business_address
      },
      customer: {
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      items: [],
      notes: 'המחיר כולל עבודה וחומרים.\nתנאי תשלום: 50% מקדמה, 50% בסיום העבודה.',
      issueDate,
      validUntil,
      taxRate: 17,
      status: 'draft'
    };

    res.status(200).json(newQuote);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /quotes/:quoteId/pdf
// @desc    Generate PDF for quote
router.get('/:quoteId/pdf', authMiddleware, async (req, res) => {
  try {
    const [quote] = await db.query(
      `SELECT q.*,
       COALESCE(JSON_OBJECT(
         'name', COALESCE(q.customer_name, ''),
         'email', COALESCE(q.customer_email, ''),
         'phone', COALESCE(q.customer_phone, ''),
         'address', COALESCE(q.customer_address, '')
       ), '{}') as customer,
       COALESCE((SELECT JSON_ARRAYAGG(
         JSON_OBJECT(
           'id', i.id,
           'description', COALESCE(i.description, ''),
           'quantity', COALESCE(i.quantity, 0),
           'unitPrice', COALESCE(i.unit_price, 0)
         )
       ) FROM service_items i WHERE i.quote_id = q.id), '[]') as items
       FROM quotes q
       WHERE q.id = ? AND q.user_id = ?`,
      [req.params.quoteId, req.user.id]
    );

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quoteData = {
      ...quote,
      customer: typeof quote.customer === 'string' ? JSON.parse(quote.customer) : quote.customer,
      items: typeof quote.items === 'string' ? JSON.parse(quote.items) : (quote.items || [])
    };

    const { generateQuotePDF } = require('../services/pdfService');
    const pdfBuffer = await generateQuotePDF(quoteData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quote-${quote.quote_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
