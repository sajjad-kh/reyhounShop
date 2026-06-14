const express = require('express');
const adminService = require('../../../services/adminService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics and metrics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                         totalRevenue:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         totalProducts:
 *                           type: integer
 *                         todayOrders:
 *                           type: integer
 *                         todayRevenue:
 *                           type: integer
 *                         monthlyOrders:
 *                           type: integer
 *                         monthlyRevenue:
 *                           type: integer
 *                     orderStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                         averageOrderValue:
 *                           type: integer
 *                     userStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         retentionRate:
 *                           type: integer
 *                     productStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         lowStock:
 *                           type: integer
 *                         outOfStock:
 *                           type: integer
 *                         topSelling:
 *                           type: array
 *                     revenueStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         today:
 *                           type: integer
 *                         thisMonth:
 *                           type: integer
 *                         thisYear:
 *                           type: integer
 *                     paymentStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         successful:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         successRate:
 *                           type: integer
 *                     growthRates:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: integer
 *                         revenue:
 *                           type: integer
 *                         users:
 *                           type: integer
 *                     recentActivity:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: array
 *                         pendingReviews:
 *                           type: integer
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const dashboardStats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    
    if (error.message === 'DASHBOARD_STATS_ERROR') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to retrieve dashboard statistics'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});

module.exports = router;