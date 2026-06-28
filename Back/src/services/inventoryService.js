const { getPrismaClient } = require('../utils/database');

class InventoryService {
  /**
   * Get inventory status for all products
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Inventory data with pagination
   */
  async getInventoryStatus(options = {}) {
    const {
      lowStockOnly = false,
      categoryId,
      search,
      page = 1,
      limit = 50,
      sortBy = 'stock',
      sortOrder = 'asc'
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    // Build where clause
    const where = {};

    if (lowStockOnly) {
      where.OR = [
        { stock: { lte: getPrismaClient().product.fields.lowStockAlert } },
        { 
          stock: { 
            lte: { 
              add: [getPrismaClient().product.fields.reservedStock, getPrismaClient().product.fields.lowStockAlert] 
            } 
          } 
        }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Get products and total count
    const [products, total] = await Promise.all([
      getPrismaClient().product.findMany({
        where,
        select: {
          id: true,
          name: true,
          stock: true,
          reservedStock: true,
          lowStockAlert: true,
          price: true,
          category: {
            select: { id: true, name: true }
          },
          images: {
            where: { isMain: true },
            select: { url: true }
          }
        },
        orderBy,
        skip,
        take
      }),
      getPrismaClient().product.count({ where })
    ]);

    // Calculate inventory metrics
    const inventoryData = products.map(product => {
      const availableStock = product.stock - product.reservedStock;
      const isLowStock = availableStock <= product.lowStockAlert;
      const stockStatus = availableStock <= 0 ? 'OUT_OF_STOCK' : 
                         isLowStock ? 'LOW_STOCK' : 'IN_STOCK';

      return {
        ...product,
        availableStock,
        isLowStock,
        stockStatus,
        stockValue: product.stock * product.price,
        mainImage: product.images[0]?.url || null
      };
    });

    return {
      inventory: inventoryData,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
        hasNext: skip + take < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update product stock
   * @param {number} productId - Product ID
   * @param {Object} stockData - Stock update data
   * @param {number} userId - User ID for logging
   * @returns {Promise<Object>} Updated product
   */
  async updateStock(productId, stockData, userId) {
    const { stock, lowStockAlert, reason } = stockData;

    // Verify product exists
    const product = await getPrismaClient().product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    // Calculate stock change
    const stockChange = stock - product.stock;

    // Update product stock
    const updatedProduct = await getPrismaClient().product.update({
      where: { id: productId },
      data: {
        stock,
        ...(lowStockAlert !== undefined && { lowStockAlert })
      },
      include: {
        category: true
      }
    });

    // Log inventory activity
    await this.logActivity({
      userId,
      action: ActivityAction.PRODUCT_UPDATED,
      entity: 'Product',
      entityId: productId,
      metadata: {
        previousStock: product.stock,
        newStock: stock,
        stockChange,
        reason: reason || 'Manual update',
        lowStockAlert: updatedProduct.lowStockAlert,
        event: 'inventory_stock_updated'
      }
    });

    return {
      ...updatedProduct,
      availableStock: updatedProduct.stock - updatedProduct.reservedStock,
      stockChange
    };
  }

  /**
   * Bulk update stock for multiple products
   * @param {Array} stockUpdates - Array of stock updates
   * @param {number} userId - User ID for logging
   * @returns {Promise<Array>} Updated products
   */
  async bulkUpdateStock(stockUpdates, userId) {
    const results = [];
    const errors = [];

    for (const update of stockUpdates) {
      try {
        const result = await this.updateStock(update.productId, update, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    return { results, errors };
  }

  /**
   * Reserve stock for order
   * @param {Array} items - Order items with productId and quantity
   * @param {string} orderId - Order ID for tracking
   * @returns {Promise<Object>} Reservation result
   */
  async reserveStock(items, orderId) {
    const reservations = [];
    const failures = [];

    // Use transaction to ensure atomicity
    await getPrismaClient().$transaction(async (tx) => {
      for (const item of items) {
        const { productId, quantity } = item;

        // Get current product stock
        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (!product) {
          failures.push({
            productId,
            error: 'PRODUCT_NOT_FOUND'
          });
          continue;
        }

        const availableStock = product.stock - product.reservedStock;
        
        if (availableStock < quantity) {
          failures.push({
            productId,
            error: 'INSUFFICIENT_STOCK',
            available: availableStock,
            requested: quantity
          });
          continue;
        }

        // Reserve stock
        await tx.product.update({
          where: { id: productId },
          data: {
            reservedStock: product.reservedStock + quantity
          }
        });

        reservations.push({
          productId,
          quantity,
          previousReserved: product.reservedStock,
          newReserved: product.reservedStock + quantity
        });
      }

      // If any failures, rollback transaction
      if (failures.length > 0) {
        throw new Error('STOCK_RESERVATION_FAILED');
      }
    });

    // Log reservation activity
    await this.logActivity(null, 'inventory.stock_reserved', 'Order', orderId, {
      reservations,
      totalItems: items.length
    });

    return { reservations, failures };
  }

  /**
   * Release reserved stock
   * @param {Array} items - Order items with productId and quantity
   * @param {string} orderId - Order ID for tracking
   * @param {string} reason - Reason for release
   * @returns {Promise<Object>} Release result
   */
  async releaseStock(items, orderId, reason = 'Order cancelled') {
    const releases = [];

    await getPrismaClient().$transaction(async (tx) => {
      for (const item of items) {
        const { productId, quantity } = item;

        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (product) {
          const newReservedStock = Math.max(0, product.reservedStock - quantity);
          
          await tx.product.update({
            where: { id: productId },
            data: {
              reservedStock: newReservedStock
            }
          });

          releases.push({
            productId,
            quantity,
            previousReserved: product.reservedStock,
            newReserved: newReservedStock
          });
        }
      }
    });

    // Log release activity
    await this.logActivity({
      userId: null,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Order',
      entityId: orderId,
      metadata: {
        releases,
        reason,
        totalItems: items.length,
        event: 'inventory_stock_released'
      }
    });

    return { releases };
  }

  /**
   * Confirm stock (convert reserved to sold)
   * @param {Array} items - Order items with productId and quantity
   * @param {string} orderId - Order ID for tracking
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmStock(items, orderId) {
    const confirmations = [];

    await getPrismaClient().$transaction(async (tx) => {
      for (const item of items) {
        const { productId, quantity } = item;

        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (product) {
          const newStock = product.stock - quantity;
          const newReservedStock = Math.max(0, product.reservedStock - quantity);
          
          await tx.product.update({
            where: { id: productId },
            data: {
              stock: newStock,
              reservedStock: newReservedStock
            }
          });

          confirmations.push({
            productId,
            quantity,
            previousStock: product.stock,
            newStock,
            previousReserved: product.reservedStock,
            newReserved: newReservedStock
          });
        }
      }
    });

    // Log confirmation activity
    await this.logActivity({
      userId: null,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Order',
      entityId: orderId,
      metadata: {
        confirmations,
        totalItems: items.length,
        event: 'inventory_stock_confirmed'
      }
    });

    return { confirmations };
  }

  /**
   * Get low stock alerts
   * @returns {Promise<Array>} Products with low stock
   */
  async getLowStockAlerts() {
    const products = await getPrismaClient().product.findMany({
      where: {
        OR: [
          { stock: { lte: getPrismaClient().product.fields.lowStockAlert } },
          { 
            stock: { 
              lte: { 
                add: [getPrismaClient().product.fields.reservedStock, getPrismaClient().product.fields.lowStockAlert] 
              } 
            } 
          }
        ]
      },
      include: {
        category: true
      },
      orderBy: { stock: 'asc' }
    });

    return products.map(product => ({
      ...product,
      availableStock: product.stock - product.reservedStock,
      alertLevel: product.stock <= 0 ? 'CRITICAL' : 
                 product.stock <= product.lowStockAlert ? 'WARNING' : 'LOW'
    }));
  }

  /**
   * Get inventory statistics
   * @returns {Promise<Object>} Inventory statistics
   */
  async getInventoryStats() {
    const [
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue
    ] = await Promise.all([
      getPrismaClient().product.count(),
      getPrismaClient().product.count({
        where: { stock: { gt: 0 } }
      }),
      getPrismaClient().product.count({
        where: {
          OR: [
            { stock: { lte: getPrismaClient().product.fields.lowStockAlert } },
            { 
              stock: { 
                lte: { 
                  add: [getPrismaClient().product.fields.reservedStock, getPrismaClient().product.fields.lowStockAlert] 
                } 
              } 
            }
          ]
        }
      }),
      getPrismaClient().product.count({
        where: { stock: { lte: 0 } }
      }),
      getPrismaClient().product.aggregate({
        _sum: {
          stock: true
        }
      })
    ]);

    // Calculate total stock value (simplified - would need price * stock aggregation)
    const products = await getPrismaClient().product.findMany({
      select: { stock: true, price: true }
    });
    
    const stockValue = products.reduce((total, product) => 
      total + (product.stock * product.price), 0
    );

    return {
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockUnits: totalStockValue._sum.stock || 0,
      totalStockValue: stockValue,
      stockDistribution: {
        inStock: ((inStockProducts / totalProducts) * 100).toFixed(1),
        lowStock: ((lowStockProducts / totalProducts) * 100).toFixed(1),
        outOfStock: ((outOfStockProducts / totalProducts) * 100).toFixed(1)
      }
    };
  }

  /**
   * Log activity
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number|string} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  async logActivity(userId, action, entity, entityId, details = {}) {
    try {
      await getPrismaClient().activityLog.create({
        data: {
          userId,
          action,
          entity,
          entityId: typeof entityId === 'string' ? null : entityId,
          details: {
            ...details,
            ...(typeof entityId === 'string' && { orderId: entityId })
          }
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

module.exports = new InventoryService();
