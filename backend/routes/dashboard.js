const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/dashboard
router.get('/', (req, res) => {
  try {
    const total_classes = db.prepare('SELECT COUNT(*) as cnt FROM classes').get().cnt;
    const total_bookings = db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'confirmed'").get().cnt;
    const total_waivers = db.prepare('SELECT COUNT(*) as cnt FROM waivers').get().cnt;
    const total_purchases = db.prepare('SELECT COUNT(*) as cnt FROM purchases').get().cnt;
    const total_revenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM purchases').get().total;

    // Today's classes (match current day of week: 0=Monday..6=Sunday)
    const jsDay = new Date().getDay(); // 0=Sunday
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Monday
    const todays_classes = db.prepare('SELECT COUNT(*) as cnt FROM classes WHERE day_of_week = ?').get(dayOfWeek).cnt;

    // This week's bookings (last 7 days)
    const this_week_bookings = db.prepare(
      "SELECT COUNT(*) as cnt FROM bookings WHERE status = 'confirmed' AND booked_at >= datetime('now', '-7 days')"
    ).get().cnt;

    res.json({
      success: true,
      data: {
        total_classes,
        total_bookings,
        total_waivers,
        total_purchases,
        total_revenue,
        todays_classes,
        this_week_bookings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
