const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./utils/database');
const {
  securityHeaders,
  corsOptions,
  apiRateLimiter,
  sanitizeInput,
  apiRequestLogger,
  performanceLogger,
  errorLogger,
  globalErrorHandler,
  notFoundHandler,
  addRequestId
} = require('./middleware');
const {
  responseCompression,
  cacheHeaders,
  responseTimeMonitor,
  paginationOptimizer,
  dataSerializer,
  endpointOptimizer,
  etagGenerator,
  contentNegotiation
} = require('./middleware/responseOptimization');
const {
  detectVersion,
  versionConfig,
  backwardCompatibility,
  deprecationWarning,
  validateVersion
} = require('./middleware/versioning');
const { setupGlobalErrorHandlers } = require('./middleware/logging');
const notificationQueue = require('./utils/notificationQueue');
const { monitoringService } = require('./services/monitoringService');
const shippingMethodScheduler = require('./services/shippingMethodScheduler');
const {
  requestMonitoring,
  errorMonitoring,
  performanceMonitoring,
  securityMonitoring,
  businessMetricsMonitoring
} = require('./middleware/monitoring');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request ID middleware
app.use(addRequestId);

// Response compression (should be early in middleware stack)
app.use(responseCompression);

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Cache headers for static content and API responses
app.use(cacheHeaders);

// Response time monitoring
app.use(responseTimeMonitor);

// Content negotiation
app.use(contentNegotiation);

// API versioning middleware
app.use('/api', detectVersion);
app.use('/api', validateVersion);
app.use('/api', versionConfig);
app.use('/api', backwardCompatibility);
app.use('/api', deprecationWarning);

// Rate limiting for API routes
app.use('/api', apiRateLimiter);

// Performance monitoring
app.use(performanceLogger(1000)); // Log requests taking more than 1 second

// API request logging
app.use('/api', apiRequestLogger);

// Request monitoring
app.use('/api', requestMonitoring);

// Security monitoring
app.use('/api', securityMonitoring);

// Business metrics monitoring
app.use('/api', businessMetricsMonitoring);

// Pagination optimization
app.use('/api', paginationOptimizer);

// Endpoint-specific optimizations
app.use('/api', endpointOptimizer);

// ETag generation for cacheable responses
app.use('/api', etagGenerator);

// Data serialization optimization
app.use('/api', dataSerializer);

// Input sanitization
app.use(sanitizeInput);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')), express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { databaseHealthCheck } = require('./utils/database');
    const dbHealth = await databaseHealthCheck.getQuickStatus();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

// Detailed health check endpoint
app.get('/health/detailed', async (req, res) => {
  try {
    const { databaseHealthCheck } = require('./utils/database');
    const healthReport = await databaseHealthCheck.performHealthCheck();
    
    const statusCode = healthReport.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthReport);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Swagger documentation setup
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// API routes
const v1Routes = require('./api/v1');
const v2Routes = require('./api/v2');
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// 404 handler
app.use(notFoundHandler);

// Error logging middleware
app.use(errorLogger);

// Error monitoring middleware
app.use(errorMonitoring);

// Global error handler
app.use(globalErrorHandler);

// Initialize database connection and start server
const startServer = async () => {
  try {
    // ================= GLOBAL ERROR HANDLERS =================
    setupGlobalErrorHandlers();

    // ================= DATABASE =================
    await connectDatabase();
    console.log('📦 Database connected successfully');

    // ================= LOAD ROUTES AFTER DB =================
    const v1Routes = require('./api/v1');
    const v2Routes = require('./api/v2');

    app.use('/api/v1', v1Routes);
    app.use('/api/v2', v2Routes);

    // ================= START BACKGROUND SERVICES =================
    // بدون setTimeout های غیرضروری (تمیزتر و قابل کنترل‌تر)

    try {
      notificationQueue.start();
      console.log('📧 Notification queue started');
    } catch (e) {
      console.error('Notification queue failed:', e.message);
    }

    try {
      monitoringService.start();
      console.log('📊 Monitoring service started');
    } catch (e) {
      console.error('Monitoring service failed:', e.message);
    }

    try {
      shippingMethodScheduler.start();
      console.log('🚚 Shipping scheduler started');
    } catch (e) {
      console.error('Shipping scheduler failed:', e.message);
    }

    // ================= START SERVER =================
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API v1: http://localhost:${PORT}/api/v1`);
      console.log(`🔗 API v2: http://localhost:${PORT}/api/v2`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;