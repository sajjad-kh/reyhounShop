/**
 * Basalam Orders Routes
 * Handles order-related endpoints for Basalam integration
 */

const express = require('express');
const router = express.Router();
const BasalamOrderService = require('../../../services/basalam/BasalamOrderService');
const { authenticateToken } = require('../../../middleware/auth');
const { BasalamError } = require('../../../types/basalam');

const orderService = new BasalamOrderService();

/**
 * POST /api/v1/basalam/orders
 * Create a new order in Basalam
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderData = req.body;

    // Set callback URL if not provided
    if (!orderData.callbackUrl) {
      const baseUrl = process.env.BASALAM_CALLBACK_URL || `${req.protocol}://${req.get('host')}`;
      orderData.callbackUrl = `${baseUrl}/api/v1/basalam/callback`;
    }

    const result = await orderService.createOrder(orderData, userId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof BasalamError) {
      return res.status(400).json({
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/basalam/orders
 * Get list of orders for the authenticated user
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, status } = req.query;

    const filters = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
    };

    const result = await orderService.getOrders(userId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof BasalamError) {
      return res.status(400).json({
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/basalam/orders/:orderId
 * Get order details
 */
router.get('/:orderId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid order ID',
        },
      });
    }

    const result = await orderService.getOrderDetails(orderId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof BasalamError) {
      const statusCode = error.type === 'ORDER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/basalam/orders/:orderId/verify
 * Verify payment for an order
 */
router.post('/:orderId/verify', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);
    const { transactionId } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid order ID',
        },
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Transaction ID is required',
        },
      });
    }

    const result = await orderService.verifyPayment(orderId, transactionId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof BasalamError) {
      const statusCode = error.type === 'ORDER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/basalam/orders/:orderId/sync
 * Sync order status with Basalam API
 */
router.post('/:orderId/sync', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.orderId);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid order ID',
        },
      });
    }

    const result = await orderService.syncOrderStatus(orderId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof BasalamError) {
      const statusCode = error.type === 'ORDER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }
    next(error);
  }
});

module.exports = router;
