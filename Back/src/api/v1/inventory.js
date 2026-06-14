const express = require('express');
const { 
  authenticateToken, 
  requireRole, 
  validateInput,
  asyncHandler 
} = require('../../middleware');
const inventoryService = require('../../services/inventoryService');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const inventoryQuerySchema = Joi.object({
  lowStockOnly: Joi.boolean().optional(),
  categoryId: Joi.number().integer().optional(),
  search: Joi.string().max(255).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'stock', 'reservedStock', 'price').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const stockUpdateSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
  lowStockAlert: Joi.number().integer().min(0).optional(),
  reason: Joi.string().max(255).optional()
});

const bulkStockUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().required(),
      stock: Joi.number().integer().min(0).required(),
      lowStockAlert: Joi.number().integer().min(0).optional(),
      reason: Joi.string().max(255).optional()
    })
  ).min(1).max(100).required()
});

const stockReservationSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  orderId: Joi.string().required()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         stock:
 *           type: integer
 *         reservedStock:
 *           type: integer
 *         availableStock:
 *           type: integer
 *         lowStockAlert:
 *           type: integer
 *         isLowStock:
 *           type: boolean
 *         stockStatus:
 *           type: string
 *           enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK]
 *         stockValue:
 *           type: integer
 *         price:
 *           type: integer
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         mainImage:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/inventory:
 *   get:
 *     summary: Get inventory status for all products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lowStockOnly
 *         schema:
 *           type: boolean
 *         description: Show only low stock products
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name
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
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, stock, reservedStock, price]
 *           default: stock
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Inventory status retrieved successfully
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
 *                     inventory:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryItem'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(inventoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.getInventoryStatus(req.query);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics retrieved successfully
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
 *                     totalProducts:
 *                       type: integer
 *                     inStockProducts:
 *                       type: integer
 *                     lowStockProducts:
 *                       type: integer
 *                     outOfStockProducts:
 *                       type: integer
 *                     totalStockUnits:
 *                       type: integer
 *                     totalStockValue:
 *                       type: integer
 *                     stockDistribution:
 *                       type: object
 *                       properties:
 *                         inStock:
 *                           type: string
 *                         lowStock:
 *                           type: string
 *                         outOfStock:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/stats',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const stats = await inventoryService.getInventoryStats();
    
    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/alerts:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/InventoryItem'
 *                       - type: object
 *                         properties:
 *                           alertLevel:
 *                             type: string
 *                             enum: [LOW, WARNING, CRITICAL]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/alerts',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const alerts = await inventoryService.getLowStockAlerts();
    
    res.json({
      success: true,
      data: alerts
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/{productId}/stock:
 *   put:
 *     summary: Update product stock
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock
 *             properties:
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: New stock quantity
 *               lowStockAlert:
 *                 type: integer
 *                 minimum: 0
 *                 description: Low stock alert threshold
 *               reason:
 *                 type: string
 *                 maxLength: 255
 *                 description: Reason for stock update
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Product not found
 */
router.put('/:productId/stock',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(stockUpdateSchema),
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Product ID must be a valid number'
        }
      });
    }

    const result = await inventoryService.updateStock(productId, req.body, req.user.userId);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/bulk-update:
 *   put:
 *     summary: Bulk update stock for multiple products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - stock
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     stock:
 *                       type: integer
 *                       minimum: 0
 *                     lowStockAlert:
 *                       type: integer
 *                       minimum: 0
 *                     reason:
 *                       type: string
 *                       maxLength: 255
 *     responses:
 *       200:
 *         description: Bulk update completed
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
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryItem'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: integer
 *                           error:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.put('/bulk-update',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(bulkStockUpdateSchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.bulkUpdateStock(req.body.updates, req.user.userId);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/reserve:
 *   post:
 *     summary: Reserve stock for order
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - orderId
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               orderId:
 *                 type: string
 *                 description: Order ID for tracking
 *     responses:
 *       200:
 *         description: Stock reservation completed
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
 *                     reservations:
 *                       type: array
 *                     failures:
 *                       type: array
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/reserve',
  authenticateToken,
  requireRole(['ADMIN']),
  validateInput(stockReservationSchema),
  asyncHandler(async (req, res) => {
    try {
      const result = await inventoryService.reserveStock(req.body.items, req.body.orderId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'STOCK_RESERVATION_FAILED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'STOCK_RESERVATION_FAILED',
            message: 'Unable to reserve stock for one or more items'
          }
        });
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/inventory/release:
 *   post:
 *     summary: Release reserved stock
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - orderId
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               orderId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 description: Reason for stock release
 *     responses:
 *       200:
 *         description: Stock released successfully
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
 *                     releases:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/release',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { items, orderId, reason } = req.body;
    const result = await inventoryService.releaseStock(items, orderId, reason);
    
    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @swagger
 * /api/v1/inventory/confirm:
 *   post:
 *     summary: Confirm stock (convert reserved to sold)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - orderId
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock confirmed successfully
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
 *                     confirmations:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/confirm',
  authenticateToken,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { items, orderId } = req.body;
    const result = await inventoryService.confirmStock(items, orderId);
    
    res.json({
      success: true,
      data: result
    });
  })
);

module.exports = router;