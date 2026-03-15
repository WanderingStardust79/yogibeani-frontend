const { Router } = require('express');
const db = require('../db');
const router = Router();

function getStripe() {
  const secretKey = db.prepare("SELECT value FROM settings WHERE key = 'stripe_secret_key'").get();
  if (!secretKey || !secretKey.value) return null;
  return require('stripe')(secretKey.value);
}

// POST /api/checkout — create a Stripe Checkout Session
router.post('/', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ success: false, error: 'Stripe is not configured. Add your secret key in admin settings.' });
    }

    const { package_type, client_email, client_name } = req.body;
    if (!package_type) {
      return res.status(400).json({ success: false, error: 'Package type is required.' });
    }

    // Map package type to settings key
    const priceKeyMap = {
      drop_in: 'stripe_price_drop_in',
      five_pack: 'stripe_price_five_pack',
      '5_pack': 'stripe_price_five_pack',
      ten_pack: 'stripe_price_ten_pack',
      '10_pack': 'stripe_price_ten_pack',
      unlimited: 'stripe_price_unlimited'
    };
    const priceSettingKey = priceKeyMap[package_type];
    if (!priceSettingKey) {
      return res.status(400).json({ success: false, error: 'Invalid package type.' });
    }

    const priceRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(priceSettingKey);
    if (!priceRow || !priceRow.value) {
      return res.status(400).json({ success: false, error: 'Stripe price not configured for this package.' });
    }
    const priceId = priceRow.value;

    const mode = (package_type === 'unlimited') ? 'subscription' : 'payment';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Find or create Stripe customer by email
    let customerId;
    if (client_email) {
      const customers = await stripe.customers.list({ email: client_email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: client_email,
          name: client_name || undefined
        });
        customerId = customer.id;
      }
    }

    const sessionParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${baseUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?payment=cancelled`,
      metadata: {
        package_type,
        client_name: client_name || '',
        client_email: client_email || ''
      }
    };
    if (customerId) {
      sessionParams.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ success: true, data: { url: session.url, session_id: session.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
