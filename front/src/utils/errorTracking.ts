/**
 * Error Tracking and Reporting
 * Centralized error handling and reporting system
 */

import { analytics } from './analytics';

export interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    additionalData?: Record<string, any>;
}

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export interface TrackedError {
    id: string;
    message: string;
    stack?: string;
    severity: ErrorSeverity;
    context?: ErrorContext;
    timestamp: number;
    url: string;
    userAgent: string;
    resolved: boolean;
}

class ErrorTracker {
    private static instance: ErrorTracker;
    private errors: TrackedError[] = [];
    private readonly MAX_ERRORS = 100;
    private errorListeners: ((error: TrackedError) => void)[] = [];

    private constructor() {
        this.setupGlobalErrorHandlers();
    }

    public static getInstance(): ErrorTracker {
        if (!ErrorTracker.instance) {
            ErrorTracker.instance = new ErrorTracker();
        }
        return ErrorTracker.instance;
    }

    private setupGlobalErrorHandlers(): void {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.captureError(
                new Error(event.message),
                {
                    component: 'Global',
                    action: 'Uncaught Error',
                    additionalData: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                    },
                },
                ErrorSeverity.HIGH
            );
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError(
                new Error(`Unhandled Promise Rejection: ${event.reason}`),
                {
                    component: 'Global',
                    action: 'Unhandled Promise Rejection',
                },
                ErrorSeverity.HIGH
            );
        });

        // Handle React errors (if using error boundary)
        window.addEventListener('react-error', ((event: CustomEvent) => {
            this.captureError(
                event.detail.error,
                {
                    component: event.detail.componentStack,
                    action: 'React Error',
                },
                ErrorSeverity.HIGH
            );
        }) as EventListener);
    }

    public captureError(
        error: Error | string,
        context?: ErrorContext,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM
    ): string {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorStack = typeof error === 'object' ? error.stack : undefined;

        const trackedError: TrackedError = {
            id: this.generateErrorId(),
            message: errorMessage,
            stack: errorStack,
            severity,
            context,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            resolved: false,
        };

        // Add to local storage
        this.errors.push(trackedError);

        // Limit stored errors
        if (this.errors.length > this.MAX_ERRORS) {
            this.errors.shift();
        }

        // Persist to localStorage for debugging
        this.persistErrors();

        // Send to analytics
        analytics.trackError({
            message: errorMessage,
            stack: errorStack,
            url: window.location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
        });

        // Notify listeners
        this.notifyListeners(trackedError);

        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('[Error Tracked]', trackedError);
        }

        // Show user-friendly error message for critical errors
        if (severity === ErrorSeverity.CRITICAL) {
            this.showCriticalErrorNotification(errorMessage);
        }

        return trackedError.id;
    }

    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private persistErrors(): void {
        try {
            const recentErrors = this.errors.slice(-20); // Keep last 20 errors
            localStorage.setItem('app_errors', JSON.stringify(recentErrors));
        } catch (e) {
            console.warn('Failed to persist errors to localStorage');
        }
    }

    private loadPersistedErrors(): void {
        try {
            const stored = localStorage.getItem('app_errors');
            if (stored) {
                this.errors = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load persisted errors');
        }
    }

    private showCriticalErrorNotification(message: string): void {
        // Dispatch custom event for UI to handle
        window.dispatchEvent(
            new CustomEvent('criticalError', {
                detail: {
                    message,
                    timestamp: Date.now(),
                },
            })
        );
    }

    public captureException(error: Error, context?: ErrorContext): string {
        return this.captureError(error, context, ErrorSeverity.HIGH);
    }

    public captureMessage(
        message: string,
        context?: ErrorContext,
        severity: ErrorSeverity = ErrorSeverity.LOW
    ): string {
        return this.captureError(message, context, severity);
    }

    public addErrorListener(listener: (error: TrackedError) => void): () => void {
        this.errorListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.errorListeners.indexOf(listener);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        };
    }

    private notifyListeners(error: TrackedError): void {
        this.errorListeners.forEach((listener) => {
            try {
                listener(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });
    }

    public getErrors(filter?: {
        severity?: ErrorSeverity;
        resolved?: boolean;
        component?: string;
    }): TrackedError[] {
        let filtered = [...this.errors];

        if (filter) {
            if (filter.severity) {
                filtered = filtered.filter((e) => e.severity === filter.severity);
            }
            if (filter.resolved !== undefined) {
                filtered = filtered.filter((e) => e.resolved === filter.resolved);
            }
            if (filter.component) {
                filtered = filtered.filter(
                    (e) => e.context?.component === filter.component
                );
            }
        }

        return filtered;
    }

    public markErrorResolved(errorId: string): void {
        const error = this.errors.find((e) => e.id === errorId);
        if (error) {
            error.resolved = true;
            this.persistErrors();
        }
    }

    public clearErrors(): void {
        this.errors = [];
        localStorage.removeItem('app_errors');
    }

    public getErrorStats(): {
        total: number;
        bySeverity: Record<ErrorSeverity, number>;
        unresolved: number;
    } {
        const stats = {
            total: this.errors.length,
            bySeverity: {
                [ErrorSeverity.LOW]: 0,
                [ErrorSeverity.MEDIUM]: 0,
                [ErrorSeverity.HIGH]: 0,
                [ErrorSeverity.CRITICAL]: 0,
            },
            unresolved: 0,
        };

        this.errors.forEach((error) => {
            stats.bySeverity[error.severity]++;
            if (!error.resolved) {
                stats.unresolved++;
            }
        });

        return stats;
    }

    public exportErrors(): string {
        return JSON.stringify(this.errors, null, 2);
    }

    public initialize(): void {
        this.loadPersistedErrors();
    }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Convenience functions
export const captureError = (
    error: Error | string,
    context?: ErrorContext,
    severity?: ErrorSeverity
) => {
    return errorTracker.captureError(error, context, severity);
};

export const captureException = (error: Error, context?: ErrorContext) => {
    return errorTracker.captureException(error, context);
};

export const captureMessage = (
    message: string,
    context?: ErrorContext,
    severity?: ErrorSeverity
) => {
    return errorTracker.captureMessage(message, context, severity);
};

export default errorTracker;
