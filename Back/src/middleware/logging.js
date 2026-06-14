const { PrismaClient } = require('@prisma/client');
const loggingService = require('../services/loggingService');

const prisma = new PrismaClient();

/**
 * API Request Logging Middleware
 * Logs all API requests to the ApiLog table with enhanced performance tracking
 */
const apiRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store request start time for performance tracking
  req.startTime = startTime;
  
  // Capture original res.end to log after response
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Call original end method
    originalEnd.apply(this, args);
    
    // Log the request asynchronously
    setImmediate(async () => {
      try {
        const responseTime = Date.now() - startTime;
        
        const requestData = {
          method: req.method,
          endpoint: req.originalUrl || req.url,
          userId: req.user?.id || null,
          status: res.statusCode,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || null,
          responseTime: responseTime
        };

        await loggingService.logApiRequest(requestData);

        // Log slow requests as performance issues
        if (responseTime > 1000) {
          await loggingService.logActivity(
            'performance.slow_request',
            'Performance',
            null,
            {
              endpoint: requestData.endpoint,
              method: requestData.method,
              responseTime,
              statusCode: res.statusCode,
              userId: requestData.userId
            },
            req
          );
        }
      } catch (error) {
        console.error('Failed to log API request:', error);
      }
    });
  };
  
  next();
};

/**
 * Activity Logging Utility
 * Logs user activities and business actions to ActivityLog table
 */
const logActivity = async (action, entity, entityId = null, details = null, req = null) => {
  try {
    return await loggingService.logActivity(action, entity, entityId, details, req);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

/**
 * Activity Logging Middleware Factory
 * Creates middleware that logs specific activities
 */
const createActivityLogger = (action, entity) => {
  return (req, res, next) => {
    // Store original res.json to capture response data
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            let entityId = null;
            let details = {};

            // Extract entity ID from response or request
            if (data && data.id) {
              entityId = data.id;
            } else if (req.params && req.params.id) {
              entityId = parseInt(req.params.id);
            }

            // Add relevant details based on the action
            if (req.method === 'POST' && data) {
              details.created = true;
              details.data = data;
            } else if (req.method === 'PUT' || req.method === 'PATCH') {
              details.updated = true;
              details.changes = req.body;
            } else if (req.method === 'DELETE') {
              details.deleted = true;
            }

            await logActivity(action, entity, entityId, details, req);
          } catch (error) {
            console.error('Failed to log activity in middleware:', error);
          }
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Error Logging Middleware
 * Captures and logs errors with comprehensive categorization and alerting
 */
const errorLogger = (err, req, res, next) => {
  // Log error asynchronously
  setImmediate(async () => {
    try {
      await loggingService.logError(err, req, {
        requestId: req.id || req.headers['x-request-id'],
        sessionId: req.sessionID,
        requestBody: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
        queryParams: req.query
      });
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
  });

  // Continue with error handling
  next(err);
};

/**
 * Unhandled Error Logger
 * Logs unhandled promise rejections and uncaught exceptions
 */
const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    try {
      await loggingService.logError(
        new Error(`Unhandled Promise Rejection: ${reason}`),
        null,
        {
          type: 'unhandled_rejection',
          promise: promise.toString(),
          severity: 'critical'
        }
      );
    } catch (logError) {
      console.error('Failed to log unhandled rejection:', logError);
    }
  });

  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    
    try {
      await loggingService.logError(
        error,
        null,
        {
          type: 'uncaught_exception',
          severity: 'critical'
        }
      );
    } catch (logError) {
      console.error('Failed to log uncaught exception:', logError);
    }
    
    // Exit process after logging
    process.exit(1);
  });
};

/**
 * Security Event Logger
 * Logs security-related events like failed login attempts
 */
const logSecurityEvent = async (event, details = null, req = null) => {
  try {
    return await loggingService.logSecurityEvent(event, details, req);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Performance Logger
 * Enhanced performance logging with detailed metrics
 */
const performanceLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      
      // Log performance metrics for all requests above threshold
      if (responseTime > threshold) {
        setImmediate(async () => {
          try {
            await loggingService.logActivity(
              'performance.slow_request',
              'Performance',
              null,
              {
                endpoint: req.originalUrl || req.url,
                method: req.method,
                responseTime,
                threshold,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent'),
                queryParams: req.query,
                bodySize: req.get('Content-Length') || 0,
                severity: responseTime > 5000 ? 'high' : responseTime > 2000 ? 'medium' : 'low'
              },
              req
            );
          } catch (error) {
            console.error('Failed to log performance data:', error);
          }
        });
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

/**
 * Session Tracking Middleware
 * Tracks user sessions and API usage patterns
 */
const sessionTracker = (req, res, next) => {
  // Track session information
  if (req.user) {
    setImmediate(async () => {
      try {
        await loggingService.logActivity(
          'session.api_usage',
          'Session',
          null,
          {
            userId: req.user.id,
            endpoint: req.originalUrl || req.url,
            method: req.method,
            timestamp: new Date(),
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
          },
          req
        );
      } catch (error) {
        console.error('Failed to log session data:', error);
      }
    });
  }
  
  next();
};

module.exports = {
  apiRequestLogger,
  logActivity,
  createActivityLogger,
  errorLogger,
  logSecurityEvent,
  performanceLogger,
  sessionTracker,
  setupGlobalErrorHandlers,
  loggingService
};