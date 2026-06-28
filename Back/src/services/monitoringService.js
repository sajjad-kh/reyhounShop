/**
 * Application Performance Monitoring Service
 * Provides comprehensive monitoring, metrics collection, and alerting
 */

const { getPrismaClient } = require('../utils/database');
const { databaseConfig } = require('../config/database');

const {
  ActivityAction,
  EntityType,
  ActorType,
  LogSeverity
} = require('@prisma/client');

const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      performance: new Map(),
      system: new Map()
    };
    this.maxRequestMetricKeys = 200;
    
    this.alerts = {
      errorRate: { threshold: 0.05, window: 300000 }, // 5% error rate in 5 minutes
      responseTime: { threshold: 2000, window: 300000 }, // 2s average response time
      memoryUsage: { threshold: 0.85, window: 60000 }, // 85% memory usage
      diskSpace: { threshold: 0.90, window: 300000 }, // 90% disk usage
      dbConnections: { threshold: 8, window: 60000 } // 8 concurrent connections
    };
    
    this.alertHistory = new Map();
    this.resourceBreachCounters = {
      memory: 0,
      cpu: 0
    };
    this.isMonitoring = false;
  }

  /**
   * Start monitoring system
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Starting application performance monitoring...');
    
    // Start periodic monitoring
    this.systemMonitorInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
    
    this.performanceMonitorInterval = setInterval(() => {
      this.analyzePerformanceMetrics();
    }, 60000); // Every minute
    
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000); // Every 30 seconds
    
    // Initial metrics collection
    this.collectSystemMetrics();
  }

  /**
   * Stop monitoring system
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('📊 Stopping application performance monitoring...');
    
    if (this.systemMonitorInterval) clearInterval(this.systemMonitorInterval);
    if (this.performanceMonitorInterval) clearInterval(this.performanceMonitorInterval);
    if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);
  }

  /**
   * Record API request metrics
   */
  recordRequest(method, endpoint, statusCode, responseTime, userId = null) {
    const timestamp = Date.now();
    const key = `${method}:${endpoint}`;
    const overflowKey = `${method}:__other__`;
    
    if (!this.metrics.requests.has(key)) {
      // Prevent unbounded growth in endpoint keys (high-cardinality paths).
      if (this.metrics.requests.size >= this.maxRequestMetricKeys) {
        if (!this.metrics.requests.has(overflowKey)) {
          this.metrics.requests.set(overflowKey, []);
        }
        const overflowRequests = this.metrics.requests.get(overflowKey);
        overflowRequests.push({
          timestamp,
          statusCode,
          responseTime,
          userId,
          isError: statusCode >= 400
        });
        if (overflowRequests.length > 1000) {
          overflowRequests.splice(0, overflowRequests.length - 1000);
        }
        return;
      }
      this.metrics.requests.set(key, []);
    }
    
    this.metrics.requests.get(key).push({
      timestamp,
      statusCode,
      responseTime,
      userId,
      isError: statusCode >= 400
    });
    
    // Keep only last 1000 requests per endpoint
    const requests = this.metrics.requests.get(key);
    if (requests.length > 1000) {
      requests.splice(0, requests.length - 1000);
    }
  }

  /**
   * Record error metrics
   */
  recordError(error, endpoint = null, method = null, userId = null) {
    const timestamp = Date.now();
    const errorKey = error.name || 'UnknownError';
    
    if (!this.metrics.errors.has(errorKey)) {
      this.metrics.errors.set(errorKey, []);
    }
    
    this.metrics.errors.get(errorKey).push({
      timestamp,
      message: error.message,
      stack: error.stack,
      endpoint,
      method,
      userId
    });
    
    // Keep only last 500 errors per type
    const errors = this.metrics.errors.get(errorKey);
    if (errors.length > 500) {
      errors.splice(0, errors.length - 500);
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const timestamp = Date.now();
      
      // Memory usage
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // CPU usage
      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();
      
      // Disk usage
      const diskUsage = await this.getDiskUsage();
      
      // Database metrics
      const dbMetrics = await this.getDatabaseMetrics();
      
      const systemMetrics = {
        timestamp,
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: (usedMemory / totalMemory) * 100,
          process: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
          }
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          loadAverage: loadAverage
        },
        disk: diskUsage,
        database: dbMetrics,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      };
      
      this.metrics.system.set(timestamp, systemMetrics);
      
      // Keep only last 100 system metrics
      if (this.metrics.system.size > 100) {
        const oldestKey = Math.min(...this.metrics.system.keys());
        this.metrics.system.delete(oldestKey);
      }
      
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get disk usage information
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      // This is a simplified version - in production, you'd use a proper disk usage library
      return {
        used: 0,
        total: 0,
        percentage: 0,
        available: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      const metrics = await databaseConfig.getQueryMetrics();
      return metrics;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformanceMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000; // 5 minutes
    
    // Analyze request patterns
    for (const [endpoint, requests] of this.metrics.requests) {
      const recentRequests = requests.filter(r => r.timestamp > fiveMinutesAgo);
      
      if (recentRequests.length > 0) {
        const errorCount = recentRequests.filter(r => r.isError).length;
        const errorRate = errorCount / recentRequests.length;
        const avgResponseTime = recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length;
        
        this.metrics.performance.set(`${endpoint}:errorRate`, {
          timestamp: now,
          value: errorRate,
          count: recentRequests.length,
          errors: errorCount
        });
        
        this.metrics.performance.set(`${endpoint}:avgResponseTime`, {
          timestamp: now,
          value: avgResponseTime,
          count: recentRequests.length
        });
      }
    }
  }

  /**
   * Check alert conditions
   */
  async checkAlerts() {
    const now = Date.now();
    
    // Check error rate alerts
    await this.checkErrorRateAlerts(now);
    
    // Check response time alerts
    await this.checkResponseTimeAlerts(now);
    
    // Check system resource alerts
    await this.checkSystemResourceAlerts(now);
    
    // Check database alerts
    await this.checkDatabaseAlerts(now);
  }

  /**
   * Check error rate alerts
   */
  async checkErrorRateAlerts(now) {
    const threshold = this.alerts.errorRate.threshold;
    const window = this.alerts.errorRate.window;
    const windowStart = now - window;
    
    for (const [endpoint, metric] of this.metrics.performance) {
      if (endpoint.endsWith(':errorRate') && metric.timestamp > windowStart) {
        if (metric.value > threshold) {
          await this.triggerAlert('HIGH_ERROR_RATE', {
            endpoint: endpoint.replace(':errorRate', ''),
            errorRate: (metric.value * 100).toFixed(2),
            threshold: (threshold * 100).toFixed(2),
            requestCount: metric.count,
            errorCount: metric.errors
          }, endpoint);
        }
      }
    }
  }

  /**
   * Check response time alerts
   */
  async checkResponseTimeAlerts(now) {
    const threshold = this.alerts.responseTime.threshold;
    const window = this.alerts.responseTime.window;
    const windowStart = now - window;
    
    for (const [endpoint, metric] of this.metrics.performance) {
      if (endpoint.endsWith(':avgResponseTime') && metric.timestamp > windowStart) {
        if (metric.value > threshold) {
          await this.triggerAlert('SLOW_RESPONSE_TIME', {
            endpoint: endpoint.replace(':avgResponseTime', ''),
            responseTime: Math.round(metric.value),
            threshold: threshold,
            requestCount: metric.count
          }, endpoint);
        }
      }
    }
  }

  /**
   * Check system resource alerts
   */
  async checkSystemResourceAlerts(now) {
    const latestSystemMetrics = Array.from(this.metrics.system.values()).pop();
    
    if (!latestSystemMetrics) return;
    
    // Memory usage alert
    const memoryPercentage = latestSystemMetrics.memory.percentage / 100;
    const memoryBreaches = this.resourceBreachCounters.memory;
    if (memoryPercentage > this.alerts.memoryUsage.threshold) {
      this.resourceBreachCounters.memory = memoryBreaches + 1;
      // Avoid noisy one-off spikes; alert only after sustained high usage.
      if (this.resourceBreachCounters.memory >= 3) {
        await this.triggerAlert('HIGH_MEMORY_USAGE', {
          usage: (memoryPercentage * 100).toFixed(2),
          threshold: (this.alerts.memoryUsage.threshold * 100).toFixed(2),
          used: Math.round(latestSystemMetrics.memory.used / 1024 / 1024),
          total: Math.round(latestSystemMetrics.memory.total / 1024 / 1024)
        }, 'system-memory');
      }
    } else {
      this.resourceBreachCounters.memory = 0;
    }
    
    // CPU load alert
    const loadAverage = latestSystemMetrics.cpu.loadAverage[0];
    const cpuCount = os.cpus().length;
    const cpuUsagePercentage = (loadAverage / cpuCount) * 100;
    
    if (cpuUsagePercentage > 80) {
      this.resourceBreachCounters.cpu += 1;
      if (this.resourceBreachCounters.cpu < 3) return;
      await this.triggerAlert('HIGH_CPU_USAGE', {
        usage: cpuUsagePercentage.toFixed(2),
        loadAverage: loadAverage.toFixed(2),
        cpuCount
      }, 'system-cpu');
    } else {
      this.resourceBreachCounters.cpu = 0;
    }
  }

  /**
   * Check database alerts
   */
  async checkDatabaseAlerts(now) {
    try {
      const dbMetrics = await this.getDatabaseMetrics();
      
      if (dbMetrics && dbMetrics.connectionCount > this.alerts.dbConnections.threshold) {
        await this.triggerAlert('HIGH_DB_CONNECTIONS', {
          connections: dbMetrics.connectionCount,
          threshold: this.alerts.dbConnections.threshold
        }, 'database-connections');
      }
      
      if (dbMetrics && dbMetrics.slowQueries > 10) {
        await this.triggerAlert('HIGH_SLOW_QUERIES', {
          slowQueries: dbMetrics.slowQueries,
          avgResponseTime: dbMetrics.avgResponseTime
        }, 'database-slow-queries');
      }
    } catch (error) {
      console.error('Error checking database alerts:', error);
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alertType, data, scope = 'global') {
    const now = Date.now();
    const alertKey = `${alertType}:${scope}`;
    
    // Check if we've already sent this alert recently (prevent spam)
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && (now - lastAlert) < 300000) { // 5 minutes cooldown
      return;
    }
    
    this.alertHistory.set(alertKey, now);
    
    // Log the alert
    console.warn(`🚨 ALERT [${alertType}]:`, data);
    
    // Store alert in database
    try {
      const prisma = getPrismaClient();
      await prisma.activityLog.create({
        data: {
          actorType: ActorType.SYSTEM,
          action: ActivityAction.SYSTEM_EVENT,
          entity: EntityType.SYSTEM,
          severity: LogSeverity.ERROR,

          success: false,

          metadata: {
            alertType,
            ...data
          }
        }
      });

    } catch (error) {
      console.error('Failed to store alert in database:', error);
    }
    
    // In production, you would send notifications here
    // await this.sendAlertNotification(alertType, data);
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    // Request metrics
    let totalRequests = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;
    
    for (const requests of this.metrics.requests.values()) {
      const recentRequests = requests.filter(r => r.timestamp > fiveMinutesAgo);
      totalRequests += recentRequests.length;
      totalErrors += recentRequests.filter(r => r.isError).length;
      totalResponseTime += recentRequests.reduce((sum, r) => sum + r.responseTime, 0);
    }
    
    const avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    // System metrics
    const latestSystemMetrics = Array.from(this.metrics.system.values()).pop();
    
    return {
      timestamp: new Date().toISOString(),
      requests: {
        total: totalRequests,
        errors: totalErrors,
        errorRate: (errorRate * 100).toFixed(2),
        avgResponseTime: Math.round(avgResponseTime)
      },
      system: latestSystemMetrics ? {
        memoryUsage: latestSystemMetrics.memory.percentage.toFixed(2),
        cpuLoad: latestSystemMetrics.cpu.loadAverage[0].toFixed(2),
        uptime: Math.round(latestSystemMetrics.uptime)
      } : null,
      alerts: {
        active: this.alertHistory.size,
        lastCheck: new Date().toISOString()
      }
    };
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '1 hour',
      endpoints: {},
      errors: {},
      system: []
    };
    
    // Endpoint performance
    for (const [endpoint, requests] of this.metrics.requests) {
      const recentRequests = requests.filter(r => r.timestamp > oneHourAgo);
      
      if (recentRequests.length > 0) {
        const errors = recentRequests.filter(r => r.isError);
        const responseTimes = recentRequests.map(r => r.responseTime);
        
        report.endpoints[endpoint] = {
          requests: recentRequests.length,
          errors: errors.length,
          errorRate: (errors.length / recentRequests.length * 100).toFixed(2),
          avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes),
          p95ResponseTime: this.calculatePercentile(responseTimes, 95)
        };
      }
    }
    
    // Error summary
    for (const [errorType, errors] of this.metrics.errors) {
      const recentErrors = errors.filter(e => e.timestamp > oneHourAgo);
      
      if (recentErrors.length > 0) {
        report.errors[errorType] = {
          count: recentErrors.length,
          lastOccurrence: new Date(Math.max(...recentErrors.map(e => e.timestamp))).toISOString(),
          endpoints: [...new Set(recentErrors.map(e => e.endpoint).filter(Boolean))]
        };
      }
    }
    
    // System metrics over time
    const recentSystemMetrics = Array.from(this.metrics.system.entries())
      .filter(([timestamp]) => timestamp > oneHourAgo)
      .map(([timestamp, metrics]) => ({
        timestamp: new Date(timestamp).toISOString(),
        memoryUsage: metrics.memory.percentage.toFixed(2),
        cpuLoad: metrics.cpu.loadAverage[0].toFixed(2)
      }));
    
    report.system = recentSystemMetrics;
    
    return report;
  }

  /**
   * Calculate percentile from array of numbers
   */
  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] || 0);
  }

  /**
   * Clear old metrics data
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean up old request metrics
    for (const [endpoint, requests] of this.metrics.requests) {
      const recentRequests = requests.filter(r => r.timestamp > oneHourAgo);
      this.metrics.requests.set(endpoint, recentRequests);
    }
    
    // Clean up old error metrics
    for (const [errorType, errors] of this.metrics.errors) {
      const recentErrors = errors.filter(e => e.timestamp > oneHourAgo);
      this.metrics.errors.set(errorType, recentErrors);
    }
    
    // Clean up old alert history
    for (const [alertKey, timestamp] of this.alertHistory) {
      if (timestamp < oneHourAgo) {
        this.alertHistory.delete(alertKey);
      }
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = {
  MonitoringService,
  monitoringService
};