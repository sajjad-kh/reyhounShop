import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { TruncatedText } from '../ui/TruncatedText';
import { BasalamProduct } from '../../types/basalam';
import { cn } from '../../utils';

export interface BasalamProductCardProps {
    product: BasalamProduct;
    className?: string;
    onAddToCart?: (product: BasalamProduct, quantity: number) => void;
}

export const BasalamProductCard: React.FC<BasalamProductCardProps> = ({
    product,
    className,
    onAddToCart
}) => {
    const [quantity, setQuantity] = React.useState(1);
    const [isAdding, setIsAdding] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    const isOutOfStock = product.stock === 0;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOutOfStock || !onAddToCart) return;

        setIsAdding(true);
        try {
            await onAddToCart(product, quantity);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <GlassCard
            hover={!isOutOfStock}
            className={cn(
                'group relative overflow-hidden transition-all duration-300 h-full flex flex-col fade-in-up',
                !isOutOfStock && 'hover:scale-[1.02] hover:shadow-glass-hover cursor-pointer',
                isOutOfStock && 'opacity-60',
                className
            )}
        >
            {/* Product Image */}
            <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-glass-light">
                {product.image ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 shimmer" />
                        )}
                        <img
                            src={product.image}
                            alt={product.title}
                            className={cn(
                                'w-full h-full object-cover transition-all duration-500',
                                !isOutOfStock && 'group-hover:scale-110 group-hover:brightness-110',
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            )}
                            loading="lazy"
                            onLoad={() => setImageLoaded(true)}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-glass-light flex items-center justify-center">
                        <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Stock Status Badge */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center scale-in">
                        <span className="glass-card bg-glass-heavy px-4 py-2 text-sm font-medium text-text-primary">
                            ناموجود
                        </span>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="flex-1 flex flex-col justify-between">
                {/* Top Section */}
                <div className="space-y-2">
                    {/* Seller Name */}
                    <p className="text-xs text-text-muted">
                        فروشنده: {product.seller.name}
                    </p>

                    {/* Product Title */}
                    <TruncatedText
                        text={product.title}
                        maxLength={50}
                        as="h3"
                        className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors min-h-[2.5rem] flex items-start"
                    />

                    {/* Stock Availability */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <div className={cn(
                            'w-2 h-2 rounded-full',
                            isOutOfStock ? 'bg-accent-error' : 'bg-accent-success'
                        )} />
                        <span className={cn(
                            'text-sm',
                            isOutOfStock ? 'text-accent-error' : 'text-accent-success'
                        )}>
                            {isOutOfStock ? 'ناموجود' : `${product.stock} عدد موجود`}
                        </span>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="space-y-3 mt-4">
                    {/* Price */}
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-text-primary">
                            {product.price.toLocaleString('fa-IR')} تومان
                        </span>
                    </div>

                    {/* Quantity Selector and Add to Cart */}
                    {!isOutOfStock && (
                        <div className="flex items-center space-x-2 space-x-reverse animate-fade-in">
                            {/* Quantity Controls */}
                            <div className="flex items-center glass-card bg-glass-light rounded-lg overflow-hidden hover-brightness">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setQuantity(Math.max(1, quantity - 1));
                                    }}
                                    className="px-3 py-1.5 hover:bg-glass-medium transition-all duration-200 active:scale-95"
                                    aria-label="کاهش تعداد"
                                    disabled={quantity <= 1}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                                <span className="px-4 py-1.5 min-w-[2.5rem] text-center font-medium">
                                    {quantity}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setQuantity(Math.min(product.stock, quantity + 1));
                                    }}
                                    className="px-3 py-1.5 hover:bg-glass-medium transition-all duration-200 active:scale-95"
                                    aria-label="افزایش تعداد"
                                    disabled={quantity >= product.stock}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>

                            {/* Add to Cart Button */}
                            <GlassButton
                                variant="primary"
                                size="sm"
                                className="flex-1 hover-lift"
                                onClick={handleAddToCart}
                                loading={isAdding}
                                disabled={isAdding}
                                ripple
                            >
                                {isAdding ? 'در حال افزودن...' : 'افزودن به سبد'}
                            </GlassButton>
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
