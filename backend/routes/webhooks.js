const { Router } = require('express');
const db = require('../db');
const router = Router();

function getStripe() {
  const secretKey = db.prepare("SELECT value FROM settings WHERE key = 'stripe_secret_key'").get();
  if (!secretKey || !secretKey.value) return null;
  return require('stripe')(secretKey.value);
}

function getWebhookSecret() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'stripe_webhook_secret'").get();
  return row ? row.value : '';
}

// POST /api/webhooks/stripe — handle Stripe webhook events
// NOTE: This route needs raw body (not JSON parsed). Configured in server.js.
router.post('/stripe', (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(400).json({ success: false, error: 'Stripe not configured' });
  }

  const webhookSecret = getWebhookSecret();
  let event;

  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No webhook secret — parse raw body as JSON (dev/testing only)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.updated':
        handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err.message);
    // Still return 200 so Stripe doesn't retry
  }

  res.json({ received: true });
});

function handleCheckoutCompleted(session) {
  const meta = session.metadata || {};
  const email = session.customer_details?.email || meta.client_email || '';
  const name = session.customer_details?.name || meta.client_name || '';
  const packageType = meta.package_type || 'unknown';
  const amount = (session.amount_total || 0) / 100;

  // Record the purchase
  db.prepare(`
    INSERT INTO purchases (client_name, client_email, package_type, amount, status, stripe_session_id, stripe_customer_id)
    VALUES (?, ?, ?, ?, 'completed', ?, ?)
  `).run(name, email, packageType, amount, session.id, session.customer || '');

  // If subscription, record it
  if (session.mode === 'subscription' && session.subscription) {
    db.prepare(`
      INSERT OR IGNORE INTO subscriptions (client_email, client_name, stripe_customer_id, stripe_subscription_id, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(email, name, session.customer || '', session.subscription);
  }
}

function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) return;

  // Update subscription period
  db.prepare(`
    UPDATE subscriptions SET status = 'active', updated_at = datetime('now'),
      current_period_end = datetime(?, 'unixepoch')
    WHERE stripe_subscription_id = ?
  `).run(invoice.lines?.data?.[0]?.period?.end || 0, invoice.subscription);
}

function handleSubscriptionUpdated(subscription) {
  db.prepare(`
    UPDATE subscriptions SET status = ?, updated_at = datetime('now'),
      current_period_end = datetime(?, 'unixepoch')
    WHERE stripe_subscription_id = ?
  `).run(subscription.status, subscription.current_period_end || 0, subscription.id);
}

function handleSubscriptionDeleted(subscription) {
  db.prepare(`
    UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
    WHERE stripe_subscription_id = ?
  `).run(subscription.id);
}

module.exports = router;
