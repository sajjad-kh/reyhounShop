/**
 * Monitoring Integration Middleware
 * Integrates request/response monitoring with the monitoring service
 */

const { monitoringService } = require('../services/monitoringService');

/**
 * Normalize dynamic paths to avoid high-cardinality metrics keys.
 */
function normalizePath(path = '') {
  if (!path || typeof path !== 'string') return '/';

  return path
    // UUID-like segments
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi, '/:id')
    // Mongo/ObjectId-like 24 hex segments
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id')
    // Numeric id segments
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

/**
 * Request monitoring middleware
 * Records all API requests for performance analysis
 */
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    const normalizedPath = normalizePath(req.route ? req.route.path : req.path);
    monitoringService.recordRequest(
      req.method,
      normalizedPath,
      res.statusCode,
      responseTime,
      req.user?.id
    );
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Error monitoring middleware
 * Records errors for analysis and alerting
 */
const errorMonitoring = (error, req, res, next) => {
  // Record error metrics
  monitoringService.recordError(
    error,
    req.path,
    req.method,
    req.user?.id
  );
  
  // Continue with error handling
  next(error);
};

/**
 * Performance monitoring middleware
 * Tracks slow requests and performance issues
 */
const performanceMonitoring = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.json to capture performance metrics
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Log slow requests
      if (responseTime > threshold) {
        console.warn(`🐌 Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`, {
          method: req.method,
          path: req.path,
          responseTime,
          userId: req.user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Database query monitoring middleware
 * Tracks database performance and slow queries
 */
const databaseMonitoring = (req, res, next) => {
  // This would integrate with Prisma middleware to track query performance
  // For now, we'll add it as a placeholder for future implementation
  
  next();
};

/**
 * Memory monitoring middleware
 * Tracks memory usage patterns
 */
const memoryMonitoring = (req, res, next) => {
  const memBefore = process.memoryUsage();
  
  // Override res.end to measure memory usage
  const originalEnd = res.end;
  res.end = function(...args) {
    const memAfter = process.memoryUsage();
    const memDiff = {
      rss: memAfter.rss - memBefore.rss,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      external: memAfter.external - memBefore.external
    };
    
    // Log significant memory increases
    if (memDiff.heapUsed > 10 * 1024 * 1024) { // 10MB increase
      console.warn(`🧠 High memory usage detected: ${req.method} ${req.path}`, {
        memoryIncrease: Math.round(memDiff.heapUsed / 1024 / 1024) + 'MB',
        totalHeapUsed: Math.round(memAfter.heapUsed / 1024 / 1024) + 'MB'
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * API rate monitoring middleware
 * Tracks API usage patterns and potential abuse
 */
const rateMonitoring = (req, res, next) => {
  const clientId = req.ip || 'unknown';
  const endpoint = req.path;
  const now = Date.now();
  
  // This would integrate with rate limiting to track usage patterns
  // For now, we'll add basic logging
  
  if (req.rateLimit) {
    const { limit, remaining, reset } = req.rateLimit;
    
    // Log when rate limit is approaching
    if (remaining < limit * 0.1) { // Less than 10% remaining
      console.warn(`⚡ Rate limit approaching for ${clientId}: ${remaining}/${limit} remaining`);
    }
  }
  
  next();
};

/**
 * Security monitoring middleware
 * Tracks security-related events and potential threats
 */
const securityMonitoring = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code injection
  ];
  
  // Keep inspection payload small to avoid per-request overhead.
  const requestData = [
    req.url || '',
    JSON.stringify(req.query || {}),
    // Scan body only for methods that usually include payload.
    ['POST', 'PUT', 'PATCH'].includes(req.method)
      ? JSON.stringify(req.body || {}).slice(0, 4000)
      : ''
  ].join(' ');
  
  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      console.warn(`🔒 Suspicious request detected from ${req.ip}:`, {
        pattern: pattern.toString(),
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      // Record as security event
      monitoringService.recordError(
        new Error(`Suspicious request pattern: ${pattern.toString()}`),
        req.path,
        req.method,
        req.user?.id
      );
      
      break;
    }
  }
  
  next();
};

/**
 * Business metrics monitoring middleware
 * Tracks business-specific metrics and KPIs
 */
const businessMetricsMonitoring = (req, res, next) => {
  // Track business events
  const businessEvents = {
    'POST /api/v1/auth/register': 'user_registration',
    'POST /api/v1/orders': 'order_created',
    'POST /api/v1/payments/verify': 'payment_completed',
    'POST /api/v1/cart/items': 'item_added_to_cart',
    'POST /api/v1/products/:id/reviews': 'review_submitted'
  };
  
  const eventKey = `${req.method} ${req.route?.path || req.path}`;
  const eventType = businessEvents[eventKey];
  
  if (eventType) {
    // Override res.json to capture successful business events
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.info(`📊 Business event: ${eventType}`, {
          userId: req.user?.id,
          timestamp: new Date().toISOString(),
          data: eventType === 'order_created' ? { orderId: data.order?.id } : {}
        });
      }
      
      return originalJson.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  requestMonitoring,
  errorMonitoring,
  performanceMonitoring,
  databaseMonitoring,
  memoryMonitoring,
  rateMonitoring,
  securityMonitoring,
  businessMetricsMonitoring
};