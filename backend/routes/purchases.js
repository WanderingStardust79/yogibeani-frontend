const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/purchases
router.get('/', (req, res) => {
  try {
    const purchases = db.prepare('SELECT * FROM purchases ORDER BY purchased_at DESC').all();
    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/purchases
router.post('/', (req, res) => {
  try {
    const { client_name, client_email, package_type, amount } = req.body;
    if (!client_name || !client_email || !package_type) {
      return res.status(400).json({ success: false, error: 'Client name, email, and package type are required' });
    }
    db.prepare(
      'INSERT INTO purchases (client_name, client_email, package_type, amount) VALUES (?, ?, ?, ?)'
    ).run(client_name, client_email, package_type, amount || 0);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
