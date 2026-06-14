import React, { useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { cn } from '../../utils';
import { ProductImage } from '../../types/product';
import { getImageUrl } from '../../utils/constants';

export interface ImagePreviewCardProps {
    image?: ProductImage;
    file?: File;
    isMain: boolean;
    onSetMain: () => void;
    onDelete: () => void;
}

const ImagePreviewCard: React.FC<ImagePreviewCardProps> = ({
    image,
    file,
    isMain,
    onSetMain,
    onDelete
}) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        // Generate image URL from either ProductImage or File object
        if (image?.url) {
            setImageUrl(getImageUrl(image.url));
        } else if (file) {
            const objectUrl = URL.createObjectURL(file);
            setImageUrl(objectUrl);

            // Cleanup: revoke object URL when component unmounts
            return () => {
                URL.revokeObjectURL(objectUrl);
            };
        }
    }, [image, file]);

    return (
        <div
            className={cn(
                'relative group rounded-xl overflow-hidden transition-all duration-300',
                'glass-card border-2',
                isMain
                    ? 'border-accent-primary shadow-lg shadow-accent-primary/20'
                    : 'border-border-glass-light hover:border-border-glass-medium'
            )}
        >
            {/* Image Preview */}
            <div className="aspect-square relative bg-glass-light">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={isMain ? 'تصویر اصلی محصول' : 'تصویر محصول'}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center" role="status" aria-label="در حال بارگذاری تصویر">
                        <div className="glass-spinner w-8 h-8" />
                    </div>
                )}

                {/* Main Image Badge */}
                {isMain && (
                    <div
                        className="absolute top-2 right-2 flex items-center space-x-1 space-x-reverse px-3 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium shadow-lg"
                        role="status"
                        aria-label="این تصویر به عنوان تصویر اصلی انتخاب شده است"
                    >
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>تصویر اصلی</span>
                    </div>
                )}

                {/* Action Buttons - Show on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2 space-x-reverse">
                    {!isMain && (
                        <button
                            onClick={onSetMain}
                            className="p-3 rounded-xl bg-glass-heavy hover:bg-accent-primary text-white transition-all duration-200 hover:scale-110"
                            title="تنظیم به عنوان تصویر اصلی"
                            aria-label="تنظیم این تصویر به عنوان تصویر اصلی محصول"
                            type="button"
                        >
                            <Star className="w-5 h-5" aria-hidden="true" />
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="p-3 rounded-xl bg-glass-heavy hover:bg-error-color text-white transition-all duration-200 hover:scale-110"
                        title="حذف تصویر"
                        aria-label="حذف این تصویر از محصول"
                        type="button"
                    >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImagePreviewCard;
