/**
 * Monitoring and Health Check API Routes
 * Provides comprehensive system monitoring and diagnostics
 */

const express = require('express');
const { monitoringService } = require('../../services/monitoringService');
const { databaseHealthCheck, databaseConfig } = require('../../utils/database');
const { requireRole } = require('../../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * /api/v1/monitoring/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseHealthCheck.getQuickStatus();
    
    const health = {
      status: dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/health/detailed:
 *   get:
 *     summary: Detailed health check with comprehensive diagnostics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed system health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: object
 *                 system:
 *                   type: object
 *                 performance:
 *                   type: object
 */
router.get('/health/detailed', requireRole(['ADMIN']), async (req, res) => {
  try {
    const [dbHealth, systemMetrics, performanceMetrics] = await Promise.all([
      databaseHealthCheck.performHealthCheck(),
      getSystemDiagnostics(),
      monitoringService.getMetricsSummary()
    ]);
    
    const detailedHealth = {
      status: dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      system: systemMetrics,
      performance: performanceMetrics,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    const statusCode = detailedHealth.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   get:
 *     summary: Get current system metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current system metrics
 */
router.get('/metrics', requireRole(['ADMIN']), async (req, res) => {
  try {
    const metrics = monitoringService.getMetricsSummary();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/performance:
 *   get:
 *     summary: Get detailed performance report
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed performance report
 */
router.get('/performance', requireRole(['ADMIN']), async (req, res) => {
  try {
    const report = monitoringService.getPerformanceReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate performance report',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/database:
 *   get:
 *     summary: Get database performance metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database performance metrics
 */
router.get('/database', requireRole(['ADMIN']), async (req, res) => {
  try {
    const dbMetrics = await databaseConfig.getQueryMetrics();
    const connectionInfo = databaseConfig.getConnectionInfo();
    
    res.json({
      metrics: dbMetrics,
      connection: connectionInfo,
      provider: databaseConfig.getProvider(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/alerts:
 *   get:
 *     summary: Get recent alerts
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of alerts to retrieve
 *     responses:
 *       200:
 *         description: Recent system alerts
 */
router.get('/alerts', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { getPrismaClient } = require('../../utils/database');
    const prisma = getPrismaClient();
    
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    
    const alerts = await prisma.errorLog.findMany({
      where: {
        endpoint: 'MONITORING_SYSTEM',
        method: 'ALERT'
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        message: true,
        stack: true,
        timestamp: true,
        statusCode: true
      }
    });
    
    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.message.replace('Alert: ', ''),
      data: JSON.parse(alert.stack || '{}'),
      timestamp: alert.timestamp,
      severity: alert.statusCode >= 500 ? 'critical' : 'warning'
    }));
    
    res.json({
      alerts: formattedAlerts,
      total: formattedAlerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/system:
 *   get:
 *     summary: Get system resource usage
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System resource usage information
 */
router.get('/system', requireRole(['ADMIN']), async (req, res) => {
  try {
    const systemInfo = await getSystemDiagnostics();
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve system information',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/monitoring/cleanup:
 *   post:
 *     summary: Clean up old monitoring data
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/cleanup', requireRole(['ADMIN']), async (req, res) => {
  try {
    monitoringService.cleanup();
    
    res.json({
      message: 'Monitoring data cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cleanup monitoring data',
      message: error.message
    });
  }
});

/**
 * Get comprehensive system diagnostics
 */
async function getSystemDiagnostics() {
  const os = require('os');
  
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    },
    system: {
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
      freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
      loadAverage: os.loadavg(),
      cpus: os.cpus().length,
      networkInterfaces: Object.keys(os.networkInterfaces()).length
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      databaseProvider: process.env.DATABASE_PROVIDER || 'sqlite'
    }
  };
}

module.exports = router;