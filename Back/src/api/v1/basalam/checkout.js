/**
 * Basalam Checkout Routes
 * Handles checkout endpoints for Basalam integration
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth');
const { BasalamError } = require('../../../types/basalam');

// Import BasalamCheckoutService (will be implemented in task 3)
let BasalamCheckoutService;
try {
  BasalamCheckoutService = require('../../../services/basalam/BasalamCheckoutService');
} catch (error) {
  // Service not yet implemented
  console.warn('BasalamCheckoutService not found - checkout endpoint will return 501');
}

/**
 * Validate checkout request body
 */
const validateCheckoutRequest = (req, res, next) => {
  const { addressId, shippingMethodId, callbackUrl } = req.body;
  const errors = [];

  // Validate addressId
  if (!addressId) {
    errors.push({ field: 'addressId', message: 'Address ID is required' });
  } else if (!Number.isInteger(addressId) || addressId <= 0) {
    errors.push({ field: 'addressId', message: 'Address ID must be a positive integer' });
  }

  // Validate shippingMethodId
  if (!shippingMethodId) {
    errors.push({ field: 'shippingMethodId', message: 'Shipping method ID is required' });
  } else if (!Number.isInteger(shippingMethodId) || shippingMethodId <= 0) {
    errors.push({ field: 'shippingMethodId', message: 'Shipping method ID must be a positive integer' });
  }

  // Validate callbackUrl (optional, but if provided must be valid)
  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({ field: 'callbackUrl', message: 'Callback URL must use HTTP or HTTPS protocol' });
      }
    } catch (error) {
      errors.push({ field: 'callbackUrl', message: 'Callback URL must be a valid URL' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: errors,
      },
    });
  }

  next();
};

/**
 * POST /api/v1/basalam/checkout
 * Initiate checkout with Basalam products
 * 
 * Request body:
 * - addressId: number (required) - Shipping address ID
 * - shippingMethodId: number (required) - Basalam shipping method ID
 * - callbackUrl: string (optional) - Custom callback URL for payment redirect
 * 
 * Response:
 * - orderId: number - Local order ID
 * - basalamOrderId: number - Basalam order ID
 * - paymentUrl: string - URL to redirect user for payment
 * - totalAmount: number - Total order amount
 */
router.post('/', authenticateToken, validateCheckoutRequest, async (req, res, next) => {
  try {
    // Check if service is available
    if (!BasalamCheckoutService) {
      return res.status(501).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_IMPLEMENTED',
          message: 'Basalam checkout service is not yet available',
        },
      });
    }

    const userId = req.user.id;
    const { addressId, shippingMethodId, callbackUrl } = req.body;

    // Set default callback URL if not provided
    const finalCallbackUrl = callbackUrl || 
      process.env.BASALAM_CALLBACK_URL || 
      `${req.protocol}://${req.get('host')}/api/v1/basalam/callback`;

    // Initialize checkout service
    const checkoutService = new BasalamCheckoutService();

    // Initiate checkout
    const result = await checkoutService.initiateCheckout(
      userId,
      addressId,
      shippingMethodId,
      finalCallbackUrl
    );

    // Return success response with payment URL and order details
    res.status(201).json({
      success: true,
      data: {
        orderId: result.orderId,
        basalamOrderId: result.basalamOrderId,
        paymentUrl: result.paymentUrl,
        totalAmount: result.totalAmount,
      },
    });
  } catch (error) {
    // Handle Basalam-specific errors
    if (error instanceof BasalamError) {
      let statusCode = 400;
      
      // Map error types to appropriate HTTP status codes
      switch (error.type) {
        case 'CART_EMPTY':
        case 'CART_VALIDATION_ERROR':
        case 'INVALID_SHIPPING_METHOD':
          statusCode = 400;
          break;
        case 'UNAUTHORIZED':
          statusCode = 401;
          break;
        case 'ORDER_NOT_FOUND':
          statusCode = 404;
          break;
        case 'BASALAM_API_ERROR':
        case 'PAYMENT_CREATION_FAILED':
          statusCode = 502;
          break;
        case 'PAYMENT_VERIFICATION_FAILED':
          statusCode = 503;
          break;
        default:
          statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          code: error.type,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Handle generic errors
    console.error('Checkout error:', error);
    next(error);
  }
});

module.exports = router;
