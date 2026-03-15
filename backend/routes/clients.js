const { Router } = require('express');
const db = require('../db');
const router = Router();

// GET /api/clients — aggregated client list from bookings
router.get('/', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT
        b.client_email as email,
        b.client_name as name,
        b.client_phone as phone,
        COUNT(b.id) as total_bookings,
        CASE WHEN w.id IS NOT NULL THEN 1 ELSE 0 END as waiver_signed
      FROM bookings b
      LEFT JOIN (
        SELECT email, MIN(id) as id FROM waivers GROUP BY email
      ) w ON LOWER(b.client_email) = LOWER(w.email)
      GROUP BY LOWER(b.client_email)
      ORDER BY b.client_name
    `).all();

    // Add sequential IDs
    const data = clients.map((c, i) => ({
      id: i + 1,
      ...c,
      waiver_signed: !!c.waiver_signed
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
