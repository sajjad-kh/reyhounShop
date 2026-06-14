import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { ProductImage } from '../../types/product';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';

export interface ImageGalleryProps {
    images: ProductImage[];
    productName: string;
    className?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
    images,
    productName,
    className
}) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);

    if (!images.length) {
        return (
            <GlassCard className={cn('aspect-square flex items-center justify-center', className)}>
                <div className="text-center text-text-muted">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No images available</p>
                </div>
            </GlassCard>
        );
    }

    const selectedImage = images[selectedImageIndex];

    return (
        <div className={cn('space-y-4', className)}>
            {/* Main Image */}
            <GlassCard className="relative overflow-hidden group">
                <div
                    className={cn(
                        'aspect-square cursor-zoom-in transition-transform duration-300',
                        isZoomed && 'scale-150 cursor-zoom-out'
                    )}
                    onClick={() => setIsZoomed(!isZoomed)}
                >
                    <img
                        src={getImageUrl(selectedImage.url)}
                        alt={productName}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                            }}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 glass-card bg-glass-medium hover:bg-glass-heavy p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Previous image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                            }}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 glass-card bg-glass-medium hover:bg-glass-heavy p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Next image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 right-4 glass-card bg-glass-medium px-3 py-1 rounded-lg">
                        <span className="text-sm text-text-primary">
                            {selectedImageIndex + 1} / {images.length}
                        </span>
                    </div>
                )}
            </GlassCard>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            onClick={() => setSelectedImageIndex(index)}
                            className={cn(
                                'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-200',
                                'glass-card border-2',
                                selectedImageIndex === index
                                    ? 'border-accent-primary ring-2 ring-accent-primary ring-offset-2 ring-offset-transparent'
                                    : 'border-border-glass-light hover:border-border-glass-medium'
                            )}
                        >
                            <img
                                src={getImageUrl(image.url)}
                                alt={`${productName} ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};