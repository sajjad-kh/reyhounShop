const express = require('express');
const adminService = require('../../../services/adminService');
const { authenticateToken, requireRole } = require('../../../middleware/auth');
const { query, validationResult } = require('express-validator');
const { getPrismaClient } = require('../../../utils/database');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/reports/sales:
 *   get:
 *     summary: Generate sales reports with date range filtering
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: day
 *         description: Group sales data by time period
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed order information
 *     responses:
 *       200:
 *         description: Sales report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: integer
 *                         totalOrders:
 *                           type: integer
 *                         averageOrderValue:
 *                           type: number
 *                         totalItems:
 *                           type: integer
 *                     timeSeries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                           revenue:
 *                             type: integer
 *                           orders:
 *                             type: integer
 *                           averageOrderValue:
 *                             type: number
 *                     topProducts:
 *                       type: array
 *                     paymentMethods:
 *                       type: object
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/sales',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('groupBy').optional().isIn(['day', 'week', 'month', 'year']),
    query('includeDetails').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days ago
        endDate = new Date(),
        groupBy = 'day',
        includeDetails = false
      } = req.query;

      const salesReport = await generateSalesReport(startDate, endDate, groupBy, includeDetails);

      res.json({
        success: true,
        data: salesReport
      });
    } catch (error) {
      console.error('Sales report error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate sales report'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/reports/inventory:
 *   get:
 *     summary: Generate inventory reports with stock levels and alerts
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: lowStockOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only low stock items
 *       - in: query
 *         name: outOfStockOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only out of stock items
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [stock, name, category, lastUpdated]
 *           default: stock
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Inventory report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProducts:
 *                           type: integer
 *                         lowStockCount:
 *                           type: integer
 *                         outOfStockCount:
 *                           type: integer
 *                         totalValue:
 *                           type: integer
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           stock:
 *                             type: integer
 *                           reservedStock:
 *                             type: integer
 *                           availableStock:
 *                             type: integer
 *                           lowStockAlert:
 *                             type: integer
 *                           price:
 *                             type: integer
 *                           category:
 *                             type: object
 *                           status:
 *                             type: string
 *                             enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK]
 *                     categoryBreakdown:
 *                       type: array
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/inventory',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    query('categoryId').optional().isInt({ min: 1 }),
    query('lowStockOnly').optional().isBoolean(),
    query('outOfStockOnly').optional().isBoolean(),
    query('sortBy').optional().isIn(['stock', 'name', 'category', 'lastUpdated']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const inventoryReport = await generateInventoryReport(req.query);

      res.json({
        success: true,
        data: inventoryReport
      });
    } catch (error) {
      console.error('Inventory report error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate inventory report'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/admin/reports/customers:
 *   get:
 *     summary: Generate customer activity and engagement reports
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [all, new, returning, high_value, inactive]
 *           default: all
 *         description: Customer segment to analyze
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed customer information
 *     responses:
 *       200:
 *         description: Customer report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCustomers:
 *                           type: integer
 *                         newCustomers:
 *                           type: integer
 *                         returningCustomers:
 *                           type: integer
 *                         averageOrderValue:
 *                           type: number
 *                         customerLifetimeValue:
 *                           type: number
 *                     segments:
 *                       type: object
 *                     topCustomers:
 *                       type: array
 *                     activityTrends:
 *                       type: array
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get('/customers',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('segment').optional().isIn(['all', 'new', 'returning', 'high_value', 'inactive']),
    query('includeDetails').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array()
          }
        });
      }

      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default: 90 days ago
        endDate = new Date(),
        segment = 'all',
        includeDetails = false
      } = req.query;

      const customerReport = await generateCustomerReport(startDate, endDate, segment, includeDetails);

      res.json({
        success: true,
        data: customerReport
      });
    } catch (error) {
      console.error('Customer report error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate customer report'
        }
      });
    }
  }
);

/**
 * Generate sales report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} groupBy - Group by period
 * @param {boolean} includeDetails - Include detailed information
 * @returns {Promise<Object>} Sales report
 */
async function generateSalesReport(startDate, endDate, groupBy, includeDetails) {
  // Get summary statistics
  const [totalStats, ordersByStatus, topProducts, paymentStats] = await Promise.all([
    getPrismaClient().order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: 'SUCCESS'
      },
      _sum: { totalPrice: true },
      _count: { id: true }
    }),
    
    getPrismaClient().order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _count: { status: true }
    }),
    
    adminService.getTopSellingProducts(10),
    
    getPrismaClient().payment.groupBy({
      by: ['gateway'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'SUCCESS'
      },
      _count: { gateway: true },
      _sum: { amount: true }
    })
  ]);

  // Generate time series data
  const timeSeries = await generateTimeSeries(startDate, endDate, groupBy);

  // Get total items sold
  const totalItems = await getPrismaClient().orderItem.aggregate({
    where: {
      order: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: 'SUCCESS'
      }
    },
    _sum: { quantity: true }
  });

  const summary = {
    totalRevenue: totalStats._sum.totalPrice || 0,
    totalOrders: totalStats._count.id || 0,
    averageOrderValue: totalStats._count.id > 0 ? 
      Math.round((totalStats._sum.totalPrice || 0) / totalStats._count.id) : 0,
    totalItems: totalItems._sum.quantity || 0,
    dateRange: {
      startDate,
      endDate
    }
  };

  const orderStatusCounts = {};
  ordersByStatus.forEach(item => {
    orderStatusCounts[item.status] = item._count.status;
  });

  const paymentMethodStats = {};
  paymentStats.forEach(item => {
    paymentMethodStats[item.gateway] = {
      count: item._count.gateway,
      totalAmount: item._sum.amount || 0
    };
  });

  const report = {
    summary,
    timeSeries,
    topProducts,
    ordersByStatus: orderStatusCounts,
    paymentMethods: paymentMethodStats
  };

  if (includeDetails) {
    // Add detailed order information
    const detailedOrders = await getPrismaClient().order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: 'SUCCESS'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    report.detailedOrders = detailedOrders;
  }

  return report;
}

/**
 * Generate inventory report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Inventory report
 */
async function generateInventoryReport(options) {
  const {
    categoryId,
    lowStockOnly = false,
    outOfStockOnly = false,
    sortBy = 'stock',
    sortOrder = 'asc'
  } = options;

  // Build where clause
  const where = {};
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (lowStockOnly) where.stock = { lte: getPrismaClient().product.fields.lowStockAlert };
  if (outOfStockOnly) where.stock = 0;

  // Get products with inventory information
  const products = await getPrismaClient().product.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true }
      }
    },
    orderBy: { [sortBy]: sortOrder }
  });

  // Calculate summary statistics
  const summary = {
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock <= p.lowStockAlert && p.stock > 0).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  };

  // Format products with status
  const formattedProducts = products.map(product => {
    const availableStock = product.stock - product.reservedStock;
    let status = 'IN_STOCK';
    
    if (product.stock === 0) {
      status = 'OUT_OF_STOCK';
    } else if (product.stock <= product.lowStockAlert) {
      status = 'LOW_STOCK';
    }

    return {
      id: product.id,
      name: product.name,
      stock: product.stock,
      reservedStock: product.reservedStock,
      availableStock,
      lowStockAlert: product.lowStockAlert,
      price: product.price,
      category: product.category,
      status,
      totalValue: product.price * product.stock,
      updatedAt: product.updatedAt
    };
  });

  // Generate category breakdown
  const categoryBreakdown = await getPrismaClient().product.groupBy({
    by: ['categoryId'],
    _count: { categoryId: true },
    _sum: { stock: true },
    _avg: { stock: true }
  });

  const categoryDetails = await getPrismaClient().category.findMany({
    where: {
      id: { in: categoryBreakdown.map(cb => cb.categoryId) }
    }
  });

  const categoryBreakdownFormatted = categoryBreakdown.map(cb => {
    const category = categoryDetails.find(c => c.id === cb.categoryId);
    return {
      category: {
        id: cb.categoryId,
        name: category?.name || 'Unknown'
      },
      productCount: cb._count.categoryId,
      totalStock: cb._sum.stock || 0,
      averageStock: Math.round(cb._avg.stock || 0)
    };
  });

  return {
    summary,
    products: formattedProducts,
    categoryBreakdown: categoryBreakdownFormatted
  };
}

/**
 * Generate customer report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} segment - Customer segment
 * @param {boolean} includeDetails - Include detailed information
 * @returns {Promise<Object>} Customer report
 */
async function generateCustomerReport(startDate, endDate, segment, includeDetails) {
  // Get customer statistics
  const [totalCustomers, newCustomers, customerOrderStats, topCustomers] = await Promise.all([
    getPrismaClient().user.count({
      where: { role: 'USER', isActive: true }
    }),
    
    getPrismaClient().user.count({
      where: {
        role: 'USER',
        isActive: true,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    getPrismaClient().order.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: 'SUCCESS'
      },
      _count: { userId: true },
      _sum: { totalPrice: true }
    }),
    
    getPrismaClient().user.findMany({
      where: { role: 'USER', isActive: true },
      include: {
        _count: {
          select: { orders: true }
        },
        orders: {
          where: { paymentStatus: 'SUCCESS' },
          select: { totalPrice: true }
        }
      },
      take: 10
    })
  ]);

  // Calculate customer metrics
  const totalRevenue = customerOrderStats.reduce((sum, stat) => sum + (stat._sum.totalPrice || 0), 0);
  const totalOrders = customerOrderStats.reduce((sum, stat) => sum + stat._count.userId, 0);
  
  const returningCustomers = customerOrderStats.filter(stat => stat._count.userId > 1).length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const customerLifetimeValue = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

  // Format top customers
  const topCustomersFormatted = topCustomers
    .map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalPrice, 0);
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalOrders: customer._count.orders,
        totalSpent,
        loyaltyPoints: customer.loyaltyPoints,
        registeredAt: customer.createdAt
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Customer segments
  const segments = {
    new: newCustomers,
    returning: returningCustomers,
    highValue: customerOrderStats.filter(stat => (stat._sum.totalPrice || 0) > averageOrderValue * 2).length,
    inactive: totalCustomers - customerOrderStats.length
  };

  // Generate activity trends (simplified)
  const activityTrends = await generateCustomerActivityTrends(startDate, endDate);

  const summary = {
    totalCustomers,
    newCustomers,
    returningCustomers,
    averageOrderValue,
    customerLifetimeValue,
    dateRange: {
      startDate,
      endDate
    }
  };

  const report = {
    summary,
    segments,
    topCustomers: topCustomersFormatted,
    activityTrends
  };

  if (includeDetails) {
    // Add detailed customer segmentation
    report.detailedSegments = await getDetailedCustomerSegments(startDate, endDate);
  }

  return report;
}

/**
 * Generate time series data for sales
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} groupBy - Group by period
 * @returns {Promise<Array>} Time series data
 */
async function generateTimeSeries(startDate, endDate, groupBy) {
  // This is a simplified implementation
  // In a real application, you might want to use more sophisticated date grouping
  
  const orders = await getPrismaClient().order.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      paymentStatus: 'SUCCESS'
    },
    select: {
      createdAt: true,
      totalPrice: true
    }
  });

  // Group orders by date
  const groupedData = {};
  
  orders.forEach(order => {
    let key;
    const date = new Date(order.createdAt);
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!groupedData[key]) {
      groupedData[key] = { revenue: 0, orders: 0 };
    }
    
    groupedData[key].revenue += order.totalPrice;
    groupedData[key].orders += 1;
  });

  // Convert to array and calculate averages
  return Object.entries(groupedData).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    orders: data.orders,
    averageOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0
  })).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Generate customer activity trends
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Activity trends
 */
async function generateCustomerActivityTrends(startDate, endDate) {
  // Simplified implementation - in reality you might want more sophisticated analysis
  const activities = await getPrismaClient().activityLog.groupBy({
    by: ['action'],
    where: {
      createdAt: { gte: startDate, lte: endDate },
      userId: { not: null }
    },
    _count: { action: true }
  });

  return activities.map(activity => ({
    action: activity.action,
    count: activity._count.action
  })).sort((a, b) => b.count - a.count);
}

/**
 * Get detailed customer segments
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Detailed segments
 */
async function getDetailedCustomerSegments(startDate, endDate) {
  // This would include more detailed segmentation logic
  // For now, return a simplified version
  return {
    newCustomers: [],
    returningCustomers: [],
    highValueCustomers: [],
    inactiveCustomers: []
  };
}

module.exports = router;
