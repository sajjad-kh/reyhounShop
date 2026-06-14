const { PrismaClientKnownRequestError, PrismaClientValidationError } = require('@prisma/client/runtime/library');
const { logActivity } = require('./logging');
const { BasalamError, BasalamErrorType } = require('../types/basalam');

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class BusinessLogicError extends AppError {
  constructor(message, code = 'BUSINESS_LOGIC_ERROR') {
    super(message, 422, code);
  }
}

/**
 * Basalam Error Handler
 * Converts Basalam errors to appropriate HTTP responses
 */
const handleBasalamError = (error) => {
  if (!(error instanceof BasalamError)) {
    return error;
  }

  const errorMessages = {
    [BasalamErrorType.NETWORK_ERROR]: 'Unable to connect to Basalam service. Please try again later.',
    [BasalamErrorType.AUTH_ERROR]: 'Authentication with Basalam failed. Please contact support.',
    [BasalamErrorType.VALIDATION_ERROR]: error.message || 'Invalid data provided.',
    [BasalamErrorType.PRODUCT_UNAVAILABLE]: 'One or more products are no longer available.',
    [BasalamErrorType.ORDER_CREATION_FAILED]: 'Failed to create order. Please try again.',
    [BasalamErrorType.PAYMENT_FAILED]: 'Payment processing failed. Please try again.',
    [BasalamErrorType.ORDER_NOT_FOUND]: 'Order not found.',
  };

  const statusCodes = {
    [BasalamErrorType.NETWORK_ERROR]: 503,
    [BasalamErrorType.AUTH_ERROR]: 401,
    [BasalamErrorType.VALIDATION_ERROR]: 400,
    [BasalamErrorType.PRODUCT_UNAVAILABLE]: 400,
    [BasalamErrorType.ORDER_CREATION_FAILED]: 500,
    [BasalamErrorType.PAYMENT_FAILED]: 400,
    [BasalamErrorType.ORDER_NOT_FOUND]: 404,
  };

  const message = errorMessages[error.type] || error.message;
  const statusCode = statusCodes[error.type] || 500;

  const appError = new AppError(message, statusCode, error.type);
  appError.details = error.details;
  appError.isOperational = true;

  return appError;
};

/**
 * Prisma Error Handler
 * Converts Prisma errors to user-friendly responses
 */
const handlePrismaError = (error) => {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        return new ConflictError(`${field} already exists`);
      
      case 'P2025':
        // Record not found
        return new NotFoundError();
      
      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError('Invalid reference to related resource');
      
      case 'P2014':
        // Required relation violation
        return new ValidationError('Required relation missing');
      
      default:
        return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }
  
  if (error instanceof PrismaClientValidationError) {
    return new ValidationError('Invalid data provided');
  }
  
  return error;
};

/**
 * Development Error Response
 * Detailed error information for development environment
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message,
      stack: err.stack,
      details: err.details || null,
      timestamp: new Date().toISOString(),
      requestId: req.id || null,
      path: req.originalUrl || req.url
    }
  });
};

/**
 * Production Error Response
 * Sanitized error information for production environment
 */
const sendErrorProd = (err, req, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    // Programming errors: don't leak error details
    console.error('ERROR:', err);
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;

  // Handle Basalam errors first
  if (err instanceof BasalamError) {
    error = handleBasalamError(err);
    
    // Log Basalam errors with appropriate level
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    console[logLevel]('Basalam API Error:', {
      type: err.type,
      message: error.message,
      details: err.details,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Prisma errors
  if (err.name?.startsWith('Prisma')) {
    error = handlePrismaError(err);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    error = new ValidationError(err.message, err.details);
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File too large');
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError('Unexpected file field');
  }

  // Log error for monitoring
  if (error.statusCode >= 500 && !(err instanceof BasalamError)) {
    console.error('Server Error:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Request ID Middleware
 * Adds unique request ID for tracking
 */
const addRequestId = (req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  
  // Middleware
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  addRequestId,
  
  // Utilities
  handlePrismaError,
  handleBasalamError
};