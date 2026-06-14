const { logActivity } = require('../utils/logger');

/**
 * Payment-specific error handler middleware
 * Handles payment gateway errors and provides appropriate responses
 */
const paymentErrorHandler = (error, req, res, next) => {
  console.error('Payment Error:', error);

  // Log payment error
  if (req.user) {
    logActivity(
      req.user.id,
      'payment.error',
      'Payment',
      null,
      {
        error: error.message,
        stack: error.stack,
        endpoint: req.path,
        method: req.method,
        body: req.body
      }
    ).catch(console.error);
  }

  // Handle specific payment gateway errors
  if (error.type === 'StripeCardError') {
    return res.status(400).json({
      success: false,
      error: 'Card payment failed',
      details: error.message,
      code: error.code
    });
  }

  if (error.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment request',
      details: error.message
    });
  }

  if (error.type === 'StripeAPIError') {
    return res.status(502).json({
      success: false,
      error: 'Payment gateway error',
      message: 'Please try again later'
    });
  }

  if (error.type === 'StripeConnectionError') {
    return res.status(503).json({
      success: false,
      error: 'Payment service unavailable',
      message: 'Please try again later'
    });
  }

  if (error.type === 'StripeAuthenticationError') {
    return res.status(500).json({
      success: false,
      error: 'Payment configuration error',
      message: 'Please contact support'
    });
  }

  // Handle Zarinpal errors
  if (error.message && error.message.includes('Zarinpal')) {
    return res.status(400).json({
      success: false,
      error: 'Payment gateway error',
      details: error.message
    });
  }

  // Handle Pay.ir errors
  if (error.message && error.message.includes('Pay.ir')) {
    return res.status(400).json({
      success: false,
      error: 'Payment gateway error',
      details: error.message
    });
  }

  // Handle payment timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return res.status(408).json({
      success: false,
      error: 'Payment request timeout',
      message: 'Please try again'
    });
  }

  // Handle payment validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment data',
      details: error.message
    });
  }

  // Handle order-related payment errors
  if (error.message.includes('Order not found')) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
      message: 'The specified order does not exist'
    });
  }

  if (error.message.includes('Order already paid')) {
    return res.status(400).json({
      success: false,
      error: 'Order already paid',
      message: 'This order has already been paid for'
    });
  }

  if (error.message.includes('Payment already processed')) {
    return res.status(400).json({
      success: false,
      error: 'Payment already processed',
      message: 'This payment has already been processed'
    });
  }

  // Handle insufficient funds or declined payments
  if (error.message.includes('insufficient funds') || 
      error.message.includes('declined') ||
      error.message.includes('card_declined')) {
    return res.status(400).json({
      success: false,
      error: 'Payment declined',
      message: 'Your payment was declined. Please try a different payment method.'
    });
  }

  // Handle refund errors
  if (error.message.includes('refund')) {
    return res.status(400).json({
      success: false,
      error: 'Refund processing failed',
      details: error.message
    });
  }

  // Default payment error response
  if (req.path.includes('/payments/') || req.path.includes('/admin/payments/')) {
    return res.status(500).json({
      success: false,
      error: 'Payment processing failed',
      message: 'An unexpected error occurred while processing your payment. Please try again or contact support.'
    });
  }

  // Pass to next error handler if not payment-related
  next(error);
};

/**
 * Async wrapper for payment operations
 * Catches async errors and passes them to the error handler
 */
const asyncPaymentHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Payment retry logic middleware
 * Implements exponential backoff for failed payment operations
 */
const paymentRetryHandler = (maxRetries = 3, baseDelay = 1000) => {
  return async (req, res, next) => {
    let attempt = 0;
    
    const executeWithRetry = async () => {
      try {
        await next();
      } catch (error) {
        attempt++;
        
        // Check if error is retryable
        const isRetryable = 
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.type === 'StripeConnectionError' ||
          error.type === 'StripeAPIError' ||
          (error.message && error.message.includes('network'));

        if (isRetryable && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Payment operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          
          setTimeout(() => {
            executeWithRetry();
          }, delay);
        } else {
          throw error;
        }
      }
    };

    await executeWithRetry();
  };
};

module.exports = {
  paymentErrorHandler,
  asyncPaymentHandler,
  paymentRetryHandler
};