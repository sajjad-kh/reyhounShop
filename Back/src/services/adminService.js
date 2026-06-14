const { getPrismaClient } = require('../utils/database');



class AdminService {

  // =========================
  // 🔥 SHARED TIMELINE BUILDER
  // =========================
  buildOrderTimeline(order) {
    return [
      ...(order.messages || []).map(m => ({
        type: 'MESSAGE',
        createdAt: m.createdAt,
        data: {
          id: m.id,
          message: m.message,
          isAdmin: m.isAdmin,
          user: m.user
        }
      })),

      ...(order.statusHistory || []).map(s => ({
        type: 'STATUS',
        createdAt: s.createdAt,
        data: {
          id: s.id,
          fromStatus: s.fromStatus,
          toStatus: s.toStatus,
          note: s.note,
          changedBy: s.changedBy
        }
      })),

      ...(order.activityLogs || []).map(a => ({
        type: 'ACTIVITY',
        createdAt: a.createdAt,
        data: {
          id: a.id,
          action: a.action,
          entity: a.entity,
          entityId: a.entityId,
          details: a.details,
          user: a.user
        }
      })),

      ...(order.designVersions || []).map(v => ({
        type: 'DESIGN',
        createdAt: v.createdAt,
        data: {
          id: v.id,
          version: v.version,
          fileUrl: v.fileUrl,
          status: v.status,
          isFinal: v.isFinal,
          designer: v.designer
        }
      }))
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }


  /**
   * Get dashboard statistics and metrics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [
        totalOrders,
        todayOrders,
        monthlyOrders,
        ordersByStatus,
        
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        yearlyRevenue,
        
        totalUsers,
        todayRegistrations,
        monthlyRegistrations,
        activeUsers,
        
        totalProducts,
        basalamProducts,
        internalProducts,
        lowStockProducts,
        outOfStockProducts,
        topSellingProducts,
        
        recentOrders,
        pendingReviews,
        
        paymentStats,
        salesDataRaw // نام متغیر در دریافت کاملاً هماهنگ شد
      ] = await Promise.all([
        getPrismaClient().order.count(),
        getPrismaClient().order.count({
          where: { createdAt: { gte: startOfToday } }
        }),
        getPrismaClient().order.count({
          where: { createdAt: { gte: startOfMonth } }
        }),
        getPrismaClient().order.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        
        getPrismaClient().order.aggregate({
          where: { paymentStatus: 'SUCCESS' },
          _sum: { totalPrice: true }
        }),
        getPrismaClient().order.aggregate({
          where: {
            paymentStatus: 'SUCCESS',
            createdAt: { gte: startOfToday }
          },
          _sum: { totalPrice: true }
        }),
        getPrismaClient().order.aggregate({
          where: {
            paymentStatus: 'SUCCESS',
            createdAt: { gte: startOfMonth }
          },
          _sum: { totalPrice: true }
        }),
        getPrismaClient().order.aggregate({
          where: {
            paymentStatus: 'SUCCESS',
            createdAt: { gte: startOfYear }
          },
          _sum: { totalPrice: true }
        }),
        
        getPrismaClient().user.count(), 
        getPrismaClient().user.count({
          where: { createdAt: { gte: startOfToday } }
        }),
        getPrismaClient().user.count({
          where: { createdAt: { gte: startOfMonth } }
        }),
        getPrismaClient().user.count({
          where: { updatedAt: { gte: thirtyDaysAgo } }
        }),
        
        getPrismaClient().product.count(),
        getPrismaClient().product.count({
          where: { name: { contains: 'Basalam-' } }
        }),
        getPrismaClient().product.count({
          where: { name: { not: { contains: 'Basalam-' } } }
        }),
        getPrismaClient().product.count({
          where: { stock: { lte: getPrismaClient().product.fields.lowStockAlert } }
        }),
        getPrismaClient().product.count({
          where: { stock: 0 }
        }),
        this.getTopSellingProducts(5),
        
        getPrismaClient().order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }),
        getPrismaClient().review.count({
          where: { isApproved: false }
        }),
        
        this.getPaymentStatistics(),

        // کوئری گرفتن سفارش‌های ۷ روز گذشته (بدون فیلتر وضعیت پرداخت تا دیتای تست هم بیاید)
        getPrismaClient().order.findMany({
          where: {
            createdAt: { gte: sevenDaysAgo }
          },
          select: {
            totalPrice: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
      ]);

      const orderStatusCounts = {};
      ordersByStatus.forEach(item => {
        orderStatusCounts[item.status] = item._count.status;
      });

      const growthRates = await this.calculateGrowthRates();

      // ساخت مپ تاریخ
      const dailyMap = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      if (salesDataRaw && Array.isArray(salesDataRaw)) {
        salesDataRaw.forEach(order => {
          const d = new Date(order.createdAt);
          const dateKey = `${months[d.getMonth()]} ${d.getDate()}`;
          
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { revenue: 0, orders: 0 };
          }
          dailyMap[dateKey].revenue += order.totalPrice || 0;
          dailyMap[dateKey].orders += 1;
        });
      }

      return {
        overview: {
          totalOrders,
          totalRevenue: totalRevenue._sum.totalPrice || 0,
          totalUsers,
          totalProducts,
          basalamProducts,
          internalProducts,
          todayOrders,
          todayRevenue: todayRevenue._sum.totalPrice || 0,
          todayRegistrations,
          monthlyOrders,
          monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
          monthlyRegistrations,
          yearlyRevenue: yearlyRevenue._sum.totalPrice || 0
        },
        orderStats: {
          total: totalOrders,
          byStatus: orderStatusCounts,
          today: todayOrders,
          thisMonth: monthlyOrders,
          averageOrderValue: totalOrders > 0 ? Math.round((totalRevenue._sum.totalPrice || 0) / totalOrders) : 0
        },
        userStats: {
          total: totalUsers,
          todayRegistrations,
          monthlyRegistrations,
          activeUsers: activeUsers,
          retentionRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        },
        productStats: {
          total: totalProducts,
          basalam: basalamProducts,
          internal: internalProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          topSelling: topSellingProducts
        },
        revenueStats: {
          total: totalRevenue._sum.totalPrice || 0,
          today: todayRevenue._sum.totalPrice || 0,
          thisMonth: monthlyRevenue._sum.totalPrice || 0,
          thisYear: yearlyRevenue._sum.totalPrice || 0
        },
        recentActivity: {
          orders: recentOrders.map(order => ({
            id: order.id,
            status: order.status,
            totalPrice: order.totalPrice,
            createdAt: order.createdAt,
            user: order.user
          })),
          pendingReviews
        },
        paymentStats,
        growthRates,
        dailySales: dailyMap, // تحویل به کنترلر
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('DASHBOARD_STATS_ERROR');
    }
  }

  /**
   * Get top selling products
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Top selling products
   */
  async getTopSellingProducts(limit = 10) {
    const topProducts = await getPrismaClient().orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit
    });

    // Get product details for top selling items
    const productIds = topProducts.map(item => item.productId);
    const products = await getPrismaClient().product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: { where: { isMain: true } },
        category: { select: { name: true } }
      }
    });

    // Combine sales data with product details
    return topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category.name,
          mainImage: product.images[0]?.url || null
        },
        totalSold: item._sum.quantity,
        orderCount: item._count.productId
      };
    });
  }

  /**
   * Get payment statistics
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStatistics() {
    const [successfulPayments, failedPayments, pendingPayments, paymentsByGateway] = await Promise.all([
      getPrismaClient().payment.count({ where: { status: 'SUCCESS' } }),
      getPrismaClient().payment.count({ where: { status: 'FAILED' } }),
      getPrismaClient().payment.count({ where: { status: 'PENDING' } }),
      getPrismaClient().payment.groupBy({
        by: ['gateway'],
        _count: { gateway: true },
        _sum: { amount: true }
      })
    ]);

    const gatewayStats = {};
    paymentsByGateway.forEach(item => {
      gatewayStats[item.gateway] = {
        count: item._count.gateway,
        totalAmount: item._sum.amount || 0
      };
    });

    const totalPayments = successfulPayments + failedPayments + pendingPayments;
    
    return {
      total: totalPayments,
      successful: successfulPayments,
      failed: failedPayments,
      pending: pendingPayments,
      successRate: totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0,
      byGateway: gatewayStats
    };
  }

  /**
   * Calculate growth rates for key metrics
   * @returns {Promise<Object>} Growth rates
   */
  async calculateGrowthRates() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthStats, lastMonthStats] = await Promise.all([
      // This month statistics
      Promise.all([
        getPrismaClient().order.count({
          where: { createdAt: { gte: startOfThisMonth } }
        }),
        getPrismaClient().order.aggregate({
          where: {
            createdAt: { gte: startOfThisMonth },
            paymentStatus: 'SUCCESS'
          },
          _sum: { totalPrice: true }
        }),
        getPrismaClient().user.count({
          where: { createdAt: { gte: startOfThisMonth } }
        })
      ]),
      
      // Last month statistics
      Promise.all([
        getPrismaClient().order.count({
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        }),
        getPrismaClient().order.aggregate({
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            },
            paymentStatus: 'SUCCESS'
          },
          _sum: { totalPrice: true }
        }),
        getPrismaClient().user.count({
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        })
      ])
    ]);

    const [thisMonthOrders, thisMonthRevenue, thisMonthUsers] = thisMonthStats;
    const [lastMonthOrders, lastMonthRevenue, lastMonthUsers] = lastMonthStats;

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      orders: calculateGrowth(thisMonthOrders, lastMonthOrders),
      revenue: calculateGrowth(
        thisMonthRevenue._sum.totalPrice || 0,
        lastMonthRevenue._sum.totalPrice || 0
      ),
      users: calculateGrowth(thisMonthUsers, lastMonthUsers)
    };
  }

  /**
   * Get comprehensive order listing for admin
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Orders with pagination
   */
  async getAdminOrders(options = {}) {
    const {
      status,
      paymentStatus,
      userId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (userId) where.userId = parseInt(userId);

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { trackingCode: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } }
      ];
    }

    const prisma = getPrismaClient();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,

        include: {
          attachments: true,

          messages: {
            include: {
              attachments: true,
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          statusHistory: {
            include: {
              changedBy: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          activityLogs: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          designVersions: {
            include: {
              designer: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          user: {
            select: { id: true, name: true, email: true, phone: true }
          },

          address: true,

          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: {
                    orderBy: [
                      { isMain: 'desc' },
                      { id: 'asc' }
                    ],
                    take: 4,
                    select: { url: true, isMain: true }
                  }
                }
              }
            }
          },

          shippingMethod: {
            select: { id: true, name: true }
          },

          _count: {
            select: { items: true }
          }
        },

        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),

      prisma.order.count({ where })
    ]);

    const mapped = orders.map(order => {
      const paymentReceipt = order.attachments?.find(
        a => a.type === 'PAYMENT_RECEIPT'
      );

      const designFiles = order.attachments?.filter(
        a => a.type === 'REFERENCE_IMAGE'
      ) || [];

      // =========================
      // 🔥 UNIFIED TIMELINE
      // =========================
      const timeline = [
        ...(order.messages || []).map(m => ({
          type: 'MESSAGE',
          createdAt: m.createdAt,
          data: {
            id: m.id,
            message: m.message,
            isAdmin: m.isAdmin,
            user: m.user
          }
        })),

        ...(order.statusHistory || []).map(s => ({
          type: 'STATUS',
          createdAt: s.createdAt,
          data: {
            id: s.id,
            fromStatus: s.fromStatus,
            toStatus: s.toStatus,
            note: s.note,
            changedBy: s.changedBy
          }
        })),

        ...(order.activityLogs || []).map(a => ({
          type: 'ACTIVITY',
          createdAt: a.createdAt,
          data: {
            id: a.id,
            action: a.action,
            entity: a.entity,
            entityId: a.entityId,
            details: a.details,
            user: a.user
          }
        })),

        ...(order.designVersions || []).map(v => ({
          type: 'DESIGN',
          createdAt: v.createdAt,
          data: {
            id: v.id,
            version: v.version,
            fileUrl: v.fileUrl,
            status: v.status,
            isFinal: v.isFinal,
            designer: v.designer
          }
        }))
      ].sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );

      return {
        id: order.id,
        trackingCode: order.trackingCode,
        status: order.status,
        paymentStatus: order.paymentStatus,

        paymentProofUrl: paymentReceipt?.url || null,

        totalPrice: order.totalPrice,
        discountAmount: order.discountAmount,
        shippingCost: order.shippingCost,

        itemCount: order._count.items,

        createdAt: order.createdAt,
        updatedAt: order.updatedAt,

        user: order.user,

        address: order.address
          ? {
              title: order.address.title,
              fullName: order.address.fullName,
              phone: order.address.phone,
              line: order.address.address,
              city: order.address.city,
              province: order.address.province,
              postalCode: order.address.postalCode
            }
          : null,

        shippingMethod: order.shippingMethod
          ? {
              id: order.shippingMethod.id,
              name: order.shippingMethod.name
            }
          : null,

        designFiles: designFiles.map(file => ({
          id: file.id,
          url: file.url,
          originalName: file.originalName,
          mimeType: file.mimeType
        })),

        timeline
      };
    });

    return {
      orders: mapped,
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
   * Get comprehensive user listing for admin
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Users with pagination
   */
  async getAdminUsers(options = {}) {
    const {
      role,
      isActive,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    // Build where clause
    const where = {};
    
    if (role) where.role = role;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      getPrismaClient().user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          isActive: true,
          is2FAEnabled: true,
          loyaltyPoints: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      getPrismaClient().user.count({ where })
    ]);

    // Get additional statistics for each user
    const userIds = users.map(user => user.id);
    const userStats = await getPrismaClient().order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        paymentStatus: 'SUCCESS'
      },
      _sum: { totalPrice: true },
      _count: { userId: true }
    });

    const userStatsMap = {};
    userStats.forEach(stat => {
      userStatsMap[stat.userId] = {
        totalSpent: stat._sum.totalPrice || 0,
        completedOrders: stat._count.userId
      };
    });

    return {
      users: users.map(user => ({
        ...user,
        statistics: {
          totalOrders: user._count.orders,
          completedOrders: userStatsMap[user.id]?.completedOrders || 0,
          totalSpent: userStatsMap[user.id]?.totalSpent || 0,
          totalReviews: user._count.reviews
        }
      })),
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
   * Update user account status
   * @param {number} userId - User ID
   * @param {boolean} isActive - Active status
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Updated user
   */
  async updateUserStatus(userId, isActive, adminId) {
    const user = await getPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updatedUser = await getPrismaClient().user.update({
      where: { id: userId },
      data: { isActive }
    });

    // Log admin activity
    await this.logAdminActivity(adminId, 'user.status_updated', 'User', userId, {
      oldStatus: user.isActive,
      newStatus: isActive
    });

    return updatedUser;
  }

  /**
   * Update user role
   * @param {number} userId - User ID
   * @param {string} role - New role (USER, ADMIN)
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Updated user
   */
  async updateUserRole(userId, role, adminId) {
    const validRoles = ['USER', 'ADMIN'];
    
    if (!validRoles.includes(role)) {
      throw new Error('INVALID_ROLE');
    }

    const user = await getPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updatedUser = await getPrismaClient().user.update({
      where: { id: userId },
      data: { role }
    });

    // Log admin activity
    await this.logAdminActivity(adminId, 'user.role_updated', 'User', userId, {
      oldRole: user.role,
      newRole: role
    });

    return updatedUser;
  }

  /**
   * Log admin activity
   * @param {number} adminId - Admin user ID
   * @param {string} action - Action performed
   * @param {string} entity - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Additional details
   */
  async logAdminActivity(adminId, action, entity, entityId, details = {}) {
    try {
      await getPrismaClient().activityLog.create({
        data: {
          userId: adminId,
          action,
          entity,
          entityId,
          details: {
            ...details,
            adminAction: true
          }
        }
      });
    } catch (error) {
      console.error('Failed to log admin activity:', error);
    }
  }

  /**
   * Get single order details for admin
   * @param {number} orderId
   * @returns {Promise<Object>}
   */
  async getOrderById(orderId) {
    try {
      const prisma = getPrismaClient();

      const order = await prisma.order.findUnique({
        where: { id: orderId },

        include: {
          attachments: true,

          messages: {
            include: {
              attachments: true,
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          statusHistory: {
            include: {
              changedBy: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          activityLogs: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          designVersions: {
            include: {
              designer: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          },

          user: {
            select: { id: true, name: true, email: true, phone: true }
          },

          address: true,

          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: {
                    orderBy: [
                      { isMain: 'desc' },
                      { id: 'asc' }
                    ],
                    take: 4,
                    select: { url: true, isMain: true }
                  }
                }
              }
            }
          },

          shippingMethod: {
            select: { id: true, name: true }
          }
        }
      });

      if (!order) throw new Error('ORDER_NOT_FOUND');

      const timeline = this.buildOrderTimeline(order);

      return {
        ...order,
        timeline
      };

    } catch (error) {
      console.error('Get order by id error:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();
