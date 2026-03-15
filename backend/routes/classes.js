const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/classes
router.get('/', (req, res) => {
  try {
    const classes = db.prepare('SELECT * FROM classes ORDER BY day_of_week, time').all();
    // Add spots_remaining (capacity minus confirmed bookings)
    const countBookings = db.prepare(
      "SELECT COUNT(*) as cnt FROM bookings WHERE class_id = ? AND status = 'confirmed'"
    );
    const data = classes.map((c) => {
      const { cnt } = countBookings.get(c.id);
      return { ...c, spots_remaining: c.capacity - cnt };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/classes
router.post('/', (req, res) => {
  try {
    const { name, style, day_of_week, time, duration, capacity, instructor, description, color } = req.body;
    db.prepare(
      'INSERT INTO classes (name, style, day_of_week, time, duration, capacity, instructor, description, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, style, day_of_week, time, duration || 60, capacity || 15, instructor || 'Charlene', description || '', color || '#C4956A');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/classes/:id
router.put('/:id', (req, res) => {
  try {
    const { name, style, day_of_week, time, duration, capacity, instructor, description, color } = req.body;
    const result = db.prepare(
      'UPDATE classes SET name=?, style=?, day_of_week=?, time=?, duration=?, capacity=?, instructor=?, description=?, color=? WHERE id=?'
    ).run(name, style, day_of_week, time, duration, capacity, instructor, description, color, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
