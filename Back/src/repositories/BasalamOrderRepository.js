/**
 * Basalam Order Repository
 * Handles database operations for Basalam orders
 */

const { getPrismaClient } = require('../utils/database');

class BasalamOrderRepository {
  /**
   * Create a new Basalam order in database
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async create(orderData) {
    const {
      userId,
      basalamOrderId,
      orderNumber,
      status,
      totalAmount,
      itemsJson,
      shippingAddressJson,
      contactInfoJson,
      paymentUrl,
    } = orderData;

    return await getPrismaClient().basalamOrder.create({
      data: {
        userId,
        basalamOrderId,
        orderNumber: orderNumber || null,
        status,
        totalAmount,
        itemsJson,
        shippingAddressJson,
        contactInfoJson,
        paymentUrl: paymentUrl || null,
      },
    });
  }

  /**
   * Find order by ID
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (optional, for authorization)
   * @returns {Promise<Object|null>} Order or null
   */
  async findById(orderId, userId = null) {
    const where = { id: orderId };
    if (userId !== null) {
      where.userId = userId;
    }

    return await getPrismaClient().basalamOrder.findFirst({
      where,
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find order by Basalam order ID
   * @param {number} basalamOrderId - Basalam order ID
   * @returns {Promise<Object|null>} Order or null
   */
  async findByBasalamOrderId(basalamOrderId) {
    return await getPrismaClient().basalamOrder.findUnique({
      where: { basalamOrderId },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find orders by user ID with pagination and filtering
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders and pagination info
   */
  async findByUserId(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 50);

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      getPrismaClient().basalamOrder.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      getPrismaClient().basalamOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
        hasNext: skip + take < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Update order
   * @param {number} orderId - Order ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated order
   */
  async update(orderId, updateData) {
    return await getPrismaClient().basalamOrder.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  /**
   * Update order status
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update (optional)
   * @returns {Promise<Object>} Updated order
   */
  async updateStatus(orderId, status, additionalData = {}) {
    return await getPrismaClient().basalamOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Update payment information
   * @param {number} orderId - Order ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Updated order
   */
  async updatePayment(orderId, paymentData) {
    const { status, transactionId, paidAt } = paymentData;

    return await getPrismaClient().basalamOrder.update({
      where: { id: orderId },
      data: {
        status,
        paymentTransactionId: transactionId || null,
        paidAt: paidAt || null,
      },
    });
  }

  /**
   * Add status history entry
   * @param {number} orderId - Order ID
   * @param {string} status - Status
   * @param {string} note - Optional note
   * @returns {Promise<Object>} Created status history entry
   */
  async addStatusHistory(orderId, status, note = null) {
    return await getPrismaClient().basalamOrderStatusHistory.create({
      data: {
        orderId,
        status,
        note,
      },
    });
  }

  /**
   * Get status history for an order
   * @param {number} orderId - Order ID
   * @returns {Promise<Array>} Status history entries
   */
  async getStatusHistory(orderId) {
    return await getPrismaClient().basalamOrderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get orders that need status sync (active orders)
   * @param {Array<string>} activeStatuses - List of active statuses
   * @param {number} limit - Maximum number of orders to return
   * @returns {Promise<Array>} Orders that need sync
   */
  async findActiveOrders(activeStatuses = ['pending_payment', 'paid', 'processing', 'shipped'], limit = 100) {
    return await getPrismaClient().basalamOrder.findMany({
      where: {
        status: {
          in: activeStatuses,
        },
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
  }

  /**
   * Delete order (soft delete by updating status)
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Updated order
   */
  async softDelete(orderId) {
    return await getPrismaClient().basalamOrder.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
      },
    });
  }

  /**
   * Get order statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Order statistics
   */
  async getUserStatistics(userId) {
    const [totalOrders, totalSpent, statusCounts] = await Promise.all([
      getPrismaClient().basalamOrder.count({
        where: { userId },
      }),
      getPrismaClient().basalamOrder.aggregate({
        where: { userId },
        _sum: { totalAmount: true },
      }),
      getPrismaClient().basalamOrder.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
    ]);

    const statusCountsFormatted = {};
    statusCounts.forEach(item => {
      statusCountsFormatted[item.status] = item._count.status;
    });

    return {
      totalOrders,
      totalSpent: totalSpent._sum.totalAmount || 0,
      statusCounts: statusCountsFormatted,
    };
  }

  /**
   * Check if order exists and belongs to user
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if order exists and belongs to user
   */
  async existsForUser(orderId, userId) {
    const count = await getPrismaClient().basalamOrder.count({
      where: {
        id: orderId,
        userId,
      },
    });

    return count > 0;
  }

  /**
   * Get recent orders for a user
   * @param {number} userId - User ID
   * @param {number} limit - Number of orders to return
   * @returns {Promise<Array>} Recent orders
   */
  async getRecentOrders(userId, limit = 5) {
    return await getPrismaClient().basalamOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Batch update orders
   * @param {Array<number>} orderIds - Array of order IDs
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async batchUpdate(orderIds, updateData) {
    return await getPrismaClient().basalamOrder.updateMany({
      where: {
        id: {
          in: orderIds,
        },
      },
      data: updateData,
    });
  }
}

module.exports = new BasalamOrderRepository();
