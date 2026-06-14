const express = require('express');
const Joi = require('joi');
const PaymentService = require('../../../services/paymentService');
const PaymentTrackingService = require('../../../services/paymentTrackingService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { validate } = require('../../../utils/validation');

const router = express.Router();
const paymentService = new PaymentService();
const trackingService = new PaymentTrackingService();

// Validation schemas
const refundSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().optional(),
  reason: Joi.string().max(500).required()
});

const paymentStatsSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  gateway: Joi.string().valid('zarinpal', 'stripe', 'payir').optional()
});

/**
 * @swagger
 * /api/v1/admin/payments:
 *   get:
 *     summary: Get all payments with filtering
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *         description: Payment status filter
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *           enum: [ZARINPAL, STRIPE, PAYIR]
 *         description: Payment gateway filter
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: integer
 *         description: Filter by order ID
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, gateway, orderId } = req.query;
    const skip = (page - 1) * limit;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const whereClause = {};
    if (status) whereClause.status = status;
    if (gateway) whereClause.gateway = gateway.toUpperCase();
    if (orderId) whereClause.orderId = parseInt(orderId);

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          order: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.payment.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        payments: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payments'
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payments/{paymentId}:
 *   get:
 *     summary: Get payment details with full transaction history
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Payment not found
 */
router.get('/:paymentId', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true }
            },
            address: true,
            items: {
              include: {
                product: {
                  select: { id: true, name: true, price: true }
                }
              }
            }
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment details'
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payments/refund:
 *   post:
 *     summary: Process refund for an order
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - reason
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID to refund
 *               amount:
 *                 type: number
 *                 description: Refund amount (optional, full refund if not specified)
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid request or refund not possible
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Order not found
 */
router.post('/refund', authenticateToken, requireRole(['ADMIN']), validate(refundSchema), async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    const result = await paymentService.processRefund({
      orderId: orderId,
      amount: amount,
      reason: reason
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          orderId: result.orderId,
          gateway: result.gateway,
          refundId: result.refundId,
          amount: result.amount,
          requiresManualProcessing: result.requiresManualProcessing
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        requiresManualProcessing: result.requiresManualProcessing
      });
    }
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payments/statistics:
 *   get:
 *     summary: Get payment statistics
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *           enum: [zarinpal, stripe, payir]
 *         description: Filter by payment gateway
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/statistics', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { startDate, endDate, gateway } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (gateway) filters.gateway = gateway;

    const result = await trackingService.getPaymentStatistics(filters);

    if (result.success) {
      res.json({
        success: true,
        data: result.statistics
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment statistics'
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payments/failed:
 *   get:
 *     summary: Get failed payments for retry processing
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of failed payments to return
 *       - in: query
 *         name: hoursOld
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Minimum hours since payment failure
 *     responses:
 *       200:
 *         description: Failed payments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/failed', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { limit = 50, hoursOld = 1 } = req.query;

    const result = await trackingService.getFailedPayments({
      limit: parseInt(limit),
      hoursOld: parseInt(hoursOld)
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          failedPayments: result.payments,
          count: result.payments.length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get failed payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve failed payments'
    });
  }
});

/**
 * @swagger
 * /api/v1/admin/payments/{paymentId}/retry:
 *   post:
 *     summary: Retry a failed payment
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID to retry
 *     responses:
 *       200:
 *         description: Payment retry initiated successfully
 *       400:
 *         description: Payment cannot be retried
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Payment not found
 */
router.post('/:paymentId/retry', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);

    const result = await trackingService.retryPayment(paymentId, {
      adminId: req.user.id,
      adminName: req.user.name
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          paymentId: paymentId,
          orderId: result.payment.orderId,
          gateway: result.payment.gateway,
          amount: result.payment.amount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry payment'
    });
  }
});

module.exports = router;