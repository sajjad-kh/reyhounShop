import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '../../utils';

export interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
    src: string;
    alt: string;
    placeholder?: string;
    threshold?: number;
    rootMargin?: string;
    onLoad?: () => void;
    onError?: () => void;
    className?: string;
}

export const LazyImage = ({
    src,
    alt,
    placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
    threshold = 0.1,
    rootMargin = '50px',
    onLoad,
    onError,
    className,
    ...props
}: LazyImageProps) => {
    const [imageSrc, setImageSrc] = useState<string>(placeholder);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        // Create intersection observer
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Load the actual image
                        const img = new Image();
                        img.src = src;

                        img.onload = () => {
                            setImageSrc(src);
                            setIsLoading(false);
                            onLoad?.();
                        };

                        img.onerror = () => {
                            setHasError(true);
                            setIsLoading(false);
                            onError?.();
                        };

                        // Stop observing once loaded
                        if (observerRef.current && imgRef.current) {
                            observerRef.current.unobserve(imgRef.current);
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        // Start observing
        observerRef.current.observe(imgRef.current);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [src, threshold, rootMargin, onLoad, onError]);

    return (
        <div className={cn('relative overflow-hidden', className)}>
            <img
                ref={imgRef}
                src={imageSrc}
                alt={alt}
                className={cn(
                    'w-full h-full object-cover transition-opacity duration-300',
                    isLoading && 'opacity-0',
                    !isLoading && 'opacity-100'
                )}
                loading="lazy"
                {...props}
            />

            {/* Loading shimmer effect */}
            {isLoading && (
                <div className="absolute inset-0 shimmer bg-glass-light" />
            )}

            {/* Error state */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-glass-light">
                    <svg
                        className="w-12 h-12 text-text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};
