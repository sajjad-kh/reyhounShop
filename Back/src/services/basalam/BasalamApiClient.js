/**
 * Basalam API Client
 * Handles communication with Basalam Order Management API
 */

const axios = require('axios');
const { BasalamError, BasalamErrorType } = require('../../types/basalam');

class BasalamApiClient {
  constructor() {
    this.baseUrl = process.env.BASALAM_API_URL || 'https://openapi.basalam.com';
    this.apiToken = process.env.BASALAM_API_TOKEN;

    if (!this.apiToken) {
      console.warn('BASALAM_API_TOKEN not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiToken && { Authorization: `Bearer ${this.apiToken}` }),
      },
      timeout: 30000, // 30 seconds
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Basalam API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Basalam API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(
          `[Basalam API] Response ${response.status} from ${response.config.url}`
        );
        return response;
      },
      (error) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle API errors and convert to BasalamError
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      console.error('[Basalam API] Error response:', {
        status,
        data,
        url: error.config?.url,
      });

      if (status === 401 || status === 403) {
        throw new BasalamError(
          BasalamErrorType.AUTH_ERROR,
          'Authentication failed with Basalam API',
          data
        );
      }

      if (status === 400) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          data.message || 'Invalid request data',
          data
        );
      }

      if (status === 404) {
        throw new BasalamError(
          BasalamErrorType.ORDER_NOT_FOUND,
          'Resource not found',
          data
        );
      }

      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        data.message || 'Basalam API request failed',
        data
      );
    } else if (error.request) {
      // Request made but no response received
      console.error('[Basalam API] No response received:', error.message);
      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        'No response from Basalam API',
        { originalError: error.message }
      );
    } else {
      // Error in request setup
      console.error('[Basalam API] Request setup error:', error.message);
      throw new BasalamError(
        BasalamErrorType.NETWORK_ERROR,
        'Failed to setup request',
        { originalError: error.message }
      );
    }
  }

  /**
   * Make GET request to Basalam API
   */
  async get(endpoint, params = {}) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  /**
   * Make POST request to Basalam API
   */
  async post(endpoint, data = {}) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  /**
   * Make PUT request to Basalam API
   */
  async put(endpoint, data = {}) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  /**
   * Make DELETE request to Basalam API
   */
  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  /**
   * Get active basket from Basalam
   * @returns {Promise<Object>} Basket data
   */
  async getBasket() {
    return await this.get('/basket');
  }

  /**
   * Add items to Basalam basket
   * @param {Array} items - Array of items to add [{product_id, quantity, variation_id?}]
   * @returns {Promise<Object>} Updated basket
   */
  async addToBasket(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Items must be a non-empty array',
        { items }
      );
    }

    // Validate item structure
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        throw new BasalamError(
          BasalamErrorType.VALIDATION_ERROR,
          'Each item must have product_id and quantity',
          { item }
        );
      }
    }

    return await this.post('/basket/items', { items });
  }

  /**
   * Create invoice from basket
   * @returns {Promise<Object>} Invoice data with invoice_id
   */
  async createInvoice() {
    return await this.post('/basket/invoice');
  }

  /**
   * Create payment for invoice
   * @param {number} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment configuration
   * @param {Object} paymentData.pay_drivers - Payment driver configuration
   * @param {string} paymentData.callback - Callback URL
   * @param {string} [paymentData.option_code] - Optional shipping option code
   * @param {string} [paymentData.national_id] - Optional national ID
   * @returns {Promise<Object>} Payment URL and payment ID
   */
  async createPayment(invoiceId, paymentData) {
    if (!invoiceId) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Invoice ID is required',
        { invoiceId }
      );
    }

    if (!paymentData || !paymentData.callback) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Payment data must include callback URL',
        { paymentData }
      );
    }

    return await this.post(`/invoice/${invoiceId}/payment`, paymentData);
  }

  /**
   * Get customer orders from Basalam
   * @param {Object} filters - Query filters
   * @param {number} [filters.page] - Page number
   * @param {number} [filters.limit] - Items per page
   * @param {string} [filters.status] - Filter by status
   * @returns {Promise<Object>} Orders list
   */
  async getCustomerOrders(filters = {}) {
    return await this.get('/customer/orders', filters);
  }

  /**
   * Get order details from Basalam
   * @param {number} orderId - Basalam order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    if (!orderId) {
      throw new BasalamError(
        BasalamErrorType.VALIDATION_ERROR,
        'Order ID is required',
        { orderId }
      );
    }

    return await this.get(`/orders/${orderId}`);
  }
}

module.exports = BasalamApiClient;
