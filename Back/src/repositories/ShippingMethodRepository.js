/**
 * Shipping Method Repository
 * Handles database operations for shipping methods
 */

const { getPrismaClient } = require('../utils/database');

class ShippingMethodRepository {
  /**
   * Find all shipping methods with optional filters
   * @param {Object} filters - Filter options
   * @param {boolean} filters.isActive - Filter by active status
   * @param {boolean} filters.hasBasalamId - Filter by source (true=basalam, false=internal)
   * @returns {Promise<Array>} List of shipping methods
   */
  async findAll(filters = {}) {
    const where = {};
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.hasBasalamId !== undefined) {
      if (filters.hasBasalamId) {
        where.basalamId = { not: null };
      } else {
        where.basalamId = null;
      }
    }

    return await getPrismaClient().shippingMethod.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find shipping method by ID
   * @param {number} id - Shipping method ID
   * @returns {Promise<Object|null>} Shipping method or null
   */
  async findById(id) {
    return await getPrismaClient().shippingMethod.findUnique({
      where: { id },
    });
  }

  /**
   * Find shipping method by Basalam ID
   * @param {number} basalamId - Basalam shipping method ID
   * @returns {Promise<Object|null>} Shipping method or null
   */
  async findByBasalamId(basalamId) {
    return await getPrismaClient().shippingMethod.findUnique({
      where: { basalamId },
    });
  }

  /**
   * Create a new shipping method
   * @param {Object} data - Shipping method data
   * @returns {Promise<Object>} Created shipping method
   */
  async create(data) {
    const {
      basalamId,
      name,
      description,
      baseCost,
      additionalCost,
      additionalDimensionsCost,
      isPrivate,
      isActive,
    } = data;

    return await getPrismaClient().shippingMethod.create({
      data: {
        basalamId,
        name,
        description: description || null,
        baseCost,
        additionalCost,
        additionalDimensionsCost: additionalDimensionsCost || null,
        isPrivate: isPrivate !== undefined ? isPrivate : false,
        isActive: isActive !== undefined ? isActive : true,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Update shipping method
   * @param {number} id - Shipping method ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated shipping method
   */
  async update(id, data) {
    const updateData = { ...data };
    
    // Update lastSyncedAt if data is being updated
    updateData.lastSyncedAt = new Date();

    return await getPrismaClient().shippingMethod.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Upsert shipping method from Basalam data
   * Creates if doesn't exist, updates if exists
   * @param {Object} basalamData - Basalam shipping method data
   * @returns {Promise<Object>} Upserted shipping method
   */
  async upsertFromBasalam(basalamData) {
    const {
      id: basalamId,
      method,
      base_cost,
      additional_cost,
      additional_dimensions_cost,
      is_private,
    } = basalamData;

    // Extract name from method object
    const name = typeof method === 'object' ? method.name : String(method);
    const description = typeof method === 'object' ? method.description : null;

    return await getPrismaClient().shippingMethod.upsert({
      where: { basalamId },
      create: {
        basalamId,
        name,
        description,
        baseCost: base_cost,
        additionalCost: additional_cost,
        additionalDimensionsCost: additional_dimensions_cost || null,
        isPrivate: is_private || false,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      update: {
        name,
        description,
        baseCost: base_cost,
        additionalCost: additional_cost,
        additionalDimensionsCost: additional_dimensions_cost || null,
        isPrivate: is_private || false,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Get last sync time
   * Returns the most recent lastSyncedAt timestamp
   * @returns {Promise<Date|null>} Last sync time or null
   */
  async getLastSyncTime() {
    const result = await getPrismaClient().shippingMethod.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });

    return result ? result.lastSyncedAt : null;
  }

  /**
   * Get usage statistics for shipping methods
   * @param {Object} dateRange - Optional date range filter
   * @param {Date} dateRange.startDate - Start date
   * @param {Date} dateRange.endDate - End date
   * @returns {Promise<Array>} Usage statistics
   */
  async getUsageStats(dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    // Build where clause for orders
    const orderWhere = {
      shippingMethodId: { not: null },
    };

    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) {
        orderWhere.createdAt.gte = startDate;
      }
      if (endDate) {
        orderWhere.createdAt.lte = endDate;
      }
    }

    // Get total count of orders with shipping methods
    const totalOrders = await getPrismaClient().order.count({
      where: orderWhere,
    });

    // Group orders by shipping method and count
    const usageByMethod = await getPrismaClient().order.groupBy({
      by: ['shippingMethodId'],
      where: orderWhere,
      _count: {
        shippingMethodId: true,
      },
      orderBy: {
        _count: {
          shippingMethodId: 'desc',
        },
      },
    });

    // Fetch shipping method details for each usage stat
    const stats = await Promise.all(
      usageByMethod.map(async (stat) => {
        const shippingMethod = await getPrismaClient().shippingMethod.findUnique({
          where: { id: stat.shippingMethodId },
          select: {
            id: true,
            name: true,
            basalamId: true,
          },
        });

        const usageCount = stat._count.shippingMethodId;
        const usagePercentage = totalOrders > 0 
          ? ((usageCount / totalOrders) * 100).toFixed(2)
          : '0.00';

        return {
          shippingMethodId: stat.shippingMethodId,
          shippingMethodName: shippingMethod?.name || 'Unknown',
          basalamId: shippingMethod?.basalamId || null,
          usageCount,
          usagePercentage: parseFloat(usagePercentage),
        };
      })
    );

    return {
      totalOrders,
      statistics: stats,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  /**
   * Get shipping methods for a specific product
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} List of shipping methods
   */
  async findByProductId(productId) {
    const productShippingMethods = await getPrismaClient().productShippingMethod.findMany({
      where: { productId },
      include: {
        shippingMethod: true,
      },
    });

    return productShippingMethods.map(psm => psm.shippingMethod);
  }

  /**
   * Check if shipping method exists
   * @param {number} id - Shipping method ID
   * @returns {Promise<boolean>} True if exists
   */
  async exists(id) {
    const count = await getPrismaClient().shippingMethod.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Check if shipping method exists by Basalam ID
   * @param {number} basalamId - Basalam shipping method ID
   * @returns {Promise<boolean>} True if exists
   */
  async existsByBasalamId(basalamId) {
    const count = await getPrismaClient().shippingMethod.count({
      where: { basalamId },
    });

    return count > 0;
  }

  /**
   * Deactivate shipping method
   * @param {number} id - Shipping method ID
   * @returns {Promise<Object>} Updated shipping method
   */
  async deactivate(id) {
    return await getPrismaClient().shippingMethod.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate shipping method
   * @param {number} id - Shipping method ID
   * @returns {Promise<Object>} Updated shipping method
   */
  async activate(id) {
    return await getPrismaClient().shippingMethod.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Batch upsert shipping methods from Basalam
   * @param {Array} basalamDataArray - Array of Basalam shipping method data
   * @returns {Promise<Array>} Array of upserted shipping methods
   */
  async batchUpsertFromBasalam(basalamDataArray) {
    const results = [];

    for (const basalamData of basalamDataArray) {
      try {
        const result = await this.upsertFromBasalam(basalamData);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upsert shipping method ${basalamData.id}:`, error);
        // Continue with other items even if one fails
      }
    }

    return results;
  }

  /**
   * Get count of active shipping methods
   * @returns {Promise<number>} Count of active shipping methods
   */
  async countActive() {
    return await getPrismaClient().shippingMethod.count({
      where: { isActive: true },
    });
  }

  /**
   * Get count of all shipping methods
   * @returns {Promise<number>} Total count
   */
  async count() {
    return await getPrismaClient().shippingMethod.count();
  }

  /**
   * Delete a shipping method
   * @param {number} id - Shipping method ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await getPrismaClient().shippingMethod.delete({
      where: { id },
    });
  }

  /**
   * Check if shipping method is in use (has orders or products)
   * @param {number} id - Shipping method ID
   * @returns {Promise<boolean>} True if in use
   */
  async isInUse(id) {
    const prisma = getPrismaClient();

    // Check if any orders use this shipping method
    const orderCount = await prisma.order.count({
      where: { shippingMethodId: id },
    });

    if (orderCount > 0) {
      return true;
    }

    // Check if any products use this shipping method
    const productCount = await prisma.productShippingMethod.count({
      where: { shippingMethodId: id },
    });

    return productCount > 0;
  }
}

module.exports = new ShippingMethodRepository();
