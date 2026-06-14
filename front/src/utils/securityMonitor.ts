/**
 * Security Monitoring
 * Real-time security monitoring and threat detection
 */

import {
    detectXSS,
    detectSQLInjection,
    RateLimiter,
} from './security';
import {
    SecurityEventType,
    logSecurityEvent,
    RATE_LIMIT_CONFIG,
} from './securityConfig';

/**
 * Security Monitor Class
 */
export class SecurityMonitor {
    private static instance: SecurityMonitor;
    private rateLimiters: Map<string, RateLimiter> = new Map();
    private suspiciousActivityCount: Map<string, number> = new Map();
    private readonly SUSPICIOUS_THRESHOLD = 5;

    private constructor() {
        this.initializeRateLimiters();
        this.setupEventListeners();
    }

    public static getInstance(): SecurityMonitor {
        if (!SecurityMonitor.instance) {
            SecurityMonitor.instance = new SecurityMonitor();
        }
        return SecurityMonitor.instance;
    }

    /**
     * Initialize rate limiters for different actions
     */
    private initializeRateLimiters(): void {
        Object.entries(RATE_LIMIT_CONFIG).forEach(([key, config]) => {
            this.rateLimiters.set(
                key,
                new RateLimiter(config.maxAttempts, config.windowMs)
            );
        });
    }

    /**
     * Setup security event listeners
     */
    private setupEventListeners(): void {
        // Listen for API errors
        window.addEventListener('apiError', ((event: CustomEvent) => {
            this.handleApiError(event.detail);
        }) as EventListener);

        // Listen for auth state changes
        window.addEventListener('authStateChanged', ((event: CustomEvent) => {
            this.handleAuthStateChange(event.detail);
        }) as EventListener);

        // Monitor form submissions
        document.addEventListener('submit', (event) => {
            this.monitorFormSubmission(event);
        });

        // Monitor input changes for suspicious patterns
        document.addEventListener('input', (event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                this.monitorInput(event.target);
            }
        });
    }

    /**
     * Check rate limit for an action
     */
    public checkRateLimit(action: string, identifier: string): boolean {
        const limiter = this.rateLimiters.get(action);
        if (!limiter) {
            console.warn(`No rate limiter configured for action: ${action}`);
            return true;
        }

        const allowed = limiter.isAllowed(identifier);

        if (!allowed) {
            logSecurityEvent({
                type: SecurityEventType.RATE_LIMIT_EXCEEDED,
                timestamp: Date.now(),
                details: {
                    action,
                    identifier,
                    remaining: limiter.getRemainingAttempts(identifier),
                },
                severity: 'medium',
            });
        }

        return allowed;
    }

    /**
     * Monitor input for suspicious patterns
     */
    private monitorInput(input: HTMLInputElement | HTMLTextAreaElement): void {
        const value = input.value;

        // Skip monitoring for password fields
        if (input.type === 'password') {
            return;
        }

        // Check for XSS attempts
        if (detectXSS(value)) {
            this.recordSuspiciousActivity('xss_attempt');
            logSecurityEvent({
                type: SecurityEventType.XSS_ATTEMPT,
                timestamp: Date.now(),
                details: {
                    inputName: input.name,
                    inputId: input.id,
                    pattern: 'XSS pattern detected',
                },
                severity: 'high',
            });
        }

        // Check for SQL injection attempts
        if (detectSQLInjection(value)) {
            this.recordSuspiciousActivity('sql_injection_attempt');
            logSecurityEvent({
                type: SecurityEventType.SQL_INJECTION_ATTEMPT,
                timestamp: Date.now(),
                details: {
                    inputName: input.name,
                    inputId: input.id,
                    pattern: 'SQL injection pattern detected',
                },
                severity: 'high',
            });
        }
    }

    /**
     * Monitor form submissions
     */
    private monitorFormSubmission(event: Event): void {
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);

        // Check all form fields for suspicious patterns
        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                if (detectXSS(value)) {
                    this.recordSuspiciousActivity('xss_attempt');
                    logSecurityEvent({
                        type: SecurityEventType.XSS_ATTEMPT,
                        timestamp: Date.now(),
                        details: {
                            form: form.id || form.name,
                            field: key,
                            pattern: 'XSS pattern in form submission',
                        },
                        severity: 'high',
                    });
                }

                if (detectSQLInjection(value)) {
                    this.recordSuspiciousActivity('sql_injection_attempt');
                    logSecurityEvent({
                        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
                        timestamp: Date.now(),
                        details: {
                            form: form.id || form.name,
                            field: key,
                            pattern: 'SQL injection pattern in form submission',
                        },
                        severity: 'high',
                    });
                }
            }
        });
    }

    /**
     * Handle API errors
     */
    private handleApiError(error: any): void {
        if (error.type === 'forbidden') {
            logSecurityEvent({
                type: SecurityEventType.UNAUTHORIZED_ACCESS,
                timestamp: Date.now(),
                details: {
                    error: error.error,
                },
                severity: 'medium',
            });
        } else if (error.type === 'rateLimit') {
            logSecurityEvent({
                type: SecurityEventType.RATE_LIMIT_EXCEEDED,
                timestamp: Date.now(),
                details: {
                    error: error.error,
                },
                severity: 'low',
            });
        }
    }

    /**
     * Handle auth state changes
     */
    private handleAuthStateChange(detail: any): void {
        if (!detail.isAuthenticated) {
            // Clear suspicious activity tracking on logout
            this.suspiciousActivityCount.clear();
        }
    }

    /**
     * Record suspicious activity
     */
    private recordSuspiciousActivity(type: string): void {
        const count = (this.suspiciousActivityCount.get(type) || 0) + 1;
        this.suspiciousActivityCount.set(type, count);

        if (count >= this.SUSPICIOUS_THRESHOLD) {
            logSecurityEvent({
                type: SecurityEventType.SUSPICIOUS_ACTIVITY,
                timestamp: Date.now(),
                details: {
                    activityType: type,
                    count,
                    threshold: this.SUSPICIOUS_THRESHOLD,
                },
                severity: 'critical',
            });

            // Reset counter
            this.suspiciousActivityCount.set(type, 0);

            // In production, might want to lock the account or require re-authentication
            if (import.meta.env.PROD) {
                this.handleCriticalThreat(type);
            }
        }
    }

    /**
     * Handle critical security threats
     */
    private handleCriticalThreat(type: string): void {
        console.error(`Critical security threat detected: ${type}`);

        // Show warning to user
        window.dispatchEvent(new CustomEvent('securityThreat', {
            detail: {
                type,
                message: 'Suspicious activity detected. Please refresh the page and try again.',
            },
        }));

        // Could implement additional measures:
        // - Force logout
        // - Lock account temporarily
        // - Require re-authentication
        // - Contact security team
    }

    /**
     * Validate session integrity
     */
    public validateSession(): boolean {
        // Check if session storage is intact
        try {
            const testKey = '__session_test__';
            sessionStorage.setItem(testKey, 'test');
            const value = sessionStorage.getItem(testKey);
            sessionStorage.removeItem(testKey);

            if (value !== 'test') {
                logSecurityEvent({
                    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
                    timestamp: Date.now(),
                    details: {
                        issue: 'Session storage integrity check failed',
                    },
                    severity: 'high',
                });
                return false;
            }
        } catch (error) {
            logSecurityEvent({
                type: SecurityEventType.SUSPICIOUS_ACTIVITY,
                timestamp: Date.now(),
                details: {
                    issue: 'Session storage access failed',
                    error: String(error),
                },
                severity: 'high',
            });
            return false;
        }

        return true;
    }

    /**
     * Monitor for tab visibility changes (potential security risk)
     */
    public setupVisibilityMonitoring(): void {
        let hiddenTime: number | null = null;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                hiddenTime = Date.now();
            } else {
                if (hiddenTime) {
                    const duration = Date.now() - hiddenTime;

                    // If tab was hidden for more than 30 minutes, validate session
                    if (duration > 30 * 60 * 1000) {
                        this.validateSession();
                    }

                    hiddenTime = null;
                }
            }
        });
    }

    /**
     * Get security status
     */
    public getSecurityStatus(): {
        rateLimits: Record<string, number>;
        suspiciousActivity: Record<string, number>;
        sessionValid: boolean;
    } {
        const rateLimits: Record<string, number> = {};
        this.rateLimiters.forEach((limiter, key) => {
            rateLimits[key] = limiter.getRemainingAttempts('default');
        });

        const suspiciousActivity: Record<string, number> = {};
        this.suspiciousActivityCount.forEach((count, type) => {
            suspiciousActivity[type] = count;
        });

        return {
            rateLimits,
            suspiciousActivity,
            sessionValid: this.validateSession(),
        };
    }

    /**
     * Reset rate limiter for a specific action
     */
    public resetRateLimit(action: string, identifier: string): void {
        const limiter = this.rateLimiters.get(action);
        if (limiter) {
            limiter.reset(identifier);
        }
    }

    /**
     * Clear all monitoring data
     */
    public clearMonitoringData(): void {
        this.suspiciousActivityCount.clear();
        // Rate limiters will naturally expire based on their time windows
        // No need to manually clear them
    }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

export default securityMonitor;
