const express = require('express');
const { 
  authenticateToken, 
  validateInput,
  asyncHandler 
} = require('../../middleware');
const wishlistService = require('../../services/wishlistService');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const addToWishlistSchema = Joi.object({
  productId: Joi.number().integer().required()
});

const moveToCartSchema = Joi.object({
  quantity: Joi.number().integer().min(1).optional().default(1)
});

const wishlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  sortBy: Joi.string().valid('createdAt', 'productName', 'price').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     WishlistItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         productId:
 *           type: integer
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             slug:
 *               type: string
 *             price:
 *               type: integer
 *             discountPrice:
 *               type: integer
 *             effectivePrice:
 *               type: integer
 *             stock:
 *               type: integer
 *             availableStock:
 *               type: integer
 *             averageRating:
 *               type: number
 *             reviewCount:
 *               type: integer
 *             mainImage:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/wishlist:
 *   post:
 *     summary: Add product to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: Product ID to add to wishlist
 *     responses:
 *       201:
 *         description: Product added to wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WishlistItem'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or product already in wishlist
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post('/',
  authenticateToken,
  validateInput(addToWishlistSchema),
  asyncHandler(async (req, res) => {
    const { productId } = req.body;

    try {
      const wishlistItem = await wishlistService.addToWishlist(req.user.userId, productId);
      
      res.status(201).json({
        success: true,
        data: wishlistItem,
        message: 'Product added to wishlist successfully'
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }
      
      if (error.message === 'Product is already in your wishlist') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PRODUCT_ALREADY_IN_WISHLIST',
            message: 'Product is already in your wishlist'
          }
        });
      }
      
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Wishlist]
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
 *           maximum: 50
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, productName, price]
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
 *         description: Wishlist retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WishlistItem'
 *                     pagination:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                         availableItems:
 *                           type: integer
 *                         outOfStockItems:
 *                           type: integer
 *                         estimatedValue:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticateToken,
  validateInput(wishlistQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const [wishlistResult, stats] = await Promise.all([
      wishlistService.getUserWishlist(req.user.userId, req.query),
      wishlistService.getWishlistStats(req.user.userId)
    ]);
    
    res.json({
      success: true,
      data: {
        ...wishlistResult,
        stats
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/wishlist/{id}:
 *   delete:
 *     summary: Remove product from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Wishlist item ID
 *     responses:
 *       200:
 *         description: Product removed from wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wishlist item not found
 */
router.delete('/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const wishlistItemId = parseInt(req.params.id);
    
    if (isNaN(wishlistItemId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WISHLIST_ITEM_ID',
          message: 'Wishlist item ID must be a valid number'
        }
      });
    }

    try {
      await wishlistService.removeFromWishlist(req.user.userId, wishlistItemId);
      
      res.json({
        success: true,
        message: 'Product removed from wishlist successfully'
      });
    } catch (error) {
      if (error.message === 'Wishlist item not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WISHLIST_ITEM_NOT_FOUND',
            message: 'Wishlist item not found'
          }
        });
      }
      
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/wishlist/{id}/move-to-cart:
 *   post:
 *     summary: Move wishlist item to cart
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Wishlist item ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Quantity to add to cart
 *     responses:
 *       200:
 *         description: Product moved to cart successfully
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
 *                     cartItem:
 *                       type: object
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wishlist item not found
 */
router.post('/:id/move-to-cart',
  authenticateToken,
  validateInput(moveToCartSchema),
  asyncHandler(async (req, res) => {
    const wishlistItemId = parseInt(req.params.id);
    
    if (isNaN(wishlistItemId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WISHLIST_ITEM_ID',
          message: 'Wishlist item ID must be a valid number'
        }
      });
    }

    const { quantity = 1 } = req.body;

    try {
      const result = await wishlistService.moveToCart(req.user.userId, wishlistItemId, quantity);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'Wishlist item not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WISHLIST_ITEM_NOT_FOUND',
            message: 'Wishlist item not found'
          }
        });
      }
      
      if (error.message.includes('items available in stock')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message
          }
        });
      }
      
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/v1/wishlist/clear:
 *   delete:
 *     summary: Clear entire wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist cleared successfully
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
 *                     removedCount:
 *                       type: integer
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.delete('/clear',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await wishlistService.clearWishlist(req.user.userId);
    
    res.json({
      success: true,
      data: result
    });
  })
);

module.exports = router;