const { PrismaClient, ActivityAction, EntityType, ActorType } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Comprehensive Logging Service
 * Handles activity logging, API logging, and error logging
 */
class LoggingService {
  /**
   * Log user activity with contextual information
   * @param {string} action - The action performed (e.g., 'product.view', 'order.create')
   * @param {string} entity - The entity type (e.g., 'Product', 'Order')
   * @param {number|null} entityId - The ID of the entity
   * @param {Object|null} metadata - Additional details about the action
   * @param {string|null} userId - User ID
   * @param {string|null} actorType - Actor type (USER, ADMIN, SYSTEM)
   * @param {string|null} ip - IP address
   * @param {string|null} userAgent - User agent string
   * @returns {Promise<Object>} The created activity log entry
   */
  async logActivity({ action, entity, entityId = null, metadata = null, userId = null,
                      actorType = null, ip = null, userAgent = null } = {}) {
    try {
      const logData = {
        action,
        entity,
        entityId,
        actorType: actorType || 'SYSTEM',
        metadata: metadata || null,
        createdAt: new Date(),
        ip: ip || null,
        userAgent: userAgent || null,
      };

      if (userId) {
        logData.user = { connect: { id: userId } };
      }

      return await prisma.activityLog.create({ data: logData });
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Log product view activity
   * @param {number} userId - The user ID
   * @param {number} productId - The product ID
   * @param {Object} req - Express request object
   */
  async logProductView(userId, productId, req) {
    return this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Product',
      entityId: productId,
      metadata: {
        event: 'product_view',
        source: 'product_page',
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log product search activity
   * @param {number} userId - The user ID
   * @param {string} searchQuery - The search query
   * @param {number} resultCount - Number of results returned
   * @param {Object} req - Express request object
   */
  async logProductSearch(userId, searchQuery, resultCount, req) {
    return this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Product',
      entityId: null,
      metadata: {
        event: 'product_search',
        query: searchQuery,
        resultCount,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log purchase activity
   * @param {number} orderId - The order ID
   * @param {number} totalAmount - Total purchase amount
   * @param {Array} items - Array of purchased items
   * @param {Object} req - Express request object
   */
  async logPurchase(orderId, totalAmount, items, req) {
    return this.logActivity({
      userId: req?.user?.id || null,
      action: ActivityAction.ORDER_CREATED,
      entity: 'Order',
      entityId: orderId,
      metadata: {
        totalAmount,
        itemCount: items.length,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        event: 'order_purchase',
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log account changes
   * @param {number} userId - The user ID
   * @param {string} changeType - Type of change (e.g., 'profile_update', 'password_change')
   * @param {Object} changes - Object describing what changed
   * @param {Object} req - Express request object
   */
  async logAccountChange(userId, changeType, changes, req) {
    return this.logActivity({
      userId,
      action: ActivityAction.USER_UPDATED,
      entity: 'User',
      entityId: userId,
      metadata: {
        changeType,
        changes,
        event: `account_${changeType}`,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log cart activity
   * @param {number} userId - The user ID
   * @param {string} action - Cart action (add, remove, update, clear)
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity
   * @param {Object} req - Express request object
   */
  async logCartActivity(userId, action, productId, quantity, req) {
    return this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Cart',
      entityId: productId,
      metadata: {
        cartAction: action,
        quantity,
        event: `cart_${action}`,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log authentication events
   * @param {string} event - Auth event (login, logout, register, failed_login)
   * @param {number|null} userId - User ID (null for failed attempts)
   * @param {Object} details - Additional details
   * @param {Object} req - Express request object
   */
  async logAuthEvent(event, userId = null, details = {}, req) {
    const actionMap = {
      login: ActivityAction.AUTH_LOGIN,
      logout: ActivityAction.AUTH_LOGOUT,
      login_failed: ActivityAction.AUTH_LOGIN_FAILED
    };

    return this.logActivity({
      userId,
      action: actionMap[event] || ActivityAction.SYSTEM_EVENT,
      entity: 'User',
      entityId: userId,
      metadata: {
        authEvent: event,
        ...details,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log review activity
   * @param {string} action - Review action (create, update, approve, reject)
   * @param {number} reviewId - Review ID
   * @param {number} productId - Product ID
   * @param {Object} req - Express request object
   */
  async logReviewActivity(action, reviewId, productId, req) {
    const actionMap = {
      created: ActivityAction.REVIEW_CREATED,
      approved: ActivityAction.REVIEW_APPROVED
    };

    return this.logActivity({
      userId: req?.user?.id || null,
      action: actionMap[action] || ActivityAction.SYSTEM_EVENT,
      entity: 'Review',
      entityId: reviewId,
      metadata: {
        productId,
        reviewAction: action,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log wishlist activity
   * @param {number} userId - The user ID
   * @param {string} action - Wishlist action (add, remove)
   * @param {number} productId - Product ID
   * @param {Object} req - Express request object
   */
  async logWishlistActivity(userId, action, productId, req) {
    return this.logActivity({
      userId,
      action: ActivityAction.SYSTEM_EVENT,
      entity: 'Wishlist',
      entityId: productId,
      metadata: {
        wishlistAction: action,
        event: `wishlist_${action}`,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log admin activity
   * @param {string} action - Admin action
   * @param {string} entity - Entity type
   * @param {number|null} entityId - Entity ID
   * @param {Object} details - Additional details
   * @param {Object} req - Express request object
   */
  async logAdminActivity(action, entity, entityId, details, req) {
    return this.logActivity({
      userId: req?.user?.id || null,
      action: ActivityAction.SYSTEM_EVENT,
      entity,
      entityId,
      metadata: {
        adminAction: action,
        ...details,
        timestamp: new Date()
      },
      actorType: 'ADMIN',
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log security events
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @param {Object} req - Express request object
   */
  async logSecurityEvent(event, details = {}, req) {
    const authEvents = {
      login: ActivityAction.AUTH_LOGIN,
      login_failed: ActivityAction.AUTH_LOGIN_FAILED,
      logout: ActivityAction.AUTH_LOGOUT
    };

    return this.logActivity({
      userId: req?.user?.id || null,
      action: authEvents[event] || ActivityAction.SYSTEM_EVENT,
      entity: 'Security',
      entityId: null,
      actorType: 'SYSTEM',
      metadata: {
        securityEvent: event,
        ...details,
        timestamp: new Date()
      },
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Get activity logs with filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} logs, total, and stats
   */
  async getActivityLogs(filters = {}) {
    const where = {};

    if (filters.userId) where.userId = Number(filters.userId);
    if (filters.entity) where.entity = filters.entity;
    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.severity) where.severity = filters.severity;
    if (filters.action) where.action = filters.action;

    // FIX: پشتیبانی از فیلتر success که frontend می‌فرسته
    if (filters.success !== undefined) {
      where.success = filters.success === 'true' || filters.success === true;
    }

    if (filters.search) {
      where.OR = [
        { entity: { contains: filters.search } },
        { action: { contains: filters.search } },
        { user: { name: { contains: filters.search } } },
        { user: { email: { contains: filters.search } } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59');
    }

    // FIX: prisma() → prisma (بدون پرانتز)
    // FIX: stats اضافه شد — روی کل داده بدون pagination برای کارت‌های frontend
    const [logs, total, errors, warnings, ok, fail] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: Number(filters.limit) || 20,
        skip: Number(filters.offset) || 0,
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.count({ where: { ...where, severity: 'ERROR' } }),
      prisma.activityLog.count({ where: { ...where, severity: 'WARNING' } }),
      prisma.activityLog.count({ where: { ...where, success: true } }),
      prisma.activityLog.count({ where: { ...where, success: false } }),
    ]);

    return {
      logs,
      total,
      stats: { total, errors, warnings, ok, fail },
    };
  }

  /**
   * Log API request with performance metrics
   * @param {Object} requestData - Request data including method, endpoint, etc.
   * @returns {Promise<Object>} The created API log entry
   */
  async logApiRequest(requestData) {
    try {
      const {
        method,
        endpoint,
        status,
        ip,
        userAgent,
        responseTime,
        userId,
        correlationId
      } = requestData;

      await prisma.activityLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'API_REQUEST',
          entity: 'SYSTEM',

          user: userId
            ? {
                connect: { id: userId }
              }
            : undefined,

          correlationId,

          metadata: {
            method,
            endpoint,
            status,
            ip,
            userAgent,
            responseTime
          }
        }
      });
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }

  /**
   * Get API logs with filtering and analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} API logs and analytics
   */
  async getApiLogs(filters = {}) {
    try {
      const where = {
        action: 'API_REQUEST'
      };

      if (filters.userId) {
        where.userId = Number(filters.userId);
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};

        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }

        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [logs, totalCount] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          orderBy: {
            createdAt: 'desc'
          },
          take: filters.limit || 100,
          skip: filters.offset || 0
        }),

        prisma.activityLog.count({ where })
      ]);

      return {
        logs,
        totalCount,
        analytics: null
      };

    } catch (error) {
      console.error('Failed to get API logs:', error);
      throw error;
    }
  }

  /**
   * Get API analytics and performance metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Analytics data
   */
  // FIX: prisma.apiLog → prisma.activityLog در همه جا
  async getApiAnalytics(filters = {}) {
    try {
      const where = {
        action: 'API_REQUEST',
        ...(filters.startDate || filters.endDate ? {
          createdAt: {
            ...(filters.startDate && { gte: new Date(filters.startDate) }),
            ...(filters.endDate && { lte: new Date(filters.endDate) }),
          }
        } : {})
      };

      const [totalRequests, errorRequests, topEndpoints] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.count({
          where: {
            ...where,
            metadata: { path: ['status'], gte: 400 }
          }
        }),
        prisma.activityLog.groupBy({
          by: ['entity'],
          where,
          _count: { entity: true },
          orderBy: { _count: { entity: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalRequests,
        errorRequests,
        errorRate: totalRequests > 0
          ? ((errorRequests / totalRequests) * 100).toFixed(2)
          : 0,
        topEndpoints: topEndpoints.map(i => ({
          endpoint: i.entity,
          count: i._count.entity
        })),
      };
    } catch (error) {
      console.error('Failed to get API analytics:', error);
      throw error;
    }
  }

  /**
   * Get slow query identification
   * @param {number} threshold - Response time threshold in milliseconds
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Array of slow requests
   */
  // FIX: prisma.apiLog → prisma.activityLog + timestamp → createdAt
  // responseTime داخل metadata ذخیره شده — فیلتر در app layer انجام می‌شه
  async getSlowQueries(threshold = 1000, filters = {}) {
    try {
      const where = { action: 'API_REQUEST' };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: (filters.limit || 50) * 4, // بیشتر بگیر تا بعد از فیلتر کافی باشه
      });

      // فیلتر روی metadata.responseTime در app layer
      return logs
        .filter(l => (l.metadata?.responseTime ?? 0) >= threshold)
        .sort((a, b) => (b.metadata?.responseTime ?? 0) - (a.metadata?.responseTime ?? 0))
        .slice(0, filters.limit || 50);
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      throw error;
    }
  }

  /**
   * Get user session analytics
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} User session data
   */
  // FIX: prisma.apiLog → prisma.activityLog + timestamp → createdAt
  async getUserSessionAnalytics(userId, filters = {}) {
    try {
      const where = { userId: Number(userId), action: 'API_REQUEST' };

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [
        totalRequests,
        uniqueSessions,
        mostUsedEndpoints
      ] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.findMany({
          where,
          distinct: ['ip'],
          select: { ip: true }
        }),
        prisma.activityLog.groupBy({
          by: ['entity'],
          where,
          _count: {
            entity: true
          },
          orderBy: {
            _count: {
              entity: 'desc'
            }
          },
          take: 5
        })
      ]);

      return {
        totalRequests,
        uniqueSessions: uniqueSessions.length,
        mostUsedEndpoints: mostUsedEndpoints.map(item => ({
          endpoint: item.entity,
          count: item._count.entity
        }))
      };
    } catch (error) {
      console.error('Failed to get user session analytics:', error);
      throw error;
    }
  }

  /**
   * Log error with comprehensive details and categorization
   * @param {Object} errorData - Error data object
   * @returns {Promise<Object>} The created error log entry
   */
  // FIX: return اضافه شد + try/catch درست شد
  async logError(errorData = {}) {
    const {
      message,
      stack,
      endpoint,
      method,
      ip,
      userId,
      statusCode,
      userAgent
    } = errorData;

    try {
      const log = await prisma.errorLog.create({
        data: {
          message: message || 'Unknown error',
          stack: stack || null,
          endpoint: endpoint || null,
          method: method || null,
          ip: ip || null,
          userId: userId || null,
          statusCode: statusCode || null,
          userAgent: userAgent || null,
          createdAt: new Date(),
        }
      });
      return log;
    } catch (error) {
      console.error('Failed to log error:', error);
      throw error;
    }
  }

  /**
   * Categorize error by severity and type
   * @param {Error} error - The error object
   * @param {number} statusCode - HTTP status code
   * @returns {Object} Error categorization
   */
  categorizeError(error, statusCode) {
    let level = 'low';
    let category = 'unknown';

    // Categorize by status code
    if (statusCode >= 500) {
      level = 'critical';
      category = 'server_error';
    } else if (statusCode >= 400) {
      level = 'medium';
      category = 'client_error';
    }

    // Categorize by error type
    if (error.name === 'ValidationError') {
      level = 'low';
      category = 'validation';
    } else if (error.name === 'UnauthorizedError' || statusCode === 401) {
      level = 'medium';
      category = 'authentication';
    } else if (error.name === 'ForbiddenError' || statusCode === 403) {
      level = 'medium';
      category = 'authorization';
    } else if (error.name === 'DatabaseError' || error.code === 'P2002') {
      level = 'high';
      category = 'database';
    } else if (error.name === 'PaymentError') {
      level = 'high';
      category = 'payment';
    } else if (error.name === 'ExternalServiceError') {
      level = 'medium';
      category = 'external_service';
    }

    // Override for specific critical conditions
    if (error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout') ||
      error.message.includes('out of memory')
    )) {
      level = 'critical';
      category = 'infrastructure';
    }

    return { level, category };
  }

  /**
   * Send error alert for critical errors
   * @param {Object} errorLog - The error log entry
   * @param {Object} severity - Error severity information
   * @param {Object} req - Express request object
   */
  async sendErrorAlert(errorLog, severity, req) {
    try {
      await this.logActivity({
        userId: errorLog.userId || null,
        action: ActivityAction.SYSTEM_EVENT,
        entity: 'Alert',
        entityId: errorLog.id,
        metadata: {
          event: 'error_critical',
          severity: severity.level,
          category: severity.category,
          message: errorLog.message,
          endpoint: errorLog.endpoint,
          alertTime: new Date()
        },
        ip: req?.ip,
        userAgent: req?.headers?.['user-agent']
      });

      console.error(`CRITICAL ERROR ALERT: ${errorLog.message}`, {
        id: errorLog.id,
        endpoint: errorLog.endpoint,
        userId: errorLog.userId,
        timestamp: errorLog.createdAt
      });

    } catch (alertError) {
      console.error('Failed to send error alert:', alertError);
    }
  }

  /**
   * Get error logs with filtering and analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Error logs and analytics
   */
  // FIX: timestamp → createdAt در where و orderBy
  async getErrorLogs(filters = {}) {
    try {
      const where = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.endpoint) {
        where.endpoint = {
          contains: filters.endpoint
        };
      }

      if (filters.statusCode) {
        where.statusCode = Number(filters.statusCode);
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [logs, totalCount, analytics] = await Promise.all([
        prisma.errorLog.findMany({
          where,
          orderBy: {
            createdAt: 'desc'
          },
          take: filters.limit || 100,
          skip: filters.offset || 0
        }),
        prisma.errorLog.count({ where }),
        this.getErrorAnalytics(filters)
      ]);

      return {
        logs,
        totalCount,
        analytics
      };
    } catch (error) {
      console.error('Failed to get error logs:', error);
      throw error;
    }
  }

  /**
   * Get error analytics and trends
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Error analytics
   */
  // FIX: timestamp → createdAt در where
  async getErrorAnalytics(filters = {}) {
    try {
      const where = {};

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const [
        totalErrors,
        errorsByStatus,
        errorsByEndpoint,
        errorTrends
      ] = await Promise.all([
        prisma.errorLog.count({ where }),
        prisma.errorLog.groupBy({
          by: ['statusCode'],
          where,
          _count: {
            statusCode: true
          },
          orderBy: {
            _count: {
              statusCode: 'desc'
            }
          }
        }),
        prisma.errorLog.groupBy({
          by: ['endpoint'],
          where,
          _count: {
            endpoint: true
          },
          orderBy: {
            _count: {
              endpoint: 'desc'
            }
          },
          take: 10
        }),
        this.getErrorTrends(filters)
      ]);

      return {
        totalErrors,
        errorsByStatus: errorsByStatus.map(item => ({
          statusCode: item.statusCode,
          count: item._count.statusCode
        })),
        errorsByEndpoint: errorsByEndpoint.map(item => ({
          endpoint: item.endpoint,
          count: item._count.endpoint
        })),
        errorTrends
      };
    } catch (error) {
      console.error('Failed to get error analytics:', error);
      throw error;
    }
  }

  /**
   * Get error trends over time
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Error trends data
   */
  // FIX: timestamp → createdAt در where
  async getErrorTrends(filters = {}) {
    try {
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      const startDate = filters.startDate ? new Date(filters.startDate) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get daily error counts
      const trends = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        const errorCount = await prisma.errorLog.count({
          where: {
            createdAt: {
              gte: dayStart,
              lt: dayEnd
            }
          }
        });

        trends.push({
          date: dayStart.toISOString().split('T')[0],
          count: errorCount
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return trends;
    } catch (error) {
      console.error('Failed to get error trends:', error);
      throw error;
    }
  }
}

module.exports = new LoggingService();