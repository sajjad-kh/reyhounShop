import { useEffect, useState } from 'react';
import { ImageLightboxProps } from '../../types/modal';
import { cn } from '../../utils';

export const ImageLightbox = ({
    isOpen,
    onClose,
    images,
    currentIndex,
    onNavigate,
}: ImageLightboxProps) => {
    const [activeIndex, setActiveIndex] = useState(currentIndex);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setActiveIndex(currentIndex);
    }, [currentIndex]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        const handleArrowKeys = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('keydown', handleArrowKeys);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleArrowKeys);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, activeIndex]);

    const handlePrevious = () => {
        const newIndex = activeIndex > 0 ? activeIndex - 1 : images.length - 1;
        setActiveIndex(newIndex);
        setIsLoading(true);
        onNavigate?.(newIndex);
    };

    const handleNext = () => {
        const newIndex = activeIndex < images.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(newIndex);
        setIsLoading(true);
        onNavigate?.(newIndex);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-filter backdrop-blur-lg" />

            {/* Close Button */}
            <button
                onClick={onClose}
                className={cn(
                    'absolute top-4 right-4 z-10',
                    'w-12 h-12 rounded-full glass-base',
                    'flex items-center justify-center',
                    'text-text-primary hover:bg-white/20',
                    'transition-all hover:scale-110',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                )}
                aria-label="Close lightbox"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className={cn(
                            'absolute left-4 z-10',
                            'w-12 h-12 rounded-full glass-base',
                            'flex items-center justify-center',
                            'text-text-primary hover:bg-white/20',
                            'transition-all hover:scale-110',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                        )}
                        aria-label="Previous image"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={handleNext}
                        className={cn(
                            'absolute right-4 z-10',
                            'w-12 h-12 rounded-full glass-base',
                            'flex items-center justify-center',
                            'text-text-primary hover:bg-white/20',
                            'transition-all hover:scale-110',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                        )}
                        aria-label="Next image"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Image Container */}
            <div className="relative max-w-7xl max-h-[90vh] mx-4">
                <div className="glass-modal p-4 scale-in">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="glass-spinner" />
                        </div>
                    )}
                    <img
                        src={images[activeIndex]}
                        alt={`Image ${activeIndex + 1} of ${images.length}`}
                        className={cn(
                            'max-w-full max-h-[80vh] object-contain rounded-lg',
                            'transition-opacity duration-300',
                            isLoading ? 'opacity-0' : 'opacity-100'
                        )}
                        onLoad={() => setIsLoading(false)}
                    />
                </div>

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                        <div className="glass-base px-4 py-2 text-text-primary text-sm font-medium">
                            {activeIndex + 1} / {images.length}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
