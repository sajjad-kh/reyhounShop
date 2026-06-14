/**
 * Analytics and Monitoring Utility
 * Tracks user interactions, performance metrics, and errors
 */

import { PerformanceMetrics } from './performance';

export interface AnalyticsEvent {
    category: string;
    action: string;
    label?: string;
    value?: number;
    timestamp: number;
    userId?: string;
    sessionId?: string;
}

export interface ErrorEvent {
    message: string;
    stack?: string;
    url: string;
    line?: number;
    column?: number;
    timestamp: number;
    userId?: string;
    sessionId?: string;
    userAgent: string;
}

export interface PageViewEvent {
    path: string;
    title: string;
    referrer: string;
    timestamp: number;
    userId?: string;
    sessionId?: string;
}

class Analytics {
    private static instance: Analytics;
    private sessionId: string;
    private userId?: string;
    private enabled: boolean;
    private queue: AnalyticsEvent[] = [];
    private readonly BATCH_SIZE = 10;
    private readonly FLUSH_INTERVAL = 30000; // 30 seconds
    private flushTimer?: number;

    private constructor() {
        this.sessionId = this.generateSessionId();
        this.enabled = import.meta.env.PROD;
        this.initializeAnalytics();
    }

    public static getInstance(): Analytics {
        if (!Analytics.instance) {
            Analytics.instance = new Analytics();
        }
        return Analytics.instance;
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeAnalytics(): void {
        // Setup automatic page view tracking
        this.trackPageView();

        // Setup error tracking
        this.setupErrorTracking();

        // Setup performance tracking
        this.setupPerformanceTracking();

        // Setup flush timer
        this.startFlushTimer();

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    private setupErrorTracking(): void {
        window.addEventListener('error', (event) => {
            this.trackError({
                message: event.message,
                stack: event.error?.stack,
                url: event.filename,
                line: event.lineno,
                column: event.colno,
                timestamp: Date.now(),
                userId: this.userId,
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack,
                url: window.location.href,
                timestamp: Date.now(),
                userId: this.userId,
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
            });
        });
    }

    private setupPerformanceTracking(): void {
        if ('PerformanceObserver' in window) {
            // Track long tasks
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        this.trackEvent({
                            category: 'Performance',
                            action: 'Long Task',
                            label: entry.name,
                            value: entry.duration,
                            timestamp: Date.now(),
                        });
                    });
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.warn('Long task observation not supported');
            }
        }
    }

    private startFlushTimer(): void {
        this.flushTimer = window.setInterval(() => {
            this.flush();
        }, this.FLUSH_INTERVAL);
    }

    public setUserId(userId: string): void {
        this.userId = userId;
    }

    public clearUserId(): void {
        this.userId = undefined;
    }

    public trackEvent(event: Omit<AnalyticsEvent, 'userId' | 'sessionId'>): void {
        if (!this.enabled) return;

        const fullEvent: AnalyticsEvent = {
            ...event,
            userId: this.userId,
            sessionId: this.sessionId,
        };

        this.queue.push(fullEvent);

        if (this.queue.length >= this.BATCH_SIZE) {
            this.flush();
        }

        // Log in development
        if (import.meta.env.DEV) {
            console.log('[Analytics Event]', fullEvent);
        }
    }

    public trackPageView(path?: string, title?: string): void {
        const pageView: PageViewEvent = {
            path: path || window.location.pathname,
            title: title || document.title,
            referrer: document.referrer,
            timestamp: Date.now(),
            userId: this.userId,
            sessionId: this.sessionId,
        };

        this.trackEvent({
            category: 'Navigation',
            action: 'Page View',
            label: pageView.path,
            timestamp: Date.now(),
        });

        // Log in development
        if (import.meta.env.DEV) {
            console.log('[Page View]', pageView);
        }
    }

    public trackError(error: ErrorEvent): void {
        if (!this.enabled) {
            console.error('[Error]', error);
            return;
        }

        // Send error immediately (don't queue)
        this.sendToBackend('/api/v1/analytics/errors', error);

        // Log in development
        if (import.meta.env.DEV) {
            console.error('[Tracked Error]', error);
        }
    }

    public trackPerformance(metrics: PerformanceMetrics): void {
        if (!this.enabled) return;

        Object.entries(metrics).forEach(([key, value]) => {
            if (value !== undefined) {
                this.trackEvent({
                    category: 'Performance',
                    action: key.toUpperCase(),
                    value: value,
                    timestamp: Date.now(),
                });
            }
        });
    }

    public trackUserAction(action: string, label?: string, value?: number): void {
        this.trackEvent({
            category: 'User Action',
            action,
            label,
            value,
            timestamp: Date.now(),
        });
    }

    public trackConversion(type: string, value?: number): void {
        this.trackEvent({
            category: 'Conversion',
            action: type,
            value,
            timestamp: Date.now(),
        });
    }

    public trackTiming(category: string, variable: string, time: number): void {
        this.trackEvent({
            category,
            action: 'Timing',
            label: variable,
            value: time,
            timestamp: Date.now(),
        });
    }

    private async flush(): Promise<void> {
        if (this.queue.length === 0) return;

        const events = [...this.queue];
        this.queue = [];

        await this.sendToBackend('/api/v1/analytics/events', events);
    }

    private async sendToBackend(endpoint: string, data: any): Promise<void> {
        try {
            // Use sendBeacon for reliability on page unload
            if (navigator.sendBeacon && typeof data === 'object') {
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                navigator.sendBeacon(endpoint, blob);
            } else {
                // Fallback to fetch
                await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                    keepalive: true,
                });
            }
        } catch (error) {
            console.error('Failed to send analytics:', error);
        }
    }

    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
        this.flush();
    }

    public destroy(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flush();
    }
}

// Export singleton instance
export const analytics = Analytics.getInstance();

// Convenience functions
export const trackEvent = (
    category: string,
    action: string,
    label?: string,
    value?: number
) => {
    analytics.trackEvent({ category, action, label, value, timestamp: Date.now() });
};

export const trackPageView = (path?: string, title?: string) => {
    analytics.trackPageView(path, title);
};

export const trackError = (error: Error | string, context?: Record<string, any>) => {
    const errorEvent: ErrorEvent = {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' ? error.stack : undefined,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        ...context,
    };
    analytics.trackError(errorEvent);
};

export const trackUserAction = (action: string, label?: string, value?: number) => {
    analytics.trackEvent({ category: 'User Action', action, label, value, timestamp: Date.now() });
};

export const trackConversion = (type: string, value?: number) => {
    analytics.trackEvent({ category: 'Conversion', action: type, value, timestamp: Date.now() });
};

export const setUserId = (userId: string) => {
    analytics.setUserId(userId);
};

export const clearUserId = () => {
    analytics.clearUserId();
};

export default analytics;
