/**
 * Basalam Payment Callback Routes
 * Handles payment callback from Basalam gateway
 */

const express = require('express');
const router = express.Router();
const { BasalamError } = require('../../../types/basalam');

// Import BasalamCheckoutService
let BasalamCheckoutService;
try {
  BasalamCheckoutService = require('../../../services/basalam/BasalamCheckoutService');
} catch (error) {
  // Service not yet implemented
  console.warn('BasalamCheckoutService not found - callback endpoint will return error');
}

/**
 * GET /api/v1/basalam/callback
 * Handle payment callback from Basalam gateway
 * 
 * Query parameters:
 * - pay_id: number - Payment ID from Basalam
 * - callback: string - Callback token
 * - status: string - Payment status (success, failed, cancelled)
 * 
 * Response:
 * - Redirects to success or failure page with order details
 */
router.get('/', async (req, res, next) => {
  try {
    const { pay_id, callback, status } = req.query;

    console.log('[Basalam Callback] Received payment callback:', {
      pay_id,
      status,
      hasCallback: !!callback,
    });

    // Validate required parameters
    if (!pay_id || !status) {
      console.error('[Basalam Callback] Missing required parameters');
      return res.redirect(
        `/basalam/payment/failed?error=missing_parameters&message=${encodeURIComponent('پارامترهای پرداخت ناقص است')}`
      );
    }

    // Check if service is available
    if (!BasalamCheckoutService) {
      console.error('[Basalam Callback] Service not available');
      return res.redirect(
        `/basalam/payment/failed?error=service_unavailable&message=${encodeURIComponent('سرویس پرداخت در دسترس نیست')}`
      );
    }

    // Initialize checkout service
    const checkoutService = new BasalamCheckoutService();

    // Handle payment callback
    const result = await checkoutService.handlePaymentCallback({
      pay_id: parseInt(pay_id),
      callback,
      status,
    });

    console.log('[Basalam Callback] Callback processed:', {
      success: result.success,
      orderId: result.orderId,
    });

    // Build redirect URL based on result
    if (result.success) {
      // Successful payment - redirect to success page with order details
      const successUrl = `/basalam/payment/callback?status=success&orderId=${result.orderId}&pay_id=${pay_id}`;
      return res.redirect(successUrl);
    } else {
      // Failed payment - redirect to failure page
      const failureUrl = `/basalam/payment/callback?status=failed&orderId=${result.orderId}&pay_id=${pay_id}`;
      return res.redirect(failureUrl);
    }
  } catch (error) {
    console.error('[Basalam Callback] Error processing callback:', error);

    // Handle Basalam-specific errors
    if (error instanceof BasalamError) {
      const errorMessage = encodeURIComponent(error.message);
      return res.redirect(
        `/basalam/payment/failed?error=${error.type}&message=${errorMessage}`
      );
    }

    // Handle generic errors
    const errorMessage = encodeURIComponent('خطا در پردازش نتیجه پرداخت');
    return res.redirect(
      `/basalam/payment/failed?error=processing_error&message=${errorMessage}`
    );
  }
});

module.exports = router;
