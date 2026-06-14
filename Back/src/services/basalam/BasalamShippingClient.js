/**
 * Basalam Shipping Client
 * Handles communication with Basalam Shipping Methods API
 */

const axios = require('axios');
const basalamConfig = require('../../config/basalam');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('BasalamShippingClient');

class BasalamShippingClient {
  constructor() {
    this.baseUrl = basalamConfig.baseUrl;
    this.apiToken = basalamConfig.apiToken;
    this.vendorId = basalamConfig.vendorId;
    this.endpoints = basalamConfig.endpoints.shipping;
    this.retryConfig = basalamConfig.request;

    if (!this.apiToken) {
      logger.warn('BASALAM_API_TOKEN not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiToken && { Authorization: `Bearer ${this.apiToken}` }),
      },
      timeout: this.retryConfig.timeout,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('Request setup error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`API Response: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle API errors with detailed logging and user-friendly messages
   * @param {Error} error - Axios error object
   * @returns {Promise<never>}
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      logger.error('API Error Response', {
        status,
        data,
        url: error.config?.url,
      });

      // Create user-friendly error messages based on status
      let errorMessage;
      switch (status) {
        case 400:
          errorMessage = 'درخواست نامعتبر به سرویس بسلام';
          break;
        case 401:
          errorMessage = 'خطای احراز هویت با سرویس بسلام. لطفاً تنظیمات API را بررسی کنید';
          break;
        case 403:
          errorMessage = 'دسترسی به سرویس بسلام محدود شده است';
          break;
        case 404:
          errorMessage = 'روش ارسال مورد نظر در سرویس بسلام یافت نشد';
          break;
        case 429:
          errorMessage = 'تعداد درخواست‌ها به سرویس بسلام بیش از حد مجاز است. لطفاً کمی صبر کنید';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'سرویس بسلام در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید';
          break;
        default:
          errorMessage = data?.message || data?.error || 'خطا در ارتباط با سرویس بسلام';
      }

      const enhancedError = new Error(errorMessage);
      enhancedError.status = status;
      enhancedError.data = data;
      enhancedError.isBasalamError = true;
      enhancedError.originalMessage = data?.message || data?.error;

      throw enhancedError;
    } else if (error.request) {
      // Request made but no response received
      logger.error('No response from API', { error: error.message });
      const networkError = new Error('عدم دریافت پاسخ از سرویس بسلام. لطفاً اتصال اینترنت خود را بررسی کنید');
      networkError.isNetworkError = true;
      networkError.canUseCachedData = true; // Flag to indicate cached data can be used
      throw networkError;
    } else {
      // Error in request setup
      logger.error('Request setup error', { error: error.message });
      const setupError = new Error('خطا در برقراری ارتباط با سرویس بسلام');
      setupError.originalError = error;
      throw setupError;
    }
  }

  /**
   * Retry logic for API calls
   * @param {Function} fn - Function to retry
   * @param {number} retries - Number of retries
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise<any>}
   */
  async retryRequest(fn, retries = this.retryConfig.retries, delay = this.retryConfig.retryDelay) {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      logger.warn(`Retrying request, ${retries} attempts remaining`, {
        error: error.message,
        delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
  }

  /**
   * Get default shipping methods from Basalam API
   * Calls: GET /v1/shipping-methods/defaults
   * @param {string} token - Optional Basalam API token (overrides configured token)
   * @returns {Promise<Array>} Array of default shipping methods
   */
  async getDefaultShippingMethods(token = null) {
    logger.info('Fetching default shipping methods');

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await this.retryRequest(async () => {
        return await this.client.get(this.endpoints.defaults, { headers });
      });

      // Handle different response formats
      let shippingMethods = [];
      
      // Basalam API returns data in 'openapi_raw_data' key
      const responseData = response.data?.openapi_raw_data || response.data?.data || response.data;
      
      if (Array.isArray(responseData)) {
        shippingMethods = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // If response is an object, try to extract array from common keys
        shippingMethods = responseData.items || responseData.methods || responseData.shipping_methods || [];
        
        // If still not an array, convert object values to array
        if (!Array.isArray(shippingMethods) && typeof responseData === 'object') {
          shippingMethods = Object.values(responseData);
        }
      }
      
      logger.info('Default shipping methods fetched successfully', {
        count: Array.isArray(shippingMethods) ? shippingMethods.length : 0,
      });

      return this.transformShippingMethods(shippingMethods);
    } catch (error) {
      logger.error('Failed to fetch default shipping methods', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get shipping methods with optional filters
   * Calls: GET /v1/shipping-methods
   * @param {Object} options - Filter options
   * @param {Array<number>} options.ids - Filter by shipping method IDs
   * @param {Array<number>} options.vendorIds - Filter by vendor IDs
   * @param {number} options.page - Page number for pagination
   * @param {number} options.perPage - Items per page
   * @returns {Promise<Object>} Shipping methods list with pagination
   */
  async getShippingMethods(options = {}) {
    logger.info('Fetching shipping methods with filters', { options });

    try {
      const params = {};

      if (options.ids && options.ids.length > 0) {
        params.ids = options.ids.join(',');
      }

      if (options.vendorIds && options.vendorIds.length > 0) {
        params.vendor_ids = options.vendorIds.join(',');
      }

      if (options.page) {
        params.page = options.page;
      }

      if (options.perPage) {
        params.per_page = options.perPage;
      }

      const response = await this.retryRequest(async () => {
        return await this.client.get(this.endpoints.list, { params });
      });

      const data = response.data?.data || response.data || {};
      const shippingMethods = data.items || data.data || data || [];
      
      logger.info('Shipping methods fetched successfully', {
        count: shippingMethods.length,
        page: data.page || options.page,
        total: data.total,
      });

      return {
        data: this.transformShippingMethods(shippingMethods),
        pagination: {
          page: data.page || options.page || 1,
          perPage: data.per_page || options.perPage || 10,
          total: data.total || shippingMethods.length,
          totalPages: data.total_pages || Math.ceil((data.total || shippingMethods.length) / (data.per_page || options.perPage || 10)),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch shipping methods', {
        error: error.message,
        options,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get vendor-specific shipping methods
   * Calls: GET /v1/shipping-methods/vendor/:vendorId
   * @param {number} vendorId - Vendor ID (optional, uses configured vendor ID if not provided)
   * @returns {Promise<Array>} Array of vendor shipping methods
   */
  async getVendorShippingMethods(vendorId = null) {
    const targetVendorId = vendorId || this.vendorId;

    if (!targetVendorId) {
      const error = new Error('Vendor ID is required. Please provide vendorId or configure BASALAM_VENDOR_ID');
      logger.error('Vendor ID missing', { error: error.message });
      throw error;
    }

    logger.info('Fetching vendor shipping methods', { vendorId: targetVendorId });

    try {
      const endpoint = this.endpoints.vendor(targetVendorId);
      
      const response = await this.retryRequest(async () => {
        return await this.client.get(endpoint);
      });

      const shippingMethods = response.data?.data || response.data || [];
      
      logger.info('Vendor shipping methods fetched successfully', {
        vendorId: targetVendorId,
        count: shippingMethods.length,
      });

      return this.transformShippingMethods(shippingMethods);
    } catch (error) {
      logger.error('Failed to fetch vendor shipping methods', {
        vendorId: targetVendorId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Transform Basalam API response to internal format
   * @param {Array} shippingMethods - Raw shipping methods from API
   * @returns {Array} Transformed shipping methods
   */
  transformShippingMethods(shippingMethods) {
    if (!Array.isArray(shippingMethods)) {
      logger.warn('Invalid shipping methods data, expected array', {
        type: typeof shippingMethods,
      });
      return [];
    }

    return shippingMethods.map((method) => {
      try {
        return {
          basalamId: method.id,
          name: method.method?.name || method.name || 'Unknown',
          description: method.method?.description || method.description || null,
          baseCost: parseInt(method.base_cost || 0, 10),
          additionalCost: parseInt(method.additional_cost || 0, 10),
          additionalDimensionsCost: method.additional_dimensions_cost 
            ? parseInt(method.additional_dimensions_cost, 10) 
            : null,
          isPrivate: Boolean(method.is_private),
          rawData: method, // Keep original data for reference
        };
      } catch (error) {
        logger.error('Error transforming shipping method', {
          method,
          error: error.message,
        });
        return null;
      }
    }).filter(Boolean); // Remove null entries
  }
}

module.exports = BasalamShippingClient;
