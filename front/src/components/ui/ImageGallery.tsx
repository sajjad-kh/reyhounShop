import React, { useState } from 'react';
import { ProductImage } from '../../types/product';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

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
            <div className={cn('aspect-square rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center', className)}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                        <span className="text-2xl opacity-30">📷</span>
                    </div>
                    <p className="text-white/25 text-xs">تصویری موجود نیست</p>
                </div>
            </div>
        );
    }

    const selectedImage = images[selectedImageIndex];

    return (
        <div className={cn('space-y-3', className)}>
            {/* Main Image */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden group">
                <div
                    className={cn(
                        'aspect-square cursor-zoom-in transition-transform duration-500',
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

                {/* Zoom hint */}
                {!isZoomed && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-[10px] text-white/50">برای بزرگنمایی کلیک کنید</span>
                    </div>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
                        <span className="text-[11px] text-white/60 font-medium">
                            {selectedImageIndex + 1} / {images.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            onClick={() => setSelectedImageIndex(index)}
                            className={cn(
                                'flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all duration-200 border',
                                selectedImageIndex === index
                                    ? 'border-accent-primary ring-2 ring-accent-primary/30'
                                    : 'border-white/[0.06] hover:border-white/[0.15]'
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
