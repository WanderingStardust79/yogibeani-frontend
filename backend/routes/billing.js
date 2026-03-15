const { Router } = require('express');
const db = require('../db');
const router = Router();

function getStripe() {
  const secretKey = db.prepare("SELECT value FROM settings WHERE key = 'stripe_secret_key'").get();
  if (!secretKey || !secretKey.value) return null;
  return require('stripe')(secretKey.value);
}

// POST /api/billing-portal — create a Stripe Customer Portal session
router.post('/', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ success: false, error: 'Stripe is not configured.' });
    }

    const { client_email } = req.body;
    if (!client_email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    // Find customer by email
    const customers = await stripe.customers.list({ email: client_email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(404).json({ success: false, error: 'No payment history found for this email.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: baseUrl
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
