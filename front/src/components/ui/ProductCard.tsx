import React from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Product } from '../../types/product';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';

export interface ProductCardProps {
    product: Product;
    className?: string;
    onAddToCart?: (product: Product) => void;
    onAddToWishlist?: (product: Product) => void;
    showAddToCart?: boolean;
    showWishlist?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    className,
    onAddToCart,
    onAddToWishlist,
    showAddToCart = true,
    showWishlist = true
}) => {
    const primaryImage = product.images?.find(img => img.isMain) || product.images?.[0] || null;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
        : 0;
    const averageRating = product.averageRating ?? 0;
    const reviewCount = product.reviewCount ?? 0;

    const handleAddToWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToWishlist?.(product);
    };

    return (
        <Link to={`/products/${product.id}`} className="block">
            <GlassCard
                hover
                className={cn(
                    'group relative overflow-hidden transition-all duration-300 h-full flex flex-col',
                    'hover:scale-[1.02] hover:shadow-glass-hover',
                    className
                )}
            >
                {/* Product Image */}
                <div className="relative aspect-square mb-4 overflow-hidden rounded-xl">
                    {primaryImage ? (
                        <img
                            src={getImageUrl(primaryImage.url)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-glass-light flex items-center justify-center">
                            <span className="text-text-muted">No Image</span>
                        </div>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                        <div className="absolute top-2 left-2 glass-card bg-accent-error/20 border-accent-error/30 px-2 py-1 rounded-lg">
                            <span className="text-xs font-semibold text-accent-error">
                                -{discountPercentage}%
                            </span>
                        </div>
                    )}

                    {/* Stock Status */}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="glass-card bg-glass-heavy px-3 py-1 text-sm font-medium text-text-primary">
                                Out of Stock
                            </span>
                        </div>
                    )}
                </div>
                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between">
                    {/* Top Section */}
                    <div className="space-y-2">
                        {/* Category */}
                        {/* <p className="text-xs text-text-muted uppercase tracking-wide">
                            {product.category.name}
                        </p> */}

                        {/* Product Name */}
                        <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors min-h-[2.5rem] line-clamp-2">
                            {product.name}
                        </h3>

                        {/* Rating */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className={cn(
                                            'w-4 h-4',
                                            i < Math.floor(averageRating)
                                                ? 'text-yellow-400 fill-current'
                                                : 'text-text-muted'
                                        )}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                        />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-sm font-medium text-text-primary">
                                {averageRating.toFixed(1)}
                            </span>
                            <span className="text-sm text-text-muted">
                                ({reviewCount})
                            </span>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="space-y-3 mt-auto">
                        {/* Price */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="text-lg font-bold text-text-primary">
                                {product.effectivePrice.toLocaleString('fa-IR')} ریال
                            </span>
                            {hasDiscount && (
                                <span className="text-sm text-text-muted line-through">
                                    {product.price.toLocaleString('fa-IR')} ریال
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </Link>
    );
};