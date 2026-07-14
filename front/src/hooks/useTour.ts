import { useCallback, useEffect, useState } from 'react';
import { tourService } from '../services/tourService';
import { TourStep } from '../types/tour';

interface UseTourOptions {
    autoStart?: boolean;
}

export const useTour = (page: string, options?: UseTourOptions) => {
    const autoStart =
        (options?.autoStart ?? true) &&
        new URLSearchParams(window.location.search).get('tourPicker') !== '1';
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const seenKey = `tour-seen-${page}`;

        setLoading(true);

        tourService
            .getActive(page)
            .then((data) => {
                if (cancelled) return;
                setSteps(data);

                if (autoStart && data.length > 0 && !localStorage.getItem(seenKey)) {
                    // Give the layout a moment to settle before highlighting
                    setTimeout(() => {
                        if (!cancelled) setIsOpen(true);
                    }, 600);
                }
            })
            .catch(() => {
                if (!cancelled) setSteps([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, autoStart]);

    const start = useCallback(() => setIsOpen(true), []);

    const close = useCallback((persist = false) => {
        setIsOpen(false);
        if (persist) localStorage.setItem(`tour-seen-${page}`, '1');
    }, [page]);

    return { steps, isOpen, start, close, loading };
};

export const pageFromPath = (pathname: string): string => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/products/')) return 'product-detail';
    if (pathname.startsWith('/products')) return 'products';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/cart')) return 'cart';
    if (pathname.startsWith('/checkout')) return 'checkout';
    if (pathname.startsWith('/dashboard')) {
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/profile'))
            return 'dashboard';
        if (pathname.startsWith('/dashboard/orders')) return 'orders';
        if (pathname.startsWith('/dashboard/wishlist')) return 'wishlist';
        if (pathname.startsWith('/dashboard/addresses')) return 'addresses';
        if (pathname.startsWith('/dashboard/loyalty')) return 'loyalty';
        if (pathname.startsWith('/dashboard/reviews')) return 'reviews';
        return 'dashboard';
    }
    if (pathname.startsWith('/basalam')) {
        if (pathname.startsWith('/basalam/cart')) return 'basalam-cart';
        if (pathname.startsWith('/basalam/checkout')) return 'basalam-checkout';
        if (pathname.startsWith('/basalam/orders')) return 'basalam-orders';
        return 'basalam';
    }
    if (pathname.startsWith('/login')) return 'login';
    if (pathname.startsWith('/register')) return 'register';
    if (pathname.startsWith('/orders/')) return 'order-confirmation';

    return pathname.replace(/^\//, '') || 'home';
};
