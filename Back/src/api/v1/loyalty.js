const express = require('express');
const loyaltyService = require('../../services/loyaltyService');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { activityLogger } = require('../../middleware/logging');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoyaltyTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         points:
 *           type: integer
 *         reason:
 *           type: string
 *         orderId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         type:
 *           type: string
 *           enum: [earned, redeemed]
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/loyalty/points:
 *   get:
 *     summary: Get user's loyalty points balance
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's loyalty points information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentPoints:
 *                       type: integer
 *                     totalEarned:
 *                       type: integer
 *                     totalRedeemed:
 *                       type: integer
 *                     transactionCount:
 *                       type: integer
 *                     availableDiscount:
 *                       type: integer
 *                     canRedeem:
 *                       type: boolean
 */
router.get('/points', authenticateToken, async (req, res) => {
  try {
    const stats = await loyaltyService.getUserLoyaltyStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOYALTY_FETCH_ERROR',
        message: 'Failed to fetch loyalty points'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/transactions:
 *   get:
 *     summary: Get user's loyalty transaction history
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [earned, redeemed]
 *     responses:
 *       200:
 *         description: Loyalty transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LoyaltyTransaction'
 *                     pagination:
 *                       type: object
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (type && ['earned', 'redeemed'].includes(type)) {
      options.type = type;
    }

    const result = await loyaltyService.getUserTransactions(req.user.id, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching loyalty transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOYALTY_TRANSACTIONS_ERROR',
        message: 'Failed to fetch loyalty transactions'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/redeem:
 *   post:
 *     summary: Redeem loyalty points for discount
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 10
 *     responses:
 *       200:
 *         description: Points redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     pointsRedeemed:
 *                       type: integer
 *                     discountAmount:
 *                       type: integer
 *                     newBalance:
 *                       type: integer
 *                     discountCode:
 *                       type: string
 */
router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POINTS',
          message: 'Points must be greater than 0'
        }
      });
    }

    // Validate redemption
    const validation = await loyaltyService.validatePointsRedemption(req.user.id, points);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REDEMPTION_INVALID',
          message: validation.error
        }
      });
    }

    // Process redemption (this would typically generate a discount code)
    const result = await loyaltyService.processPointsRedemption(req.user.id, points);

    // Generate a unique discount code for this redemption
    const discountCode = `LOYALTY${Date.now()}${req.user.id}`;

    // Log activity
    await activityLogger(
      'loyalty.points_redeemed',
      'LoyaltyTransaction',
      result.transaction.id,
      { 
        pointsRedeemed: points, 
        discountAmount: result.discountAmount,
        discountCode 
      },
      req
    );

    res.json({
      success: true,
      data: {
        pointsRedeemed: result.pointsRedeemed,
        discountAmount: result.discountAmount,
        newBalance: result.newBalance,
        discountCode,
        message: `Successfully redeemed ${points} points for ${result.discountAmount} IRR discount`
      }
    });
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'REDEMPTION_ERROR',
        message: error.message || 'Failed to redeem loyalty points'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/validate-redemption:
 *   post:
 *     summary: Validate points redemption without processing
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Redemption validation result
 */
router.post('/validate-redemption', authenticateToken, async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POINTS',
          message: 'Points must be greater than 0'
        }
      });
    }

    const validation = await loyaltyService.validatePointsRedemption(req.user.id, points);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating redemption:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate redemption'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/calculate-discount:
 *   post:
 *     summary: Calculate discount amount from points
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Calculated discount amount
 */
router.post('/calculate-discount', authenticateToken, async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POINTS',
          message: 'Points must be greater than 0'
        }
      });
    }

    const discountAmount = loyaltyService.calculateDiscountFromPoints(points);
    const minimumPoints = loyaltyService.getMinimumRedemptionPoints();
    
    res.json({
      success: true,
      data: {
        points,
        discountAmount,
        minimumPoints,
        canRedeem: points >= minimumPoints
      }
    });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: 'Failed to calculate discount'
      }
    });
  }
});

// Admin routes
/**
 * @swagger
 * /api/v1/loyalty/admin/stats:
 *   get:
 *     summary: Get system-wide loyalty statistics (Admin only)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System loyalty statistics
 */
router.get('/admin/stats', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const stats = await loyaltyService.getSystemLoyaltyStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching loyalty stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch loyalty statistics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/admin/adjust:
 *   post:
 *     summary: Adjust user loyalty points (Admin only)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - points
 *               - reason
 *             properties:
 *               userId:
 *                 type: integer
 *               points:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Points adjusted successfully
 */
router.post('/admin/adjust', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || points === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'userId, points, and reason are required'
        }
      });
    }

    if (points === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POINTS',
          message: 'Points adjustment cannot be zero'
        }
      });
    }

    const result = await loyaltyService.adminAdjustPoints(
      userId,
      points,
      reason,
      req.user.id
    );

    // Log activity
    await activityLogger(
      'loyalty.admin_adjustment',
      'LoyaltyTransaction',
      result.transaction.id,
      { 
        targetUserId: userId,
        points,
        reason,
        adminId: req.user.id
      },
      req
    );

    res.json({
      success: true,
      data: {
        pointsAdjusted: points,
        newBalance: result.user.loyaltyPoints,
        transaction: result.transaction,
        message: `Successfully ${points > 0 ? 'awarded' : 'deducted'} ${Math.abs(points)} points`
      }
    });
  } catch (error) {
    console.error('Error adjusting loyalty points:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'ADJUSTMENT_ERROR',
        message: error.message || 'Failed to adjust loyalty points'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/expiration:
 *   get:
 *     summary: Get points expiration information
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Points expiration information
 */
router.get('/expiration', authenticateToken, async (req, res) => {
  try {
    const expirationInfo = await loyaltyService.getPointsExpirationInfo(req.user.id);
    
    res.json({
      success: true,
      data: expirationInfo
    });
  } catch (error) {
    console.error('Error fetching expiration info:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPIRATION_INFO_ERROR',
        message: 'Failed to fetch expiration information'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/analytics:
 *   get:
 *     summary: Get detailed transaction analytics
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transaction analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;
    
    const analytics = await loyaltyService.getTransactionAnalytics(req.user.id, dateRange);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to fetch transaction analytics'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/loyalty/admin/expire-points:
 *   post:
 *     summary: Process expired points (Admin only)
 *     tags: [Loyalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired points processed successfully
 */
router.post('/admin/expire-points', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await loyaltyService.processExpiredPoints();
    
    // Log activity
    await activityLogger(
      'loyalty.points_expired',
      'System',
      null,
      { 
        processedUsers: result.processedUsers,
        totalPointsExpired: result.totalPointsExpired,
        adminId: req.user.id
      },
      req
    );

    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processedUsers} users and expired ${result.totalPointsExpired} points`
    });
  } catch (error) {
    console.error('Error processing expired points:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPIRATION_PROCESS_ERROR',
        message: 'Failed to process expired points'
      }
    });
  }
});

module.exports = router;