export interface PerformanceMetrics {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
}

export const measurePerformance = (): PerformanceMetrics => {
    const metrics: PerformanceMetrics = {};

    if ('performance' in window) {
        const perfData = window.performance;

        // Get navigation timing
        const navTiming = perfData.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navTiming) {
            metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
        }

        // Get paint timing
        const paintEntries = perfData.getEntriesByType('paint');
        const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime;
        }

        // Observe LCP
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1] as any;
                    metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.warn('LCP observation not supported');
            }

            // Observe FID
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry: any) => {
                        metrics.fid = entry.processingStart - entry.startTime;
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.warn('FID observation not supported');
            }

            // Observe CLS
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry: any) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            metrics.cls = clsValue;
                        }
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                console.warn('CLS observation not supported');
            }
        }
    }

    return metrics;
};

export const logPerformanceMetrics = (metrics: PerformanceMetrics) => {
    console.group('Performance Metrics');
    if (metrics.ttfb) console.log(`TTFB: ${metrics.ttfb.toFixed(2)}ms`);
    if (metrics.fcp) console.log(`FCP: ${metrics.fcp.toFixed(2)}ms`);
    if (metrics.lcp) console.log(`LCP: ${metrics.lcp.toFixed(2)}ms`);
    if (metrics.fid) console.log(`FID: ${metrics.fid.toFixed(2)}ms`);
    if (metrics.cls) console.log(`CLS: ${metrics.cls.toFixed(4)}`);
    console.groupEnd();
};

export const reportWebVitals = (onPerfEntry?: (metric: PerformanceMetrics) => void) => {
    if (onPerfEntry && 'performance' in window) {
        const metrics = measurePerformance();

        // Report after page load
        if (document.readyState === 'complete') {
            onPerfEntry(metrics);
        } else {
            window.addEventListener('load', () => {
                onPerfEntry(metrics);
            });
        }
    }
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number
): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

// Request idle callback wrapper
export const requestIdleCallback = (callback: () => void, options?: { timeout?: number }) => {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        return setTimeout(callback, 1);
    }
};

// Cancel idle callback wrapper
export const cancelIdleCallback = (id: number) => {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
};

// Preload resources
export const preloadResource = (href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    document.head.appendChild(link);
};

// Prefetch resources
export const prefetchResource = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
};

// Check if reduced motion is preferred
export const prefersReducedMotion = (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get connection info
export const getConnectionInfo = () => {
    // @ts-ignore - Navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
        return {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
        };
    }

    return null;
};

// Check if user is on slow connection
export const isSlowConnection = (): boolean => {
    const connection = getConnectionInfo();
    if (!connection) return false;

    return (
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        connection.saveData === true
    );
};
