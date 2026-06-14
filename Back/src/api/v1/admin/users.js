const express = require('express');
const adminService = require('../../../services/adminService');
const userService = require('../../../services/userService');
const orderService = require('../../../services/orderService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get comprehensive user listing for admin
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users registered from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users registered until this date
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
 *         description: Number of users per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name, email]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           loyaltyPoints:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               totalOrders:
 *                                 type: integer
 *                               totalSpent:
 *                                 type: integer
 *                               totalReviews:
 *                                 type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/', 
  authenticateToken, 
  requireRole(['ADMIN']),
  [
    query('role').optional().isIn(['USER', 'ADMIN']),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'name', 'email']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const result = await adminService.getAdminUsers(req.query);

      res.json({
        success: true,
        data: Array.isArray(result.users) ? result.users : [],
        pagination: result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    } catch (error) {
      console.error('Admin users listing error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}:
 *   get:
 *     summary: Get detailed user information for admin
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     user:
 *                       type: object
 *                     orderSummary:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:userId',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            details: errors.array()
          }
        });
      }

      const userId = parseInt(req.params.userId);
      
      // Get user details and related information
      const [user, orderSummary, recentActivity] = await Promise.all([
        userService.getUserById(userId),
        orderService.getUserOrderSummary(userId),
        getUserRecentActivity(userId)
      ]);

      res.json({
        success: true,
        data: {
          user,
          orderSummary,
          recentActivity
        }
      });
    } catch (error) {
      console.error('Admin user details error:', error);
      
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user details'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/status:
 *   put:
 *     summary: Update user account status
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: New active status
 *               reason:
 *                 type: string
 *                 description: Reason for status change (optional)
 *             required:
 *               - isActive
 *     responses:
 *       200:
 *         description: User status updated successfully
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
 *                     user:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: User status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/status',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    body('reason').optional().isString().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      const userId = parseInt(req.params.userId);
      const { isActive, reason } = req.body;
      const adminId = req.user.id;

      // Prevent admin from deactivating themselves
      if (userId === adminId && !isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SELF_DEACTIVATION_ERROR',
            message: 'Cannot deactivate your own account'
          }
        });
      }

      const updatedUser = await adminService.updateUserStatus(userId, isActive, adminId);

      // Log reason if provided
      if (reason) {
        await adminService.logAdminActivity(adminId, 'user.status_change_reason', 'User', userId, {
          reason,
          newStatus: isActive
        });
      }

      res.json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'User status updated successfully'
      });
    } catch (error) {
      console.error('Admin user status update error:', error);
      
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user status'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/role:
 *   put:
 *     summary: Update user role
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *                 description: New user role
 *               reason:
 *                 type: string
 *                 description: Reason for role change (optional)
 *             required:
 *               - role
 *     responses:
 *       200:
 *         description: User role updated successfully
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
 *                     user:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: User role updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:userId/role',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('role').isIn(['USER', 'ADMIN']).withMessage('Invalid role'),
    body('reason').optional().isString().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array()
          }
        });
      }

      const userId = parseInt(req.params.userId);
      const { role, reason } = req.body;
      const adminId = req.user.id;

      // Prevent admin from removing their own admin role
      if (userId === adminId && role === 'USER') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SELF_DEMOTION_ERROR',
            message: 'Cannot remove admin role from your own account'
          }
        });
      }

      const updatedUser = await adminService.updateUserRole(userId, role, adminId);

      // Log reason if provided
      if (reason) {
        await adminService.logAdminActivity(adminId, 'user.role_change_reason', 'User', userId, {
          reason,
          newRole: role
        });
      }

      res.json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'User role updated successfully'
      });
    } catch (error) {
      console.error('Admin user role update error:', error);
      
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      if (error.message === 'INVALID_ROLE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user role'
        }
      });
    }
  }
);

/**
 * Get user recent activity for admin view
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Recent activity
 */
async function getUserRecentActivity(userId) {
  const { getPrismaClient } = require('../../../utils/database');
  
  const activities = await getPrismaClient().activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return activities.map(activity => ({
    id: activity.id,
    action: activity.action,
    entity: activity.entity,
    entityId: activity.entityId,
    details: activity.details,
    createdAt: activity.createdAt
  }));
}

module.exports = router;