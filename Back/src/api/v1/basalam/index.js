/**
 * Basalam API Routes
 * Main router for Basalam order integration endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth');

// Import route handlers
const orderRoutes = require('./orders');
const checkoutRoutes = require('./checkout');
const callbackRoutes = require('./callback');

// Mount routes
router.use('/orders', orderRoutes);

// Mount checkout route with authentication (POST /api/v1/basalam/checkout)
router.use('/checkout', authenticateToken, checkoutRoutes);

// Mount callback route (GET /api/v1/basalam/callback)
// No authentication required - this is called by Basalam payment gateway
router.use('/callback', callbackRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'basalam-integration' });
});

module.exports = router;
