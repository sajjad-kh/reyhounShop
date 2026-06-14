import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveState {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
    breakpoint: Breakpoint;
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    isTouchDevice: boolean;
}

const breakpoints = {
    xs: 475,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

const getBreakpoint = (width: number): Breakpoint => {
    if (width < breakpoints.xs) return 'xs';
    if (width < breakpoints.sm) return 'sm';
    if (width < breakpoints.md) return 'md';
    if (width < breakpoints.lg) return 'lg';
    if (width < breakpoints.xl) return 'xl';
    return '2xl';
};

const isTouchDevice = (): boolean => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - for older browsers
        navigator.msMaxTouchPoints > 0
    );
};

export const useResponsive = (): ResponsiveState => {
    const [state, setState] = useState<ResponsiveState>(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const breakpoint = getBreakpoint(width);

        return {
            isMobile: width < breakpoints.md,
            isTablet: width >= breakpoints.md && width < breakpoints.lg,
            isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
            isLargeDesktop: width >= breakpoints.xl,
            breakpoint,
            width,
            height,
            orientation: width > height ? 'landscape' : 'portrait',
            isTouchDevice: isTouchDevice(),
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const breakpoint = getBreakpoint(width);

            setState({
                isMobile: width < breakpoints.md,
                isTablet: width >= breakpoints.md && width < breakpoints.lg,
                isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
                isLargeDesktop: width >= breakpoints.xl,
                breakpoint,
                width,
                height,
                orientation: width > height ? 'landscape' : 'portrait',
                isTouchDevice: isTouchDevice(),
            });
        };

        // Debounce resize events
        let timeoutId: NodeJS.Timeout;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleResize, 150);
        };

        window.addEventListener('resize', debouncedResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', debouncedResize);
            window.removeEventListener('orientationchange', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    return state;
};

export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
    const { width } = useResponsive();
    return width >= breakpoints[breakpoint];
};

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Legacy browsers
        else {
            // @ts-ignore
            mediaQuery.addListener(handleChange);
            // @ts-ignore
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [query]);

    return matches;
};
