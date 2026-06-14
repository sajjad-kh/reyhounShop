/**
 * Basalam Order Integration Types
 * Type definitions and constants for Basalam order management
 */

/**
 * Order Status Enum
 */
const OrderStatus = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

/**
 * Basalam Error Types
 */
const BasalamErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE',
  ORDER_CREATION_FAILED: 'ORDER_CREATION_FAILED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
};

/**
 * Custom Basalam Error Class
 */
class BasalamError extends Error {
  constructor(type, message, details = null) {
    super(message);
    this.name = 'BasalamError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Validation schemas for request data
 */
const ValidationSchemas = {
  createOrder: {
    items: {
      type: 'array',
      required: true,
      minLength: 1,
      items: {
        productId: { type: 'number', required: true },
        quantity: { type: 'number', required: true, min: 1 },
      },
    },
    shippingAddress: {
      type: 'object',
      required: true,
      properties: {
        province: { type: 'string', required: true },
        city: { type: 'string', required: true },
        address: { type: 'string', required: true },
        postalCode: { type: 'string', required: true },
      },
    },
    contactInfo: {
      type: 'object',
      required: true,
      properties: {
        fullName: { type: 'string', required: true },
        phone: { type: 'string', required: true },
        email: { type: 'string', required: false },
      },
    },
    callbackUrl: { type: 'string', required: true },
  },

  verifyPayment: {
    transactionId: { type: 'string', required: true },
    status: { type: 'string', required: true },
  },

  orderFilters: {
    page: { type: 'number', required: false, min: 1 },
    limit: { type: 'number', required: false, min: 1, max: 100 },
    status: {
      type: 'string',
      required: false,
      enum: Object.values(OrderStatus),
    },
  },
};

module.exports = {
  OrderStatus,
  BasalamErrorType,
  BasalamError,
  ValidationSchemas,
};
