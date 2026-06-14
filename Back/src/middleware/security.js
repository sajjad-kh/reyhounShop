const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Joi = require('joi');
const { logSecurityEvent } = require('./logging');

/**
 * Rate Limiting Configuration
 * Implements 100 requests per minute per IP as per requirements
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom handler to log rate limit violations
    handler: async (req, res) => {
      // Log security event for rate limiting
      await logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      }, req);
      
      res.status(429).json(options.message || defaultOptions.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Strict Rate Limiter for Authentication Endpoints
 * More restrictive limits for sensitive operations
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.'
    }
  }
});

/**
 * API Rate Limiter
 * Standard rate limiting for API endpoints
 */
const apiRateLimiter = createRateLimiter();

/**
 * Security Headers Middleware
 * Configures Helmet with appropriate security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "http://localhost:3000"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false, // Allow embedding for API documentation
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * Input Validation Middleware Factory
 * Creates validation middleware using Joi schemas
 */
const validateInput = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: validationErrors
        }
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Common Validation Schemas
 */
const validationSchemas = {
  // User registration validation
  userRegistration: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    birthDate: Joi.date().max('now').optional()
  }),

  // User login validation
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Product creation validation
  productCreation: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().integer().min(0).required(),
    discountPrice: Joi.number().integer().min(0).optional(),
    stock: Joi.number().integer().min(0).required(),
    categoryId: Joi.number().integer().positive().required(),
    lowStockAlert: Joi.number().integer().min(0).default(5)
  }),

  // Order creation validation
  orderCreation: Joi.object({
    addressId: Joi.number().integer().positive().required(),
    discountCode: Joi.string().max(50).optional()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50).optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  })
};

/**
 * Sanitization Middleware
 * Sanitizes input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * CORS Configuration
 * Configures Cross-Origin Resource Sharing
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-2FA-Token', 'X-Request-ID', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID']
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  securityHeaders,
  validateInput,
  validationSchemas,
  sanitizeInput,
  corsOptions
};