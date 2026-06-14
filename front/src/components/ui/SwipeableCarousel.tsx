import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils';
import { useSwipe } from '../../hooks/useSwipe';

export interface SwipeableCarouselProps {
    items: React.ReactNode[];
    autoPlay?: boolean;
    autoPlayInterval?: number;
    showDots?: boolean;
    showArrows?: boolean;
    className?: string;
    itemClassName?: string;
}

export const SwipeableCarousel = ({
    items,
    autoPlay = false,
    autoPlayInterval = 5000,
    showDots = true,
    showArrows = true,
    className,
    itemClassName,
}: SwipeableCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    const goToSlide = (index: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const goToNext = () => {
        const nextIndex = (currentIndex + 1) % items.length;
        goToSlide(nextIndex);
    };

    const goToPrevious = () => {
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        goToSlide(prevIndex);
    };

    // Swipe handlers
    const { handlers, swipeState } = useSwipe({
        onSwipeLeft: goToNext,
        onSwipeRight: goToPrevious,
        threshold: 50,
    });

    // Auto play
    useEffect(() => {
        if (!autoPlay) return;

        autoPlayRef.current = setInterval(goToNext, autoPlayInterval);

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [autoPlay, autoPlayInterval, currentIndex]);

    // Pause auto play on hover
    const handleMouseEnter = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
    };

    const handleMouseLeave = () => {
        if (autoPlay) {
            autoPlayRef.current = setInterval(goToNext, autoPlayInterval);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                goToPrevious();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const translateX = swipeState.isSwiping
        ? swipeState.deltaX
        : 0;

    return (
        <div
            className={cn('relative overflow-hidden rounded-2xl', className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="region"
            aria-label="Carousel"
        >
            {/* Carousel items */}
            <div
                className="relative w-full"
                {...handlers}
                style={{
                    touchAction: 'pan-y pinch-zoom',
                }}
            >
                <div
                    className="flex transition-transform duration-300 ease-out"
                    style={{
                        transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className={cn(
                                'flex-shrink-0 w-full',
                                itemClassName
                            )}
                            aria-hidden={index !== currentIndex}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation arrows */}
            {showArrows && items.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 glass-button hover-lift z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                        aria-label="Previous slide"
                        disabled={isTransitioning}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 glass-button hover-lift z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                        aria-label="Next slide"
                        disabled={isTransitioning}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Dots indicator */}
            {showDots && items.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={cn(
                                'w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                                index === currentIndex
                                    ? 'bg-accent-primary w-8'
                                    : 'bg-glass-border-light hover:bg-glass-border-medium'
                            )}
                            aria-label={`Go to slide ${index + 1}`}
                            aria-current={index === currentIndex}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
