import { useEffect, useRef, useState } from 'react';

export interface UseLazyLoadOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}) => {
    const {
        threshold = 0.1,
        rootMargin = '50px',
        triggerOnce = true,
    } = options;

    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);

                        if (triggerOnce) {
                            observer.unobserve(element);
                        }
                    } else if (!triggerOnce) {
                        setIsVisible(false);
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { elementRef, isVisible };
};

export const useIntersectionObserver = (
    callback: (entry: IntersectionObserverEntry) => void,
    options: IntersectionObserverInit = {}
) => {
    const elementRef = useRef<HTMLElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(callback);
        }, options);

        observerRef.current.observe(element);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [callback, options]);

    return elementRef;
};
