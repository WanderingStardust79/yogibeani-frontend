const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/waivers
router.get('/', (req, res) => {
  try {
    const waivers = db.prepare('SELECT * FROM waivers ORDER BY signed_at DESC').all();
    res.json({ success: true, data: waivers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/waivers/check?email=...
router.get('/check', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const waiver = db.prepare('SELECT id FROM waivers WHERE email = ? LIMIT 1').get(email);
    res.json({ success: true, has_waiver: !!waiver });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/waivers
router.post('/', (req, res) => {
  try {
    const { full_name, email, phone, emergency_contact_name, emergency_contact_phone, medical_conditions, signature_data } = req.body;
    if (!full_name || !email || !signature_data) {
      return res.status(400).json({ success: false, error: 'Name, email, and signature are required' });
    }
    db.prepare(
      'INSERT INTO waivers (full_name, email, phone, emergency_contact_name, emergency_contact_phone, medical_conditions, signature_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(full_name, email, phone || '', emergency_contact_name || '', emergency_contact_phone || '', medical_conditions || '', signature_data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
