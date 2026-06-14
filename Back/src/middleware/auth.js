const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const speakeasy = require('speakeasy');

const prisma = new PrismaClient();

const attachUserToRequest = (req, user) => {
  req.user = {
    ...user,
    userId: user.id
  };
};

/**
 * JWT Token Validation Middleware
 * Validates JWT tokens and sets user context in request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        is2FAEnabled: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token not found'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }

    attachUserToRequest(req, user);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s) to access resource
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        }
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource'
        }
      });
    }

    next();
  };
};

/**
 * Two-Factor Authentication Verification Middleware
 * Validates 2FA token for protected routes when 2FA is enabled
 */
const require2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    // Skip 2FA check if user hasn't enabled it
    if (!req.user.is2FAEnabled) {
      return next();
    }

    const twoFAToken = req.headers['x-2fa-token'];
    
    if (!twoFAToken) {
      return res.status(401).json({
        error: {
          code: 'TWO_FA_REQUIRED',
          message: '2FA token is required for this action'
        }
      });
    }

    // Fetch user's 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFASecret: true }
    });

    if (!user || !user.twoFASecret) {
      return res.status(401).json({
        error: {
          code: 'TWO_FA_NOT_CONFIGURED',
          message: '2FA is not properly configured for this user'
        }
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token: twoFAToken,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    if (!verified) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TWO_FA_TOKEN',
          message: 'Invalid 2FA token'
        }
      });
    }

    next();
  } catch (error) {
    console.error('2FA verification error:', error);
    return res.status(500).json({
      error: {
        code: 'TWO_FA_ERROR',
        message: '2FA verification failed'
      }
    });
  }
};

/**
 * Optional Authentication Middleware
 * Sets user context if token is provided, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token provided, continue without user context
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        is2FAEnabled: true
      }
    });

    if (user && user.isActive) {
      attachUserToRequest(req, user);
    }

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  require2FA,
  optionalAuth
};