const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/bookings
router.get('/', (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, c.name as class_name, c.day_of_week, c.time as class_time
      FROM bookings b
      LEFT JOIN classes c ON b.class_id = c.id
      ORDER BY b.booked_at DESC
    `).all();
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/bookings
router.post('/', (req, res) => {
  try {
    const { class_id, client_name, client_email, client_phone } = req.body;

    // Check class exists and has spots
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(class_id);
    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    const { cnt } = db.prepare(
      "SELECT COUNT(*) as cnt FROM bookings WHERE class_id = ? AND status = 'confirmed'"
    ).get(class_id);
    if (cnt >= cls.capacity) {
      return res.status(400).json({ success: false, error: 'Class is full' });
    }

    db.prepare(
      'INSERT INTO bookings (class_id, client_name, client_email, client_phone) VALUES (?, ?, ?, ?)'
    ).run(class_id, client_name, client_email, client_phone || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
