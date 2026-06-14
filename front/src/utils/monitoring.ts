/**
 * Application Monitoring
 * Comprehensive monitoring for performance, health, and user experience
 */

import { measurePerformance, getConnectionInfo } from './performance';
import { analytics } from './analytics';
import { errorTracker } from './errorTracking';

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        api: boolean;
        localStorage: boolean;
        sessionStorage: boolean;
        serviceWorker: boolean;
        network: boolean;
    };
    timestamp: number;
}

export interface SystemInfo {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    viewport: string;
    colorDepth: number;
    pixelRatio: number;
    connection?: {
        effectiveType: string;
        downlink: number;
        rtt: number;
        saveData: boolean;
    };
    memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
}

class Monitor {
    private static instance: Monitor;
    private healthCheckInterval?: number;
    private performanceCheckInterval?: number;
    private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
    private readonly PERFORMANCE_CHECK_INTERVAL = 30000; // 30 seconds

    private constructor() {
        this.initialize();
    }

    public static getInstance(): Monitor {
        if (!Monitor.instance) {
            Monitor.instance = new Monitor();
        }
        return Monitor.instance;
    }

    private initialize(): void {
        // Start monitoring on page load
        if (document.readyState === 'complete') {
            this.startMonitoring();
        } else {
            window.addEventListener('load', () => {
                this.startMonitoring();
            });
        }

        // Monitor page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.stopMonitoring();
        });
    }

    private startMonitoring(): void {
        // Initial health check
        this.performHealthCheck();

        // Initial performance check
        this.performPerformanceCheck();

        // Start periodic checks
        this.healthCheckInterval = window.setInterval(() => {
            this.performHealthCheck();
        }, this.HEALTH_CHECK_INTERVAL);

        this.performanceCheckInterval = window.setInterval(() => {
            this.performPerformanceCheck();
        }, this.PERFORMANCE_CHECK_INTERVAL);

        // Log system info
        this.logSystemInfo();
    }

    private pauseMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.performanceCheckInterval) {
            clearInterval(this.performanceCheckInterval);
        }
    }

    private resumeMonitoring(): void {
        this.startMonitoring();
    }

    private stopMonitoring(): void {
        this.pauseMonitoring();
    }

    public async performHealthCheck(): Promise<HealthCheckResult> {
        const checks = {
            api: await this.checkApiHealth(),
            localStorage: this.checkLocalStorage(),
            sessionStorage: this.checkSessionStorage(),
            serviceWorker: this.checkServiceWorker(),
            network: this.checkNetwork(),
        };

        const healthyCount = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        let status: 'healthy' | 'degraded' | 'unhealthy';
        if (healthyCount === totalChecks) {
            status = 'healthy';
        } else if (healthyCount >= totalChecks / 2) {
            status = 'degraded';
        } else {
            status = 'unhealthy';
        }

        const result: HealthCheckResult = {
            status,
            checks,
            timestamp: Date.now(),
        };

        // Track health status
        analytics.trackEvent({
            category: 'Health',
            action: 'Health Check',
            label: status,
            value: healthyCount,
            timestamp: Date.now(),
        });

        // Log unhealthy status
        if (status === 'unhealthy') {
            errorTracker.captureMessage('Application health check failed', {
                component: 'Monitor',
                action: 'Health Check',
                additionalData: checks,
            });
        }

        if (import.meta.env.DEV) {
            console.log('[Health Check]', result);
        }

        return result;
    }

    private async checkApiHealth(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/monitoring/health`, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    private checkLocalStorage(): boolean {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    private checkSessionStorage(): boolean {
        try {
            const testKey = '__test__';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    private checkServiceWorker(): boolean {
        if ('serviceWorker' in navigator) {
            return navigator.serviceWorker.controller !== null;
        }
        return false;
    }

    private checkNetwork(): boolean {
        return navigator.onLine;
    }

    private performPerformanceCheck(): void {
        const metrics = measurePerformance();
        analytics.trackPerformance(metrics);

        // Check for performance issues
        if (metrics.fcp && metrics.fcp > 3000) {
            errorTracker.captureMessage('Slow First Contentful Paint', {
                component: 'Performance',
                action: 'FCP Check',
                additionalData: { fcp: metrics.fcp },
            });
        }

        if (metrics.lcp && metrics.lcp > 4000) {
            errorTracker.captureMessage('Slow Largest Contentful Paint', {
                component: 'Performance',
                action: 'LCP Check',
                additionalData: { lcp: metrics.lcp },
            });
        }

        if (metrics.cls && metrics.cls > 0.25) {
            errorTracker.captureMessage('High Cumulative Layout Shift', {
                component: 'Performance',
                action: 'CLS Check',
                additionalData: { cls: metrics.cls },
            });
        }
    }

    public getSystemInfo(): SystemInfo {
        const info: SystemInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio,
        };

        // Add connection info if available
        const connection = getConnectionInfo();
        if (connection) {
            info.connection = connection;
        }

        // Add memory info if available
        // @ts-ignore - performance.memory is non-standard
        if (performance.memory) {
            // @ts-ignore
            info.memory = {
                // @ts-ignore
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                // @ts-ignore
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                // @ts-ignore
                usedJSHeapSize: performance.memory.usedJSHeapSize,
            };
        }

        return info;
    }

    private logSystemInfo(): void {
        const info = this.getSystemInfo();

        analytics.trackEvent({
            category: 'System',
            action: 'System Info',
            label: info.platform,
            timestamp: Date.now(),
        });

        if (import.meta.env.DEV) {
            console.log('[System Info]', info);
        }
    }

    public trackResourceTiming(): void {
        if ('performance' in window && performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

            resources.forEach((resource) => {
                // Track slow resources
                if (resource.duration > 1000) {
                    analytics.trackEvent({
                        category: 'Performance',
                        action: 'Slow Resource',
                        label: resource.name,
                        value: resource.duration,
                        timestamp: Date.now(),
                    });
                }
            });
        }
    }

    public trackNavigationTiming(): void {
        if ('performance' in window && performance.getEntriesByType) {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

            if (navigation) {
                const timings = {
                    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                    tcp: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart,
                    dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    load: navigation.loadEventEnd - navigation.loadEventStart,
                };

                Object.entries(timings).forEach(([key, value]) => {
                    analytics.trackTiming('Navigation', key, value);
                });
            }
        }
    }

    public getMemoryUsage(): {
        used: number;
        total: number;
        limit: number;
        percentage: number;
    } | null {
        // @ts-ignore - performance.memory is non-standard
        if (performance.memory) {
            // @ts-ignore
            const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

            return {
                used: usedJSHeapSize,
                total: totalJSHeapSize,
                limit: jsHeapSizeLimit,
                percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
            };
        }

        return null;
    }

    public checkMemoryPressure(): void {
        const memory = this.getMemoryUsage();

        if (memory && memory.percentage > 90) {
            errorTracker.captureMessage('High memory usage detected', {
                component: 'Monitor',
                action: 'Memory Check',
                additionalData: memory,
            });
        }
    }

    public getMonitoringStatus(): {
        isMonitoring: boolean;
        lastHealthCheck?: number;
        lastPerformanceCheck?: number;
    } {
        return {
            isMonitoring: this.healthCheckInterval !== undefined,
            lastHealthCheck: undefined, // Could track this if needed
            lastPerformanceCheck: undefined, // Could track this if needed
        };
    }
}

// Export singleton instance
export const monitor = Monitor.getInstance();

export default monitor;
