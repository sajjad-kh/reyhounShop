// Authentication and Authorization
const {
  authenticateToken,
  requireRole,
  require2FA,
  optionalAuth
} = require('./auth');

// Logging
const {
  apiRequestLogger,
  logActivity,
  createActivityLogger,
  errorLogger,
  logSecurityEvent,
  performanceLogger
} = require('./logging');

// Security and Validation
const {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  securityHeaders,
  validateInput,
  validationSchemas,
  sanitizeInput,
  corsOptions
} = require('./security');

// Error Handling
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  addRequestId,
  handlePrismaError
} = require('./errorHandler');

module.exports = {
  // Authentication & Authorization
  authenticateToken,
  requireRole,
  require2FA,
  optionalAuth,
  
  // Logging
  apiRequestLogger,
  logActivity,
  createActivityLogger,
  errorLogger,
  logSecurityEvent,
  performanceLogger,
  
  // Security & Validation
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  securityHeaders,
  validateInput,
  validationSchemas,
  sanitizeInput,
  corsOptions,
  
  // Error Handling
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  addRequestId,
  handlePrismaError
};