const express = require('express');
const cartService = require('../../services/cartService');
const discountService = require('../../services/discountService');
const { authenticateToken } = require('../../middleware/auth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateAddToCart = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

const validateUpdateCartItem = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Cart item ID must be a positive integer'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

const validateCartItemId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Cart item ID must be a positive integer')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Cart item ID
 *         cartId:
 *           type: integer
 *           description: Cart ID
 *         productId:
 *           type: integer
 *           description: Product ID
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Quantity of the product
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         product:
 *           $ref: '#/components/schemas/Product'
 *     
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Cart ID
 *         userId:
 *           type: integer
 *           description: User ID
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totalItems:
 *           type: integer
 *           description: Total number of items in cart
 *         totalAmount:
 *           type: integer
 *           description: Total cart amount in cents
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     AddToCartRequest:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: integer
 *           minimum: 1
 *           description: Product ID to add to cart
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Quantity to add
 *     
 *     UpdateCartItemRequest:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: New quantity for the cart item
 *     
 *     DiscountValidation:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Discount code to validate
 */

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Get user's cart with totals
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cart = await cartService.getCartSummary(req.user.id);
    
    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_FETCH_ERROR',
        message: 'Failed to retrieve cart'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
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
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *                 minimum: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       201:
 *         description: Item added to cart successfully
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
 *                   $ref: '#/components/schemas/CartSummary'
 *       400:
 *         description: Invalid input or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post('/items', authenticateToken, validateAddToCart, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user.id, productId, quantity);
    
    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock available'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_ADD_ERROR',
        message: 'Failed to add item to cart'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/cart/items/{id}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Cart item updated successfully
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
 *                   $ref: '#/components/schemas/CartSummary'
 *       400:
 *         description: Invalid input or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.put('/items/:id', authenticateToken, validateUpdateCartItem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const cartItemId = parseInt(req.params.id);
    const { quantity } = req.body;
    
    const cart = await cartService.updateCartItem(req.user.id, cartItemId, quantity);
    
    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    
    if (error.message === 'CART_ITEM_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_ITEM_NOT_FOUND',
          message: 'Cart item not found'
        }
      });
    }
    
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock available'
        }
      });
    }
    
    if (error.message === 'INVALID_QUANTITY') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be greater than 0'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_UPDATE_ERROR',
        message: 'Failed to update cart item'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/cart/items/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
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
 *                   $ref: '#/components/schemas/CartSummary'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.delete('/items/:id', authenticateToken, validateCartItemId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid cart item ID',
          details: errors.array()
        }
      });
    }

    const cartItemId = parseInt(req.params.id);
    const cart = await cartService.removeFromCart(req.user.id, cartItemId);
    
    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    
    if (error.message === 'CART_ITEM_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_ITEM_NOT_FOUND',
          message: 'Cart item not found'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_REMOVE_ERROR',
        message: 'Failed to remove item from cart'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/cart/clear:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
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
 *                   $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Unauthorized
 */
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const cart = await cartService.clearCart(req.user.id);
    
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_CLEAR_ERROR',
        message: 'Failed to clear cart'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/cart/validate-discount:
 *   post:
 *     summary: Validate discount code for current cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discountCode
 *             properties:
 *               discountCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Discount validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 discount:
 *                   type: object
 *                 discountAmount:
 *                   type: integer
 *                 cartTotal:
 *                   type: integer
 *                 finalTotal:
 *                   type: integer
 *                 error:
 *                   type: string
 */
router.post('/validate-discount', authenticateToken, async (req, res) => {
  try {
    const { discountCode } = req.body;

    if (!discountCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DISCOUNT_CODE',
          message: 'Discount code is required'
        }
      });
    }

    // Get current cart total
    const cart = await cartService.getCartSummary(req.user.id);
    const cartTotal = cart.summary.subtotal;

    if (cartTotal === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Cart is empty'
        }
      });
    }

    // Validate discount
    const validation = await discountService.validateDiscount(
      discountCode,
      cartTotal,
      req.user.id
    );

    if (validation.valid) {
      const discountAmount = discountService.calculateDiscountAmount(
        validation.discount,
        cartTotal
      );

      res.json({
        success: true,
        valid: true,
        discount: validation.discount,
        discountAmount,
        cartTotal,
        finalTotal: cartTotal - discountAmount
      });
    } else {
      res.json({
        success: true,
        valid: false,
        error: validation.error,
        cartTotal
      });
    }
  } catch (error) {
    console.error('Validate discount error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DISCOUNT_VALIDATION_ERROR',
        message: 'Failed to validate discount code'
      }
    });
  }
});

module.exports = router;