const { PrismaClient } = require('@prisma/client');

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
   * @param {Object|null} details - Additional details about the action
   * @param {Object|null} req - Express request object for context
   * @returns {Promise<Object>} The created activity log entry
   */
  async logActivity(action, entity, entityId = null, details = null, req = null) {
    try {
      const logData = {
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        createdAt: new Date()
      };

      // Add user context if available
      if (req && req.user) {
        logData.userId = req.user.id;
        logData.ip = req.ip || req.connection.remoteAddress || null;
        logData.userAgent = req.get('User-Agent') || null;
      }

      const activityLog = await prisma.activityLog.create({
        data: logData
      });

      return activityLog;
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Log product view activity
   * @param {number} productId - The product ID
   * @param {Object} req - Express request object
   */
  async logProductView(productId, req) {
    return this.logActivity(
      'product.view',
      'Product',
      productId,
      {
        timestamp: new Date(),
        source: 'product_page'
      },
      req
    );
  }

  /**
   * Log product search activity
   * @param {string} searchQuery - The search query
   * @param {number} resultCount - Number of results returned
   * @param {Object} req - Express request object
   */
  async logProductSearch(searchQuery, resultCount, req) {
    return this.logActivity(
      'product.search',
      'Product',
      null,
      {
        query: searchQuery,
        resultCount,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log purchase activity
   * @param {number} orderId - The order ID
   * @param {number} totalAmount - Total purchase amount
   * @param {Array} items - Array of purchased items
   * @param {Object} req - Express request object
   */
  async logPurchase(orderId, totalAmount, items, req) {
    return this.logActivity(
      'order.purchase',
      'Order',
      orderId,
      {
        totalAmount,
        itemCount: items.length,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log account changes
   * @param {string} changeType - Type of change (e.g., 'profile_update', 'password_change')
   * @param {number} userId - The user ID
   * @param {Object} changes - Object describing what changed
   * @param {Object} req - Express request object
   */
  async logAccountChange(changeType, userId, changes, req) {
    return this.logActivity(
      `account.${changeType}`,
      'User',
      userId,
      {
        changes,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log cart activity
   * @param {string} action - Cart action (add, remove, update, clear)
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity
   * @param {Object} req - Express request object
   */
  async logCartActivity(action, productId, quantity, req) {
    return this.logActivity(
      `cart.${action}`,
      'Cart',
      productId,
      {
        quantity,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log authentication events
   * @param {string} event - Auth event (login, logout, register, failed_login)
   * @param {number|null} userId - User ID (null for failed attempts)
   * @param {Object} details - Additional details
   * @param {Object} req - Express request object
   */
  async logAuthEvent(event, userId = null, details = {}, req) {
    return this.logActivity(
      `auth.${event}`,
      'User',
      userId,
      {
        ...details,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log review activity
   * @param {string} action - Review action (create, update, approve, reject)
   * @param {number} reviewId - Review ID
   * @param {number} productId - Product ID
   * @param {Object} req - Express request object
   */
  async logReviewActivity(action, reviewId, productId, req) {
    return this.logActivity(
      `review.${action}`,
      'Review',
      reviewId,
      {
        productId,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log wishlist activity
   * @param {string} action - Wishlist action (add, remove)
   * @param {number} productId - Product ID
   * @param {Object} req - Express request object
   */
  async logWishlistActivity(action, productId, req) {
    return this.logActivity(
      `wishlist.${action}`,
      'Wishlist',
      productId,
      {
        timestamp: new Date()
      },
      req
    );
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
    return this.logActivity(
      `admin.${action}`,
      entity,
      entityId,
      {
        ...details,
        adminId: req.user?.id,
        timestamp: new Date()
      },
      req
    );
  }

  /**
   * Log security events
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @param {Object} req - Express request object
   */
  async logSecurityEvent(event, details = {}, req) {
    return this.logActivity(
      `security.${event}`,
      'Security',
      null,
      {
        ...details,
        timestamp: new Date(),
        severity: details.severity || 'medium'
      },
      req
    );
  }

  /**
   * Get activity logs with filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of activity logs
   */
  async getActivityLogs(filters = {}) {
    try {
      const where = {};
      
      if (filters.userId) {
        where.userId = filters.userId;
      }
      
      if (filters.action) {
        where.action = {
          contains: filters.action
        };
      }
      
      if (filters.entity) {
        where.entity = filters.entity;
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

      const logs = await prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: filters.limit || 100,
        skip: filters.offset || 0
      });

      return logs;
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      throw error;
    }
  }

  /**
   * Log API request with performance metrics
   * @param {Object} requestData - Request data including method, endpoint, etc.
   * @returns {Promise<Object>} The created API log entry
   */
  async logApiRequest(requestData) {
    try {
      const log = await prisma.activityLog.create({
        data: {
          action: 'api.request',
          entity: 'Api',

          userId: requestData.userId || null,

          details: JSON.stringify({
            method: requestData.method,
            endpoint: requestData.endpoint,
            status: requestData.status,
            ip: requestData.ip,
            userAgent: requestData.userAgent || null,
            responseTime: requestData.responseTime || null,
            timestamp: new Date()
          }),

          createdAt: new Date()
        }
      });

      return log;
    } catch (error) {
      console.error('Failed to log API request:', error);
      // مهم: اینجا throw نکن
      return null;
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
        action: 'api.request'
      };

      if (filters.userId) {
        where.userId = Number(filters.userId);
      }

      if (filters.method) {
        where.details = {
          contains: `"method":"${filters.method}"`
        };
      }

      if (filters.endpoint) {
        where.details = {
          contains: `"endpoint":"${filters.endpoint}"`
        };
      }

      if (filters.status) {
        where.details = {
          contains: `"status":${filters.status}`
        };
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
        analytics: null // اگر خواستی بعداً اضافه می‌کنیم
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
  async getApiAnalytics(filters = {}) {
    try {
      const where = {};
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }

      const [
        totalRequests,
        averageResponseTime,
        slowRequests,
        errorRequests,
        topEndpoints,
        statusDistribution
      ] = await Promise.all([
        prisma.apiLog.count({ where }),
        prisma.apiLog.aggregate({
          where: {
            ...where,
            responseTime: { not: null }
          },
          _avg: {
            responseTime: true
          }
        }),
        prisma.apiLog.count({
          where: {
            ...where,
            responseTime: { gt: 1000 }
          }
        }),
        prisma.apiLog.count({
          where: {
            ...where,
            status: { gte: 400 }
          }
        }),
        prisma.apiLog.groupBy({
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
        prisma.apiLog.groupBy({
          by: ['status'],
          where,
          _count: {
            status: true
          }
        })
      ]);

      return {
        totalRequests,
        averageResponseTime: averageResponseTime._avg.responseTime || 0,
        slowRequests,
        errorRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) : 0,
        topEndpoints: topEndpoints.map(item => ({
          endpoint: item.endpoint,
          count: item._count.endpoint
        })),
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: item._count.status
        }))
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
  async getSlowQueries(threshold = 1000, filters = {}) {
    try {
      const where = {
        responseTime: { gte: threshold },
        ...filters
      };

      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }

      const slowQueries = await prisma.apiLog.findMany({
        where,
        orderBy: {
          responseTime: 'desc'
        },
        take: filters.limit || 50
      });

      return slowQueries;
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
  async getUserSessionAnalytics(userId, filters = {}) {
    try {
      const where = { userId };
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }

      const [
        totalRequests,
        uniqueSessions,
        averageResponseTime,
        mostUsedEndpoints
      ] = await Promise.all([
        prisma.apiLog.count({ where }),
        prisma.apiLog.findMany({
          where,
          distinct: ['ip'],
          select: { ip: true }
        }),
        prisma.apiLog.aggregate({
          where: {
            ...where,
            responseTime: { not: null }
          },
          _avg: {
            responseTime: true
          }
        }),
        prisma.apiLog.groupBy({
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
          take: 5
        })
      ]);

      return {
        totalRequests,
        uniqueSessions: uniqueSessions.length,
        averageResponseTime: averageResponseTime._avg.responseTime || 0,
        mostUsedEndpoints: mostUsedEndpoints.map(item => ({
          endpoint: item.endpoint,
          count: item._count.endpoint
        }))
      };
    } catch (error) {
      console.error('Failed to get user session analytics:', error);
      throw error;
    }
  }

  /**
   * Log error with comprehensive details and categorization
   * @param {Error} error - The error object
   * @param {Object} req - Express request object
   * @param {Object} additionalContext - Additional context information
   * @returns {Promise<Object>} The created error log entry
   */
  async logError(error, errorData = {}) {
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


    await prisma.errorLog.create({
      data: {
        message: message || 'Unknown error',
        stack: stack || null,
        endpoint: endpoint || null,
        method: method || null,
        ip: ip || null,
        userId: userId || null,
        statusCode: statusCode || null,
        userAgent: userAgent || null
      }
    });




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
      // Log the alert activity
      await this.logActivity(
        'alert.error_critical',
        'Alert',
        errorLog.id,
        {
          severity: severity.level,
          category: severity.category,
          message: errorLog.message,
          endpoint: errorLog.endpoint,
          userId: errorLog.userId,
          alertTime: new Date()
        },
        req
      );

      // Here you could integrate with external alerting systems
      // like Slack, email notifications, or monitoring services
      console.error(`CRITICAL ERROR ALERT: ${errorLog.message}`, {
        id: errorLog.id,
        endpoint: errorLog.endpoint,
        userId: errorLog.userId,
        timestamp: errorLog.timestamp
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
        where.statusCode = filters.statusCode;
      }
      
      if (filters.severity) {
        // Filter by severity through activity logs
        const activityLogs = await prisma.activityLog.findMany({
          where: {
            action: 'error.occurred',
            details: {
              path: ['severity'],
              equals: filters.severity
            }
          },
          select: { entityId: true }
        });
        
        if (activityLogs.length > 0) {
          where.id = {
            in: activityLogs.map(log => log.entityId).filter(Boolean)
          };
        } else {
          // No errors with this severity
          where.id = -1;
        }
      }
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }

      const [logs, totalCount, analytics] = await Promise.all([
        prisma.errorLog.findMany({
          where,
          orderBy: {
            timestamp: 'desc'
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
  async getErrorAnalytics(filters = {}) {
    try {
      const where = {};
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }

      const [
        totalErrors,
        errorsByStatus,
        errorsByEndpoint,
        recentCriticalErrors,
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
        prisma.activityLog.findMany({
          where: {
            action: 'error.occurred',
            details: {
              path: ['severity'],
              equals: 'critical'
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          orderBy: {
            createdAt: 'desc'
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
        recentCriticalErrors: recentCriticalErrors.length,
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
            timestamp: {
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