/**
 * Production Monitoring Configuration
 * 
 * This module provides comprehensive monitoring setup for production environment
 * including health checks, metrics collection, and alerting.
 */

const { PrismaClient } = require('@prisma/client');
const productionConfig = require('./production');

class MonitoringService {
  constructor() {
    this.client = null;
    this.healthStatus = {
      database: false,
      redis: false,
      smtp: false,
      cloudinary: false,
      lastCheck: null
    };
  }

  /**
   * Initialize monitoring service
   */
  async initialize() {
    this.client = new PrismaClient({
      log: ['error']
    });
    
    // Setup periodic health checks
    if (productionConfig.monitoring.healthCheck.enabled) {
      setInterval(() => {
        this.performHealthCheck().catch(console.error);
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      responseTime: 0
    };

    try {
      // Database health check
      try {
        await this.client.$queryRaw`SELECT 1`;
        results.checks.database = { status: 'healthy', responseTime: Date.now() - startTime };
        this.healthStatus.database = true;
      } catch (error) {
        results.checks.database = { status: 'unhealthy', error: error.message };
        this.healthStatus.database = false;
        results.status = 'unhealthy';
      }

      // Redis health check
      if (productionConfig.cache.redis.enabled) {
        try {
          const Redis = require('ioredis');
          const redis = new Redis(productionConfig.cache.redis.url, {
            password: productionConfig.cache.redis.password,
            lazyConnect: true,
            maxRetriesPerRequest: 1
          });

          const redisStart = Date.now();
          await redis.ping();
          await redis.disconnect();
          
          results.checks.redis = { status: 'healthy', responseTime: Date.now() - redisStart };
          this.healthStatus.redis = true;
        } catch (error) {
          results.checks.redis = { status: 'unhealthy', error: error.message };
          this.healthStatus.redis = false;
          results.status = 'degraded';
        }
      }

      // SMTP health check (lightweight)
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter(productionConfig.email.smtp);
        
        const smtpStart = Date.now();
        await transporter.verify();
        
        results.checks.smtp = { status: 'healthy', responseTime: Date.now() - smtpStart };
        this.healthStatus.smtp = true;
      } catch (error) {
        results.checks.smtp = { status: 'unhealthy', error: error.message };
        this.healthStatus.smtp = false;
        results.status = 'degraded';
      }

      // Cloudinary health check
      if (productionConfig.upload.cloudinary.enabled) {
        try {
          const cloudinary = require('cloudinary').v2;
          cloudinary.config(productionConfig.upload.cloudinary);
          
          const cloudinaryStart = Date.now();
          await cloudinary.api.ping();
          
          results.checks.cloudinary = { status: 'healthy', responseTime: Date.now() - cloudinaryStart };
          this.healthStatus.cloudinary = true;
        } catch (error) {
          results.checks.cloudinary = { status: 'unhealthy', error: error.message };
          this.healthStatus.cloudinary = false;
          results.status = 'degraded';
        }
      }

      results.responseTime = Date.now() - startTime;
      this.healthStatus.lastCheck = results.timestamp;

      return results;
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      database: {},
      application: {}
    };

    try {
      // Database metrics
      const userCount = await this.client.user.count();
      const productCount = await this.client.product.count();
      const orderCount = await this.client.order.count();
      const activeOrderCount = await this.client.order.count({
        where: {
          status: {
            in: ['PENDING', 'PROCESSING', 'SHIPPED']
          }
        }
      });

      metrics.database = {
        users: userCount,
        products: productCount,
        orders: orderCount,
        activeOrders: activeOrderCount
      };

      // Application metrics
      metrics.application = {
        healthStatus: this.healthStatus,
        features: productionConfig.features
      };

      return metrics;
    } catch (error) {
      metrics.error = error.message;
      return metrics;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      database: {},
      api: {},
      errors: {}
    };

    try {
      // Database performance metrics
      const slowQueries = await this.client.apiLog.count({
        where: {
          responseTime: {
            gt: 1000 // Queries taking more than 1 second
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const avgResponseTime = await this.client.apiLog.aggregate({
        _avg: {
          responseTime: true
        },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      metrics.database = {
        slowQueries,
        avgResponseTime: avgResponseTime._avg.responseTime || 0
      };

      // API performance metrics
      const totalRequests = await this.client.apiLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const errorRequests = await this.client.apiLog.count({
        where: {
          status: {
            gte: 400
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      metrics.api = {
        totalRequests,
        errorRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0
      };

      // Error metrics
      const criticalErrors = await this.client.errorLog.count({
        where: {
          statusCode: {
            gte: 500
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      metrics.errors = {
        criticalErrors,
        errorRate: metrics.api.errorRate
      };

      return metrics;
    } catch (error) {
      metrics.error = error.message;
      return metrics;
    }
  }

  /**
   * Check for alerts and notifications
   */
  async checkAlerts() {
    const alerts = [];
    const now = new Date();

    try {
      // Check for high error rate
      const performanceMetrics = await this.getPerformanceMetrics();
      
      if (performanceMetrics.api.errorRate > 5) {
        alerts.push({
          type: 'high_error_rate',
          severity: 'warning',
          message: `High error rate detected: ${performanceMetrics.api.errorRate.toFixed(2)}%`,
          timestamp: now.toISOString()
        });
      }

      if (performanceMetrics.api.errorRate > 10) {
        alerts.push({
          type: 'critical_error_rate',
          severity: 'critical',
          message: `Critical error rate detected: ${performanceMetrics.api.errorRate.toFixed(2)}%`,
          timestamp: now.toISOString()
        });
      }

      // Check for slow queries
      if (performanceMetrics.database.slowQueries > 10) {
        alerts.push({
          type: 'slow_queries',
          severity: 'warning',
          message: `High number of slow queries: ${performanceMetrics.database.slowQueries}`,
          timestamp: now.toISOString()
        });
      }

      // Check for unhealthy services
      if (!this.healthStatus.database) {
        alerts.push({
          type: 'database_unhealthy',
          severity: 'critical',
          message: 'Database health check failed',
          timestamp: now.toISOString()
        });
      }

      // Check for low stock products
      const lowStockProducts = await this.client.product.count({
        where: {
          stock: {
            lte: this.client.product.fields.lowStockAlert
          }
        }
      });

      if (lowStockProducts > 0) {
        alerts.push({
          type: 'low_stock',
          severity: 'info',
          message: `${lowStockProducts} products are low in stock`,
          timestamp: now.toISOString()
        });
      }

      return alerts;
    } catch (error) {
      return [{
        type: 'monitoring_error',
        severity: 'error',
        message: `Monitoring check failed: ${error.message}`,
        timestamp: now.toISOString()
      }];
    }
  }

  /**
   * Cleanup old logs and metrics
   */
  async cleanupOldData() {
    const retentionDays = 30;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    try {
      // Cleanup old API logs
      const deletedApiLogs = await this.client.apiLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      // Cleanup old error logs
      const deletedErrorLogs = await this.client.errorLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      // Cleanup old activity logs (keep important ones)
      const deletedActivityLogs = await this.client.activityLog.deleteMany({
        where: {
          AND: [
            {
              createdAt: {
                lt: cutoffDate
              }
            },
            {
              action: {
                notIn: ['user.created', 'order.completed', 'payment.success']
              }
            }
          ]
        }
      });

      return {
        apiLogs: deletedApiLogs.count,
        errorLogs: deletedErrorLogs.count,
        activityLogs: deletedActivityLogs.count
      };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Cleanup connections
   */
  async cleanup() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }
}

module.exports = {
  MonitoringService,
  
  // Express middleware for health checks
  healthCheckMiddleware: async (req, res) => {
    const monitoring = new MonitoringService();
    await monitoring.initialize();
    
    try {
      const health = await monitoring.performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await monitoring.cleanup();
    }
  },

  // Express middleware for metrics
  metricsMiddleware: async (req, res) => {
    const monitoring = new MonitoringService();
    await monitoring.initialize();
    
    try {
      const [systemMetrics, performanceMetrics] = await Promise.all([
        monitoring.getSystemMetrics(),
        monitoring.getPerformanceMetrics()
      ]);
      
      res.json({
        system: systemMetrics,
        performance: performanceMetrics
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await monitoring.cleanup();
    }
  }
};