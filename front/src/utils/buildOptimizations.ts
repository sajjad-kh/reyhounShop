/**
 * Build Optimization Utilities
 * Provides runtime optimizations for production builds
 */

/**
 * Detect if the browser supports backdrop-filter
 * Used to optimize glass effects rendering
 */
export const supportsBackdropFilter = (): boolean => {
    if (typeof window === 'undefined') return false;

    return (
        CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
    );
};

/**
 * Detect device performance tier
 * Used to adjust glass effect complexity based on device capabilities
 */
export const getDevicePerformanceTier = (): 'high' | 'medium' | 'low' => {
    if (typeof window === 'undefined') return 'medium';

    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 2;

    // Check for device memory (if available)
    const memory = (navigator as any).deviceMemory || 4;

    // Check for connection type (if available)
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || '4g';

    // High performance: 4+ cores, 4GB+ RAM, good connection
    if (cores >= 4 && memory >= 4 && (effectiveType === '4g' || effectiveType === '5g')) {
        return 'high';
    }

    // Low performance: 2 cores or less, low memory, slow connection
    if (cores <= 2 || memory < 2 || effectiveType === '2g' || effectiveType === 'slow-2g') {
        return 'low';
    }

    // Medium performance: everything else
    return 'medium';
};

/**
 * Get optimized blur value based on device performance
 */
export const getOptimizedBlurValue = (
    baseBlur: 'light' | 'medium' | 'heavy'
): string => {
    const tier = getDevicePerformanceTier();

    const blurMap = {
        high: {
            light: 'blur(8px)',
            medium: 'blur(12px)',
            heavy: 'blur(16px)',
        },
        medium: {
            light: 'blur(6px)',
            medium: 'blur(10px)',
            heavy: 'blur(12px)',
        },
        low: {
            light: 'blur(4px)',
            medium: 'blur(6px)',
            heavy: 'blur(8px)',
        },
    };

    return blurMap[tier][baseBlur];
};

/**
 * Check if reduced motion is preferred
 */
export const prefersReducedMotion = (): boolean => {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get optimized animation duration based on user preferences
 */
export const getOptimizedAnimationDuration = (baseDuration: number): number => {
    if (prefersReducedMotion()) {
        return 0.01; // Nearly instant for reduced motion
    }

    const tier = getDevicePerformanceTier();

    switch (tier) {
        case 'high':
            return baseDuration;
        case 'medium':
            return baseDuration * 0.8;
        case 'low':
            return baseDuration * 0.6;
        default:
            return baseDuration;
    }
};

/**
 * Lazy load images with intersection observer
 */
export const lazyLoadImage = (
    img: HTMLImageElement,
    src: string,
    placeholder?: string
): void => {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        img.src = src;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            },
            {
                rootMargin: '50px',
            }
        );

        if (placeholder) {
            img.src = placeholder;
        }

        observer.observe(img);
    } else {
        // Fallback for browsers without IntersectionObserver
        img.src = src;
    }
};

/**
 * Debounce function for performance optimization
 */
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

/**
 * Throttle function for performance optimization
 */
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

/**
 * Preload critical resources
 */
export const preloadCriticalResources = (resources: string[]): void => {
    if (typeof window === 'undefined') return;

    resources.forEach((resource) => {
        const link = document.createElement('link');
        link.rel = 'preload';

        // Determine resource type
        if (resource.endsWith('.woff2') || resource.endsWith('.woff')) {
            link.as = 'font';
            link.type = 'font/woff2';
            link.crossOrigin = 'anonymous';
        } else if (resource.endsWith('.css')) {
            link.as = 'style';
        } else if (resource.endsWith('.js')) {
            link.as = 'script';
        } else if (/\.(jpg|jpeg|png|webp|svg)$/.test(resource)) {
            link.as = 'image';
        }

        link.href = resource;
        document.head.appendChild(link);
    });
};

/**
 * Apply glass effect optimizations based on device capabilities
 */
export const applyGlassOptimizations = (): void => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const tier = getDevicePerformanceTier();
    const supportsBackdrop = supportsBackdropFilter();

    // Apply optimizations based on device tier
    if (!supportsBackdrop) {
        // Fallback for browsers without backdrop-filter support
        root.style.setProperty('--glass-bg-light', 'rgba(255, 255, 255, 0.25)');
        root.style.setProperty('--glass-bg-medium', 'rgba(255, 255, 255, 0.35)');
        root.style.setProperty('--glass-bg-heavy', 'rgba(255, 255, 255, 0.45)');
        root.style.setProperty('--blur-light', 'none');
        root.style.setProperty('--blur-medium', 'none');
        root.style.setProperty('--blur-heavy', 'none');
    } else if (tier === 'low') {
        // Reduce blur intensity for low-end devices
        root.style.setProperty('--blur-light', 'blur(4px)');
        root.style.setProperty('--blur-medium', 'blur(6px)');
        root.style.setProperty('--blur-heavy', 'blur(8px)');
    } else if (tier === 'medium') {
        // Slightly reduce blur for medium devices
        root.style.setProperty('--blur-light', 'blur(6px)');
        root.style.setProperty('--blur-medium', 'blur(10px)');
        root.style.setProperty('--blur-heavy', 'blur(12px)');
    }

    // Disable animations for reduced motion preference
    if (prefersReducedMotion()) {
        root.style.setProperty('--animation-duration', '0.01ms');
    }
};

/**
 * Initialize performance optimizations
 */
export const initializeOptimizations = (): void => {
    if (typeof window === 'undefined') return;

    // Apply glass optimizations
    applyGlassOptimizations();

    // Log performance tier in development
    if (import.meta.env.DEV) {
        console.log('Device Performance Tier:', getDevicePerformanceTier());
        console.log('Backdrop Filter Support:', supportsBackdropFilter());
        console.log('Prefers Reduced Motion:', prefersReducedMotion());
    }
};
