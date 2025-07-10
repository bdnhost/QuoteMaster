const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const db = require('../config/database');

// Admin middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// @route   GET /payments/methods
// @desc    Get all payment methods
router.get('/methods', authMiddleware, async (req, res) => {
  try {
    const methods = await db.query('SELECT * FROM payment_methods WHERE is_active = TRUE ORDER BY name');
    res.json({ methods });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /payments/methods
// @desc    Create payment method (admin only)
router.post('/methods', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    const [result] = await db.execute(
      'INSERT INTO payment_methods (name, type, description) VALUES (?, ?, ?)',
      [name, type, description]
    );
    
    const [newMethod] = await db.query('SELECT * FROM payment_methods WHERE id = ?', [result.insertId]);
    res.status(201).json(newMethod);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /payments/invoices
// @desc    Get invoices for current user (or all for admin)
router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT i.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', ii.id,
                 'description', ii.description,
                 'quantity', ii.quantity,
                 'unitPrice', ii.unit_price,
                 'totalPrice', ii.total_price
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    `;
    
    let params = [];
    
    if (req.user.role !== 'admin') {
      query += ' WHERE i.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' GROUP BY i.id ORDER BY i.created_at DESC';
    
    const invoices = await db.query(query, params);
    
    res.json({
      invoices: invoices.map(invoice => ({
        ...invoice,
        items: JSON.parse(invoice.items || '[]').filter(item => item.id !== null)
      }))
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /payments/invoices
// @desc    Create invoice from quote
router.post('/invoices', authMiddleware, async (req, res) => {
  try {
    const { quoteId, dueDate, notes } = req.body;
    
    // Get quote details
    const [quote] = await db.query(
      'SELECT * FROM quotes WHERE id = ? AND user_id = ?',
      [quoteId, req.user.id]
    );
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    // Generate invoice number
    const invoiceCount = await db.query('SELECT COUNT(*) as count FROM invoices');
    const invoiceNumber = `INV-${String(invoiceCount[0].count + 1).padStart(6, '0')}`;
    
    // Calculate totals
    const quoteItems = await db.query('SELECT * FROM service_items WHERE quote_id = ?', [quoteId]);
    const subtotal = quoteItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = subtotal * (quote.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Create invoice
    const [invoiceResult] = await db.execute(`
      INSERT INTO invoices (
        invoice_number, quote_id, user_id, customer_name, customer_email, 
        customer_phone, customer_address, issue_date, due_date, 
        subtotal, tax_rate, tax_amount, total_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber, quoteId, req.user.id, quote.customer_name, quote.customer_email,
      quote.customer_phone, quote.customer_address, new Date(), dueDate,
      subtotal, quote.tax_rate, taxAmount, totalAmount, notes
    ]);
    
    // Create invoice items
    for (const item of quoteItems) {
      await db.execute(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `, [invoiceResult.insertId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]);
    }
    
    // Get the created invoice
    const [newInvoice] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoiceResult.insertId]);
    res.status(201).json(newInvoice);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /payments/reports/revenue
// @desc    Get revenue reports (admin only)
router.get('/reports/revenue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        DATE(p.payment_date) as date,
        SUM(p.amount) as total_revenue,
        COUNT(p.id) as payment_count
      FROM payments p
      WHERE p.status = 'completed'
    `;
    
    let params = [];
    
    if (startDate && endDate) {
      query += ' AND p.payment_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' GROUP BY DATE(p.payment_date) ORDER BY date DESC';
    
    const revenueData = await db.query(query, params);
    
    // Get summary statistics
    const [summary] = await db.query(`
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as total_payments,
        AVG(amount) as avg_payment
      FROM payments 
      WHERE status = 'completed'
      ${startDate && endDate ? 'AND payment_date BETWEEN ? AND ?' : ''}
    `, params);
    
    res.json({
      revenueData,
      summary: summary || { total_revenue: 0, total_payments: 0, avg_payment: 0 }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
