/**
 * Basalam API Configuration
 * Centralized configuration for Basalam API endpoints and settings
 */

module.exports = {
  // API Base URLs
  baseUrl: process.env.BASALAM_API_URL || 'https://openapi.basalam.com',
  orderApiUrl: process.env.BASALAM_ORDER_API_URL || 'https://order.basalam.com',
  
  // Authentication
  apiToken: process.env.BASALAM_API_TOKEN,
  vendorId: process.env.BASALAM_VENDOR_ID,
  
  // Shipping Method Endpoints
  endpoints: {
    shipping: {
      defaults: '/v1/shipping-methods/defaults',
      list: '/v1/shipping-methods',
      vendor: (vendorId) => `/v1/shipping-methods/vendor/${vendorId}`,
    },
    orders: {
      list: '/v1/orders',
      details: (orderId) => `/v1/orders/${orderId}`,
      callback: '/v1/orders/callback',
    },
  },
  
  // Sync Configuration
  sync: {
    interval: parseInt(process.env.BASALAM_SHIPPING_SYNC_INTERVAL || '86400000', 10), // 24 hours in ms
    cacheTtl: parseInt(process.env.BASALAM_SHIPPING_CACHE_TTL || '3600', 10), // 1 hour in seconds
  },
  
  // Request Configuration
  request: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },
  
  // Callback URL
  callbackUrl: process.env.BASALAM_CALLBACK_URL || 'http://localhost:3000/api/v1/basalam/callback',
};
