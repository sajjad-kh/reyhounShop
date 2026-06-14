const express = require('express');
const shippingMethodService = require('../../services/shippingMethodService');
const shippingMethodScheduler = require('../../services/shippingMethodScheduler');
const { authenticateToken, requireRole, asyncHandler, validateInput } = require('../../middleware');
const Joi = require('joi');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ShippingMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Shipping method ID
 *         basalamId:
 *           type: integer
 *           description: Basalam API shipping method ID
 *         name:
 *           type: string
 *           description: Shipping method name
 *         description:
 *           type: string
 *           description: Shipping method description
 *         baseCost:
 *           type: integer
 *           description: Base shipping cost
 *         additionalCost:
 *           type: integer
 *           description: Additional cost per extra item
 *         additionalDimensionsCost:
 *           type: integer
 *           description: Additional cost for large dimensions
 *         isPrivate:
 *           type: boolean
 *           description: Whether shipping method is private
 *         isActive:
 *           type: boolean
 *           description: Whether shipping method is active
 *         lastSyncedAt:
 *           type: string
 *           format: date-time
 *           description: Last sync timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ShippingMethodStats:
 *       type: object
 *       properties:
 *         totalOrders:
 *           type: integer
 *           description: Total number of orders
 *         statistics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               shippingMethodId:
 *                 type: integer
 *               shippingMethodName:
 *                 type: string
 *               orderCount:
 *                 type: integer
 *               percentage:
 *                 type: number
 *                 format: float
 */

// Validation schemas
const statsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
});

/**
 * @swagger
 * /api/v1/shipping-methods:
 *   get:
 *     summary: Get all active shipping methods
 *     tags: [Shipping Methods]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [basalam, internal]
 *         description: Filter by source (basalam or internal)
 *     responses:
 *       200:
 *         description: Shipping methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingMethod'
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const { source } = req.query;
      
      let shippingMethods;
      if (source && (source === 'basalam' || source === 'internal')) {
        shippingMethods = await shippingMethodService.getShippingMethodsBySource(source);
      } else {
        shippingMethods = await shippingMethodService.getActiveShippingMethods();
      }

      res.json({
        success: true,
        data: shippingMethods,
        cached: false,
        query: req.query,
      });
    } catch (error) {
      // Return user-friendly error
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: 'SHIPPING_METHODS_FETCH_ERROR',
          message: error.message || 'خطا در دریافت روش‌های ارسال',
          canRetry: true,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/{id}:
 *   get:
 *     summary: Get shipping method by ID
 *     tags: [Shipping Methods]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Shipping method ID
 *     responses:
 *       200:
 *         description: Shipping method retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ShippingMethod'
 *       400:
 *         description: Invalid shipping method ID
 *       404:
 *         description: Shipping method not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const shippingMethodId = parseInt(req.params.id);

    if (isNaN(shippingMethodId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SHIPPING_METHOD_ID',
          message: 'Shipping method ID must be a valid number',
        },
      });
    }

    const shippingMethod = await shippingMethodService.getShippingMethodById(shippingMethodId);

    res.json({
      success: true,
      data: shippingMethod,
    });
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/sync:
 *   post:
 *     summary: Sync shipping methods from Basalam API (Admin only)
 *     description: |
 *       Fetches shipping methods from Basalam API and syncs them with local database.
 *       
 *       **Authentication:** Requires admin role authentication.
 *       
 *       **Configuration:** This endpoint uses the Basalam API token configured in environment variables.
 *       The BASALAM_API_TOKEN environment variable must be set before using this endpoint.
 *       No token needs to be provided in the request body.
 *       
 *       **Behavior:** Returns all active shipping methods after successful synchronization.
 *       If the Basalam API is unavailable, the endpoint may return cached data with a warning.
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipping methods synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     syncedCount:
 *                       type: integer
 *                     methods:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ShippingMethod'
 *                     usedCache:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.post(
  '/sync',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    try {
      // Use configured token from environment variables
      // No token required from request body
      const syncedMethods = await shippingMethodService.syncFromBasalam();

      res.json({
        success: true,
        message: 'روش‌های ارسال با موفقیت همگام‌سازی شدند',
        data: {
          syncedCount: syncedMethods.length,
          methods: syncedMethods,
          usedCache: false,
        },
      });
    } catch (error) {
      // Check if error contains cached data (fallback scenario)
      if (error.usedCachedData && error.cachedMethods) {
        return res.status(200).json({
          success: true,
          message: 'همگام‌سازی با خطا مواجه شد، از داده‌های ذخیره شده استفاده شد',
          warning: error.message,
          data: {
            syncedCount: error.cachedMethods.length,
            methods: error.cachedMethods,
            usedCache: true,
          },
        });
      }

      // Return error with helpful information
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.isBasalamError ? 'BASALAM_API_ERROR' : 'SYNC_ERROR',
          message: error.message || 'خطا در همگام‌سازی روش‌های ارسال',
          isBasalamError: error.isBasalamError || false,
          isNetworkError: error.isNetworkError || false,
          canRetry: true,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/stats:
 *   get:
 *     summary: Get shipping method usage statistics (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics (ISO 8601 format)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ShippingMethodStats'
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/stats',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(statsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) {
      dateRange.startDate = startDate;
    }
    if (endDate) {
      dateRange.endDate = endDate;
    }

    const statistics = await shippingMethodService.getUsageStatistics(dateRange);

    res.json({
      success: true,
      data: statistics,
    });
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/scheduler/status:
 *   get:
 *     summary: Get scheduler status (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
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
 *                     isRunning:
 *                       type: boolean
 *                     isSyncing:
 *                       type: boolean
 *                     lastSyncResult:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         duration:
 *                           type: integer
 *                         methodCount:
 *                           type: integer
 *                         error:
 *                           type: string
 *                     schedule:
 *                       type: string
 *                     timezone:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get(
  '/scheduler/status',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const status = shippingMethodScheduler.getStatus();

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/scheduler/trigger:
 *   post:
 *     summary: Manually trigger a sync (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     duration:
 *                       type: integer
 *                     methodCount:
 *                       type: integer
 *                     error:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       409:
 *         description: Sync already in progress
 *       500:
 *         description: Internal server error
 */
router.post(
  '/scheduler/trigger',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const result = await shippingMethodScheduler.triggerManualSync();

    res.json({
      success: true,
      message: 'Sync triggered successfully',
      data: result,
    });
  })
);

module.exports = router;

// Validation schema for creating/updating shipping methods
const createShippingMethodSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().allow('').max(500),
  baseCost: Joi.number().integer().min(0).required(),
  additionalCost: Joi.number().integer().min(0).required(),
  additionalDimensionsCost: Joi.number().integer().min(0).optional(),
  isPrivate: Joi.boolean().optional().default(false),
  isActive: Joi.boolean().optional().default(true),
});

const updateShippingMethodSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  description: Joi.string().optional().allow('').max(500),
  baseCost: Joi.number().integer().min(0).optional(),
  additionalCost: Joi.number().integer().min(0).optional(),
  additionalDimensionsCost: Joi.number().integer().min(0).optional(),
  isPrivate: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * @swagger
 * /api/v1/shipping-methods:
 *   post:
 *     summary: Create a new internal shipping method (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - baseCost
 *               - additionalCost
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               baseCost:
 *                 type: integer
 *               additionalCost:
 *                 type: integer
 *               additionalDimensionsCost:
 *                 type: integer
 *               isPrivate:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Shipping method created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(createShippingMethodSchema),
  asyncHandler(async (req, res) => {
    const shippingMethod = await shippingMethodService.createInternalShippingMethod(req.body);

    res.status(201).json({
      success: true,
      message: 'روش ارسال با موفقیت ایجاد شد',
      data: shippingMethod,
    });
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/{id}:
 *   put:
 *     summary: Update a shipping method (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               baseCost:
 *                 type: integer
 *               additionalCost:
 *                 type: integer
 *               additionalDimensionsCost:
 *                 type: integer
 *               isPrivate:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Shipping method updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Shipping method not found
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(updateShippingMethodSchema),
  asyncHandler(async (req, res) => {
    const shippingMethodId = parseInt(req.params.id);
    console.log("BODYYYYYYYYYYY:", req.body);
    if (isNaN(shippingMethodId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SHIPPING_METHOD_ID',
          message: 'Shipping method ID must be a valid number',
        },
      });
    }

    const shippingMethod = await shippingMethodService.updateShippingMethod(
      shippingMethodId,
      req.body
    );

    res.json({
      success: true,
      message: 'روش ارسال با موفقیت به‌روزرسانی شد',
      data: shippingMethod,
    });
  })
);

/**
 * @swagger
 * /api/v1/shipping-methods/{id}:
 *   delete:
 *     summary: Delete a shipping method (Admin only)
 *     tags: [Shipping Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Shipping method deleted successfully
 *       400:
 *         description: Invalid shipping method ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Shipping method not found
 *       409:
 *         description: Cannot delete - shipping method is in use
 */
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const shippingMethodId = parseInt(req.params.id);

    if (isNaN(shippingMethodId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SHIPPING_METHOD_ID',
          message: 'Shipping method ID must be a valid number',
        },
      });
    }

    await shippingMethodService.deleteShippingMethod(shippingMethodId);

    res.json({
      success: true,
      message: 'روش ارسال با موفقیت حذف شد',
    });
  })
);
