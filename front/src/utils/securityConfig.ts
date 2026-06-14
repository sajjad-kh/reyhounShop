/**
 * Security Configuration
 * Centralized security settings and policies
 */

/**
 * Content Security Policy Configuration
 */
export const CSP_CONFIG = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "http://localhost:3000", "https:"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
    },
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
};

/**
 * Allowed file types for uploads
 */
export const ALLOWED_FILE_TYPES = {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    documents: ['pdf', 'doc', 'docx', 'txt'],
    all: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'txt'],
};

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
    avatar: 2 * 1024 * 1024, // 2MB
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
    },
    register: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
    },
    api: {
        maxAttempts: 100,
        windowMs: 60 * 1000, // 1 minute
    },
    search: {
        maxAttempts: 30,
        windowMs: 60 * 1000, // 1 minute
    },
};

/**
 * Password policy
 */
export const PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    preventCommonPasswords: true,
    commonPasswords: [
        'password',
        '12345678',
        'qwerty',
        'abc123',
        'password123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
        '1234567890',
    ],
};

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
    tokenLifetime: 3600000, // 1 hour in milliseconds
    refreshTokenLifetime: 7 * 24 * 3600000, // 7 days in milliseconds
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    maxConcurrentSessions: 3,
};

/**
 * Input validation limits
 */
export const INPUT_LIMITS = {
    email: {
        maxLength: 254,
    },
    name: {
        minLength: 2,
        maxLength: 50,
    },
    address: {
        minLength: 5,
        maxLength: 200,
    },
    city: {
        minLength: 2,
        maxLength: 50,
    },
    phone: {
        maxLength: 20,
    },
    searchQuery: {
        maxLength: 100,
    },
    comment: {
        maxLength: 1000,
    },
    review: {
        maxLength: 2000,
    },
    discountCode: {
        minLength: 3,
        maxLength: 20,
    },
};

/**
 * Allowed origins for CORS
 */
export const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    // Add production domains here
];

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(self)',
};

/**
 * Sensitive data patterns to detect and prevent logging
 */
export const SENSITIVE_DATA_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /credit[_-]?card/i,
    /cvv/i,
    /ssn/i,
    /social[_-]?security/i,
];

/**
 * XSS prevention patterns
 */
export const XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /eval\(/gi,
    /expression\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
];

/**
 * SQL injection prevention patterns
 */
export const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b).*?=.*?/gi,
    /(\bUNION\b.*?\bSELECT\b)/gi,
    /('|")\s*(OR|AND)\s*('|")/gi,
];

/**
 * Trusted domains for external resources
 */
export const TRUSTED_DOMAINS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
];

/**
 * Security event types
 */
export enum SecurityEventType {
    XSS_ATTEMPT = 'xss_attempt',
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    INVALID_TOKEN = 'invalid_token',
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity',
    CSRF_TOKEN_MISMATCH = 'csrf_token_mismatch',
    FILE_UPLOAD_VIOLATION = 'file_upload_violation',
}

/**
 * Security event logger
 */
export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: number;
    details: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log security event
 */
export const logSecurityEvent = (event: SecurityEvent): void => {
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
        // Send to monitoring service
        console.error('[SECURITY EVENT]', event);
    } else {
        console.warn('[SECURITY EVENT]', event);
    }

    // Store in session for debugging (limited to last 50 events)
    const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
    events.push(event);
    if (events.length > 50) {
        events.shift();
    }
    sessionStorage.setItem('security_events', JSON.stringify(events));
};

/**
 * Get security events
 */
export const getSecurityEvents = (): SecurityEvent[] => {
    return JSON.parse(sessionStorage.getItem('security_events') || '[]');
};

/**
 * Clear security events
 */
export const clearSecurityEvents = (): void => {
    sessionStorage.removeItem('security_events');
};

export default {
    CSP_CONFIG,
    ALLOWED_FILE_TYPES,
    FILE_SIZE_LIMITS,
    RATE_LIMIT_CONFIG,
    PASSWORD_POLICY,
    SESSION_CONFIG,
    INPUT_LIMITS,
    ALLOWED_ORIGINS,
    SECURITY_HEADERS,
    SENSITIVE_DATA_PATTERNS,
    XSS_PATTERNS,
    SQL_INJECTION_PATTERNS,
    TRUSTED_DOMAINS,
    SecurityEventType,
    logSecurityEvent,
    getSecurityEvents,
    clearSecurityEvents,
};
