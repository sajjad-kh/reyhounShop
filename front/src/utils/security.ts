/**
 * Security Utilities
 * Provides input sanitization, XSS protection, and security helpers
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        ALLOW_DATA_ATTR: false,
    });
};

/**
 * Sanitize text content (strips all HTML)
 */
export const sanitizeText = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
};

/**
 * Sanitize user input for safe display
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';

    // Remove any HTML tags
    let sanitized = sanitizeText(input);

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length to prevent DoS
    const MAX_LENGTH = 10000;
    if (sanitized.length > MAX_LENGTH) {
        sanitized = sanitized.substring(0, MAX_LENGTH);
    }

    return sanitized;
};

/**
 * Escape HTML special characters
 */
export const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url: string): string => {
    if (!url) return '';

    try {
        const parsed = new URL(url);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return '';
        }

        return parsed.toString();
    } catch {
        // Invalid URL
        return '';
    }
};

/**
 * Sanitize object by sanitizing all string values
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'string' ? sanitizeInput(item) :
                    typeof item === 'object' && item !== null ? sanitizeObject(item) :
                        item
            );
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized as T;
};

/**
 * Generate a secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate Content Security Policy
 */
export const validateCSP = (): boolean => {
    // Check if CSP meta tag exists
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return cspMeta !== null;
};

/**
 * Secure localStorage wrapper with encryption-like obfuscation
 */
export const secureStorage = {
    /**
     * Set item in localStorage with basic obfuscation
     */
    setItem: (key: string, value: string): void => {
        try {
            // Basic obfuscation (not encryption, just makes it less readable)
            const obfuscated = btoa(encodeURIComponent(value));
            localStorage.setItem(key, obfuscated);
        } catch (error) {
            console.error('Failed to set secure storage item:', error);
        }
    },

    /**
     * Get item from localStorage with deobfuscation
     */
    getItem: (key: string): string | null => {
        try {
            const obfuscated = localStorage.getItem(key);
            if (!obfuscated) return null;

            return decodeURIComponent(atob(obfuscated));
        } catch (error) {
            console.error('Failed to get secure storage item:', error);
            return null;
        }
    },

    /**
     * Remove item from localStorage
     */
    removeItem: (key: string): void => {
        localStorage.removeItem(key);
    },

    /**
     * Clear all items from localStorage
     */
    clear: (): void => {
        localStorage.clear();
    },
};

/**
 * Rate limiting helper for client-side
 */
export class RateLimiter {
    private attempts: Map<string, number[]> = new Map();
    private maxAttempts: number;
    private windowMs: number;

    constructor(maxAttempts: number = 5, windowMs: number = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }

    /**
     * Check if action is allowed
     */
    isAllowed(key: string): boolean {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];

        // Remove old attempts outside the window
        const recentAttempts = attempts.filter(time => now - time < this.windowMs);

        if (recentAttempts.length >= this.maxAttempts) {
            return false;
        }

        // Add current attempt
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);

        return true;
    }

    /**
     * Reset attempts for a key
     */
    reset(key: string): void {
        this.attempts.delete(key);
    }

    /**
     * Get remaining attempts
     */
    getRemainingAttempts(key: string): number {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];
        const recentAttempts = attempts.filter(time => now - time < this.windowMs);

        return Math.max(0, this.maxAttempts - recentAttempts.length);
    }
}

/**
 * Validate JWT token structure (basic client-side validation)
 */
export const validateJWTStructure = (token: string): boolean => {
    if (!token) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
        // Validate that each part is valid base64
        parts.forEach(part => {
            atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        });
        return true;
    } catch {
        return false;
    }
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    if (!validateJWTStructure(token)) return true;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        return payload.exp ? payload.exp < currentTime : true;
    } catch {
        return true;
    }
};

/**
 * Get time until token expiration (in seconds)
 */
export const getTokenExpirationTime = (token: string): number | null => {
    if (!validateJWTStructure(token)) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        return payload.exp ? Math.max(0, payload.exp - currentTime) : null;
    } catch {
        return null;
    }
};

/**
 * Prevent clickjacking by checking if page is in iframe
 */
export const preventClickjacking = (): void => {
    if (window.self !== window.top) {
        // Page is in an iframe - break out of it
        try {
            window.top!.location.href = window.self.location.href;
        } catch (e) {
            // If we can't access top.location due to CORS, just hide the page
            document.body.style.display = 'none';
        }
    }
};

/**
 * Secure form submission helper
 */
export const secureFormSubmit = <T extends Record<string, any>>(
    formData: T,
    options: {
        sanitize?: boolean;
        validate?: (data: T) => boolean;
    } = {}
): T | null => {
    const { sanitize = true, validate } = options;

    // Sanitize if requested
    let processedData = sanitize ? sanitizeObject(formData) : formData;

    // Validate if validator provided
    if (validate && !validate(processedData)) {
        return null;
    }

    return processedData;
};

/**
 * CSRF Token Management
 */
export class CSRFTokenManager {
    private static instance: CSRFTokenManager;
    private token: string | null = null;
    private readonly TOKEN_KEY = 'csrf_token';
    private readonly TOKEN_EXPIRY_KEY = 'csrf_token_expiry';
    private readonly TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds

    private constructor() {
        this.initializeToken();
    }

    public static getInstance(): CSRFTokenManager {
        if (!CSRFTokenManager.instance) {
            CSRFTokenManager.instance = new CSRFTokenManager();
        }
        return CSRFTokenManager.instance;
    }

    /**
     * Initialize or retrieve existing token
     */
    private initializeToken(): void {
        const storedToken = sessionStorage.getItem(this.TOKEN_KEY);
        const expiry = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);

        if (storedToken && expiry && Date.now() < parseInt(expiry, 10)) {
            this.token = storedToken;
        } else {
            this.generateNewToken();
        }
    }

    /**
     * Generate a new CSRF token
     */
    private generateNewToken(): void {
        this.token = generateSecureToken(32);
        const expiry = Date.now() + this.TOKEN_LIFETIME;

        sessionStorage.setItem(this.TOKEN_KEY, this.token);
        sessionStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toString());
    }

    /**
     * Get current CSRF token
     */
    public getToken(): string {
        if (!this.token || this.isTokenExpired()) {
            this.generateNewToken();
        }
        return this.token!;
    }

    /**
     * Validate CSRF token
     */
    public validateToken(token: string): boolean {
        if (!this.token || this.isTokenExpired()) {
            return false;
        }
        return token === this.token;
    }

    /**
     * Check if token is expired
     */
    private isTokenExpired(): boolean {
        const expiry = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);
        if (!expiry) return true;
        return Date.now() >= parseInt(expiry, 10);
    }

    /**
     * Refresh token
     */
    public refreshToken(): string {
        this.generateNewToken();
        return this.token!;
    }

    /**
     * Clear token
     */
    public clearToken(): void {
        this.token = null;
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    }
}

/**
 * Get CSRF token instance
 */
export const csrfToken = CSRFTokenManager.getInstance();

/**
 * Enhanced XSS Protection - Detect potential XSS patterns
 */
export const detectXSS = (input: string): boolean => {
    if (!input) return false;

    // Common XSS patterns
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /<applet/gi,
        /eval\(/gi,
        /expression\(/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize file name to prevent path traversal
 */
export const sanitizeFileName = (fileName: string): string => {
    if (!fileName) return '';

    // Remove path separators and special characters
    let sanitized = fileName.replace(/[\/\\]/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove leading dots to prevent hidden files
    sanitized = sanitized.replace(/^\.+/, '');

    // Limit length
    const MAX_LENGTH = 255;
    if (sanitized.length > MAX_LENGTH) {
        const ext = sanitized.split('.').pop();
        const name = sanitized.substring(0, MAX_LENGTH - (ext ? ext.length + 1 : 0));
        sanitized = ext ? `${name}.${ext}` : name;
    }

    return sanitized;
};

/**
 * Validate file type
 */
export const validateFileType = (
    fileName: string,
    allowedTypes: string[]
): { isValid: boolean; error?: string } => {
    if (!fileName) {
        return { isValid: false, error: 'File name is required' };
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) {
        return { isValid: false, error: 'File must have an extension' };
    }

    if (!allowedTypes.includes(extension)) {
        return {
            isValid: false,
            error: `File type .${extension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        };
    }

    return { isValid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (
    fileSize: number,
    maxSize: number = 5 * 1024 * 1024 // 5MB default
): { isValid: boolean; error?: string } => {
    if (fileSize > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return {
            isValid: false,
            error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
        };
    }

    return { isValid: true };
};

/**
 * Secure password hashing (client-side pre-hashing for additional security)
 * Note: This is NOT a replacement for server-side hashing
 */
export const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Secure comparison to prevent timing attacks
 */
export const secureCompare = (a: string, b: string): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
};

/**
 * Detect SQL injection patterns (basic client-side check)
 */
export const detectSQLInjection = (input: string): boolean => {
    if (!input) return false;

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
        /(--|\#|\/\*|\*\/)/g,
        /(\bOR\b|\bAND\b).*?=.*?/gi,
        /(\bUNION\b.*?\bSELECT\b)/gi,
        /('|")\s*(OR|AND)\s*('|")/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize search query
 */
export const sanitizeSearchQuery = (query: string): string => {
    if (!query) return '';

    // Remove special characters that could be used for injection
    let sanitized = query.replace(/[<>\"'%;()&+]/g, '');

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 100);

    return sanitized;
};

/**
 * Generate nonce for inline scripts (CSP)
 */
export const generateNonce = (): string => {
    return generateSecureToken(16);
};

/**
 * Validate origin for CORS
 */
export const validateOrigin = (origin: string, allowedOrigins: string[]): boolean => {
    if (!origin) return false;

    try {
        const url = new URL(origin);
        return allowedOrigins.some(allowed => {
            if (allowed === '*') return true;
            if (allowed.startsWith('*.')) {
                const domain = allowed.substring(2);
                return url.hostname.endsWith(domain);
            }
            return url.origin === allowed;
        });
    } catch {
        return false;
    }
};

export default {
    sanitizeHtml,
    sanitizeText,
    sanitizeInput,
    sanitizeUrl,
    sanitizeObject,
    escapeHtml,
    generateSecureToken,
    validateCSP,
    secureStorage,
    RateLimiter,
    validateJWTStructure,
    isTokenExpired,
    getTokenExpirationTime,
    preventClickjacking,
    secureFormSubmit,
    CSRFTokenManager,
    csrfToken,
    detectXSS,
    sanitizeFileName,
    validateFileType,
    validateFileSize,
    hashPassword,
    secureCompare,
    detectSQLInjection,
    sanitizeSearchQuery,
    generateNonce,
    validateOrigin,
};
