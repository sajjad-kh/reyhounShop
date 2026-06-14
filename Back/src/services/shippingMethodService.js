/**
 * Shipping Method Service
 * Business logic for managing shipping methods
 */

const BasalamShippingClient = require('./basalam/BasalamShippingClient');
const shippingMethodRepository = require('../repositories/ShippingMethodRepository');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ShippingMethodService');

// 24 hours in milliseconds
const SYNC_INTERVAL = 24 * 60 * 60 * 1000;

class ShippingMethodService {
  constructor() {
    this.basalamClient = new BasalamShippingClient();
  }

  /**
   * Check if sync is needed (last sync > 24 hours)
   * @returns {Promise<boolean>} True if sync is needed
   */
  async shouldSync() {
    try {
      const lastSyncTime = await shippingMethodRepository.getLastSyncTime();
      
      if (!lastSyncTime) {
        logger.info('No previous sync found, sync needed');
        return true;
      }

      const timeSinceLastSync = Date.now() - lastSyncTime.getTime();
      const shouldSync = timeSinceLastSync >= SYNC_INTERVAL;

      logger.info('Sync check completed', {
        lastSyncTime,
        timeSinceLastSync,
        shouldSync,
      });

      return shouldSync;
    } catch (error) {
      logger.error('Error checking sync status', { error: error.message });
      // If we can't determine, assume sync is needed
      return true;
    }
  }

  /**
   * Fetch and cache shipping methods from Basalam
   * @param {string} basalamToken - Optional Basalam API token (uses configured token if not provided)
   * @returns {Promise<Array>} Array of synced shipping methods
   */
  async syncFromBasalam(basalamToken = null) {
    logger.info('Starting sync from Basalam API');

    try {
      // Fetch shipping methods from Basalam
      // If token is null, client will use configured token from environment
      const basalamMethods = await this.basalamClient.getDefaultShippingMethods(basalamToken);

      if (!basalamMethods || basalamMethods.length === 0) {
        logger.warn('No shipping methods received from Basalam');
        
        // If no methods received, check if we have cached data
        const cachedMethods = await shippingMethodRepository.findAll({ isActive: true });
        if (cachedMethods.length > 0) {
          logger.info(`Using ${cachedMethods.length} cached shipping methods`);
          return cachedMethods;
        }
        
        return [];
      }

      logger.info(`Fetched ${basalamMethods.length} shipping methods from Basalam`);

      // Upsert each shipping method to database
      const syncedMethods = [];
      const failedMethods = [];
      
      for (const method of basalamMethods) {
        try {
          // Transform to match repository format
          const methodData = {
            id: method.basalamId,
            method: {
              name: method.name,
              description: method.description,
            },
            base_cost: method.baseCost,
            additional_cost: method.additionalCost,
            additional_dimensions_cost: method.additionalDimensionsCost,
            is_private: method.isPrivate,
          };

          const syncedMethod = await shippingMethodRepository.upsertFromBasalam(methodData);
          syncedMethods.push(syncedMethod);
        } catch (error) {
          logger.error(`Failed to sync shipping method ${method.basalamId}`, {
            error: error.message,
            method,
          });
          failedMethods.push({ basalamId: method.basalamId, error: error.message });
        }
      }

      logger.info(`Successfully synced ${syncedMethods.length} shipping methods`, {
        failed: failedMethods.length,
        failedMethods: failedMethods.length > 0 ? failedMethods : undefined,
      });

      return syncedMethods;
    } catch (error) {
      logger.error('Failed to sync from Basalam', {
        error: error.message,
        stack: error.stack,
        isBasalamError: error.isBasalamError,
        isNetworkError: error.isNetworkError,
        canUseCachedData: error.canUseCachedData,
      });

      // If it's a network error or Basalam API error, try to use cached data
      if (error.isNetworkError || error.isBasalamError) {
        logger.info('Attempting to use cached shipping methods due to API error');
        
        try {
          const cachedMethods = await shippingMethodRepository.findAll({ isActive: true });
          
          if (cachedMethods.length > 0) {
            logger.info(`Using ${cachedMethods.length} cached shipping methods as fallback`);
            
            // Create a warning error that includes cached data
            const fallbackError = new Error(error.message);
            fallbackError.usedCachedData = true;
            fallbackError.cachedMethods = cachedMethods;
            fallbackError.originalError = error;
            
            throw fallbackError;
          }
        } catch (cacheError) {
          if (cacheError.usedCachedData) {
            // Re-throw the fallback error with cached data
            throw cacheError;
          }
          logger.error('Failed to retrieve cached shipping methods', {
            error: cacheError.message,
          });
        }
      }

      // If we can't use cached data, throw the original error
      const enhancedError = new Error(error.message);
      enhancedError.originalError = error;
      enhancedError.isBasalamError = error.isBasalamError;
      enhancedError.isNetworkError = error.isNetworkError;
      throw enhancedError;
    }
  }

  /**
   * Get all active shipping methods
   * @returns {Promise<Array>} List of active shipping methods
   */
  async getActiveShippingMethods() {
    try {
      logger.info('Fetching active shipping methods');

      const methods = await shippingMethodRepository.findAll({ isActive: true });

      logger.info(`Found ${methods.length} active shipping methods`);

      // If no methods found, check if sync is needed
      if (methods.length === 0) {
        logger.warn('No active shipping methods found in database');
        
        const shouldSyncNow = await this.shouldSync();
        if (shouldSyncNow) {
          logger.info('Attempting automatic sync due to empty shipping methods');
          try {
            const syncedMethods = await this.syncFromBasalam();
            if (syncedMethods.length > 0) {
              logger.info(`Auto-sync successful, returning ${syncedMethods.length} methods`);
              return syncedMethods;
            }
          } catch (syncError) {
            // If sync fails but has cached data, use it
            if (syncError.usedCachedData && syncError.cachedMethods) {
              logger.info('Using cached methods from failed sync attempt');
              return syncError.cachedMethods;
            }
            logger.error('Auto-sync failed', { error: syncError.message });
            // Continue to return empty array
          }
        }
      }

      return methods;
    } catch (error) {
      logger.error('Failed to fetch active shipping methods', {
        error: error.message,
        stack: error.stack,
      });
      
      const enhancedError = new Error('خطا در دریافت روش‌های ارسال. لطفاً دوباره تلاش کنید');
      enhancedError.originalError = error;
      enhancedError.status = 500;
      throw enhancedError;
    }
  }

  /**
   * Get shipping method by ID with caching
   * @param {number} id - Shipping method ID
   * @returns {Promise<Object>} Shipping method
   */
  async getShippingMethodById(id) {
    try {
      logger.info('Fetching shipping method by ID', { id });

      const method = await shippingMethodRepository.findById(id);

      if (!method) {
        const error = new Error(`Shipping method with ID ${id} not found`);
        error.status = 404;
        throw error;
      }

      logger.info('Shipping method found', { id, name: method.name });

      return method;
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }

      logger.error('Failed to fetch shipping method by ID', {
        id,
        error: error.message,
      });
      throw new Error(`Failed to get shipping method: ${error.message}`);
    }
  }

  /**
   * Get shipping methods for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} List of shipping methods for the product
   */
  async getProductShippingMethods(productId) {
    try {
      logger.info('Fetching shipping methods for product', { productId });

      const methods = await shippingMethodRepository.findByProductId(productId);

      logger.info(`Found ${methods.length} shipping methods for product`, { productId });

      return methods;
    } catch (error) {
      logger.error('Failed to fetch product shipping methods', {
        productId,
        error: error.message,
      });
      throw new Error(`Failed to get product shipping methods: ${error.message}`);
    }
  }

  /**
   * Update product's shipping methods
   * @param {number} productId - Product ID
   * @param {Array<number>} shippingMethodIds - Array of shipping method IDs
   * @returns {Promise<void>}
   */
  async updateProductShippingMethods(productId, shippingMethodIds) {
    try {
      logger.info('Updating product shipping methods', {
        productId,
        shippingMethodIds,
      });

      // Validation: Ensure at least one shipping method
      if (!shippingMethodIds || shippingMethodIds.length === 0) {
        const error = new Error('At least one shipping method must be selected');
        error.status = 400;
        throw error;
      }

      // Validate that all shipping method IDs exist
      for (const methodId of shippingMethodIds) {
        const exists = await shippingMethodRepository.exists(methodId);
        if (!exists) {
          const error = new Error(`Shipping method with ID ${methodId} not found`);
          error.status = 404;
          throw error;
        }
      }

      // Use Prisma client to update product shipping methods
      const { getPrismaClient } = require('../utils/database');
      const prisma = getPrismaClient();

      // Delete existing product shipping methods
      await prisma.productShippingMethod.deleteMany({
        where: { productId },
      });

      // Create new product shipping methods
      const createData = shippingMethodIds.map((shippingMethodId) => ({
        productId,
        shippingMethodId,
      }));

      await prisma.productShippingMethod.createMany({
        data: createData,
      });

      logger.info('Product shipping methods updated successfully', {
        productId,
        count: shippingMethodIds.length,
      });
    } catch (error) {
      if (error.status === 400 || error.status === 404) {
        throw error;
      }

      logger.error('Failed to update product shipping methods', {
        productId,
        shippingMethodIds,
        error: error.message,
      });
      throw new Error(`Failed to update product shipping methods: ${error.message}`);
    }
  }

  /**
   * Calculate shipping cost based on shipping method and order details
   * @param {number} shippingMethodId - Shipping method ID
   * @param {Object} orderDetails - Order details
   * @param {number} orderDetails.itemCount - Number of items in order
   * @param {boolean} orderDetails.hasLargeDimensions - Whether order has large dimensions
   * @returns {Promise<number>} Calculated shipping cost
   */
  async calculateShippingCost(shippingMethodId, orderDetails = {}) {
    try {
      logger.info('Calculating shipping cost', {
        shippingMethodId,
        orderDetails,
      });

      // Get shipping method
      const shippingMethod = await this.getShippingMethodById(shippingMethodId);

      // Start with base cost
      let totalCost = shippingMethod.baseCost;

      // Add additional cost per item (if more than 1 item)
      const itemCount = orderDetails.itemCount || 1;
      if (itemCount > 1) {
        totalCost += shippingMethod.additionalCost * (itemCount - 1);
      }

      // Add dimension cost if applicable
      if (orderDetails.hasLargeDimensions && shippingMethod.additionalDimensionsCost) {
        totalCost += shippingMethod.additionalDimensionsCost;
      }

      logger.info('Shipping cost calculated', {
        shippingMethodId,
        baseCost: shippingMethod.baseCost,
        additionalCost: shippingMethod.additionalCost,
        dimensionsCost: shippingMethod.additionalDimensionsCost,
        itemCount,
        totalCost,
      });

      return totalCost;
    } catch (error) {
      logger.error('Failed to calculate shipping cost', {
        shippingMethodId,
        orderDetails,
        error: error.message,
      });
      throw new Error(`Failed to calculate shipping cost: ${error.message}`);
    }
  }

  /**
   * Get usage statistics for shipping methods
   * @param {Object} dateRange - Optional date range filter
   * @param {Date|string} dateRange.startDate - Start date
   * @param {Date|string} dateRange.endDate - End date
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStatistics(dateRange = {}) {
    try {
      logger.info('Fetching usage statistics', { dateRange });

      // Convert string dates to Date objects if needed
      const filters = {};
      if (dateRange.startDate) {
        filters.startDate = dateRange.startDate instanceof Date 
          ? dateRange.startDate 
          : new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        filters.endDate = dateRange.endDate instanceof Date 
          ? dateRange.endDate 
          : new Date(dateRange.endDate);
      }

      // Get statistics from repository
      const stats = await shippingMethodRepository.getUsageStats(filters);

      logger.info('Usage statistics fetched successfully', {
        totalOrders: stats.totalOrders,
        methodCount: stats.statistics.length,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to fetch usage statistics', {
        dateRange,
        error: error.message,
      });
      throw new Error(`Failed to get usage statistics: ${error.message}`);
    }
  }

  /**
   * Create a new internal shipping method
   * @param {Object} data - Shipping method data
   * @returns {Promise<Object>} Created shipping method
   */
  async createInternalShippingMethod(data) {
    try {
      logger.info('Creating internal shipping method', { name: data.name });

      // Ensure basalamId is null for internal methods
      const shippingMethodData = {
        ...data,
        basalamId: null,
        lastSyncedAt: null,
      };

      const shippingMethod = await shippingMethodRepository.create(shippingMethodData);

      logger.info('Internal shipping method created successfully', {
        id: shippingMethod.id,
        name: shippingMethod.name,
      });

      return shippingMethod;
    } catch (error) {
      logger.error('Failed to create internal shipping method', {
        data,
        error: error.message,
      });
      throw new Error(`Failed to create shipping method: ${error.message}`);
    }
  }

  /**
   * Update a shipping method
   * @param {number} id - Shipping method ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated shipping method
   */
  async updateShippingMethod(id, data) {
    try {
      logger.info('Updating shipping method', { id, data });

      // Check if shipping method exists
      const existingMethod = await shippingMethodRepository.findById(id);
      if (!existingMethod) {
        throw new Error('SHIPPING_METHOD_NOT_FOUND');
      }

      // Don't allow updating basalamId
      const updateData = { ...data };
      delete updateData.basalamId;

      const shippingMethod = await shippingMethodRepository.update(id, updateData);

      logger.info('Shipping method updated successfully', {
        id: shippingMethod.id,
        name: shippingMethod.name,
      });

      return shippingMethod;
    } catch (error) {
      logger.error('Failed to update shipping method', {
        id,
        data,
        error: error.message,
      });
      
      if (error.message === 'SHIPPING_METHOD_NOT_FOUND') {
        const notFoundError = new Error('Shipping method not found');
        notFoundError.status = 404;
        throw notFoundError;
      }
      
      throw new Error(`Failed to update shipping method: ${error.message}`);
    }
  }

  /**
   * Delete a shipping method
   * @param {number} id - Shipping method ID
   * @returns {Promise<void>}
   */
  async deleteShippingMethod(id) {
    try {
      logger.info('Deleting shipping method', { id });

      // Check if shipping method exists
      const existingMethod = await shippingMethodRepository.findById(id);
      if (!existingMethod) {
        throw new Error('SHIPPING_METHOD_NOT_FOUND');
      }

      // Check if shipping method is in use
      const isInUse = await shippingMethodRepository.isInUse(id);
      if (isInUse) {
        throw new Error('SHIPPING_METHOD_IN_USE');
      }

      await shippingMethodRepository.delete(id);

      logger.info('Shipping method deleted successfully', { id });
    } catch (error) {
      logger.error('Failed to delete shipping method', {
        id,
        error: error.message,
      });
      
      if (error.message === 'SHIPPING_METHOD_NOT_FOUND') {
        const notFoundError = new Error('Shipping method not found');
        notFoundError.status = 404;
        throw notFoundError;
      }
      
      if (error.message === 'SHIPPING_METHOD_IN_USE') {
        const inUseError = new Error('Cannot delete shipping method that is in use');
        inUseError.status = 409;
        throw inUseError;
      }
      
      throw new Error(`Failed to delete shipping method: ${error.message}`);
    }
  }

  /**
   * Get shipping methods by source (basalam or internal)
   * @param {string} source - 'basalam' or 'internal'
   * @returns {Promise<Array>} Shipping methods
   */
  async getShippingMethodsBySource(source) {
    try {
      logger.info('Fetching shipping methods by source', { source });

      const filters = { isActive: true };
      
      if (source === 'basalam') {
        filters.hasBasalamId = true;
      } else if (source === 'internal') {
        filters.hasBasalamId = false;
      }

      const methods = await shippingMethodRepository.findAll(filters);

      logger.info('Shipping methods fetched by source', {
        source,
        count: methods.length,
      });

      return methods;
    } catch (error) {
      logger.error('Failed to fetch shipping methods by source', {
        source,
        error: error.message,
      });
      throw new Error(`Failed to get shipping methods: ${error.message}`);
    }
  }

  async getProductsShippingMethods(productIds) {
    const prisma = require('../utils/database').getPrismaClient();

    const rows = await prisma.productShippingMethod.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        shippingMethodId: true
      }
    });

    const map = {};

    for (const r of rows) {
      if (!map[r.productId]) map[r.productId] = [];
      map[r.productId].push(r.shippingMethodId);
    }

    return map;
  }

}

module.exports = new ShippingMethodService();
