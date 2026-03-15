require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Stripe webhooks need raw body for signature verification — mount BEFORE json parser
app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('./routes/webhooks'));

app.use(express.json({ limit: '5mb' })); // larger limit for signature_data

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/waivers', require('./routes/waivers'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/billing-portal', require('./routes/billing'));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`YogiBeani server running on http://localhost:${PORT}`);
});
