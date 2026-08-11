import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/product';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';
import { ShoppingCart, Heart } from 'lucide-react';

export interface ProductCardProps {
    product: Product;
    className?: string;
    onAddToCart?: (product: Product) => void;
    onAddToWishlist?: (product: Product) => void;
    showAddToCart?: boolean;
    showWishlist?: boolean;
    isInWishlist?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    product,
    className,
    onAddToCart,
    onAddToWishlist,
    showAddToCart = true,
    showWishlist = true,
    isInWishlist = false
}) => {
    const primaryImage = product.images?.find(img => img.isMain) || product.images?.[0] || null;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
        : 0;
    const averageRating = product.averageRating ?? 0;
    const reviewCount = product.reviewCount ?? 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToCart?.(product);
    };

    const handleAddToWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToWishlist?.(product);
    };

    return (
        <Link to={`/products/${product.id}`} className="block group">
            <div className={cn(
                'relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden',
                'transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/20',
                'h-full flex flex-col',
                className
            )}>
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                    {primaryImage ? (
                        <img
                            src={getImageUrl(primaryImage.url)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                            <span className="text-white/15 text-xs">بدون تصویر</span>
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Discount badge */}
                    {hasDiscount && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500/90 backdrop-blur-sm">
                            <span className="text-[10px] sm:text-[11px] font-bold text-white">
                                %{discountPercentage}-
                            </span>
                        </div>
                    )}

                    {/* Out of stock */}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white">
                                ناموجود
                            </span>
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        {showWishlist && (
                            <button
                                onClick={handleAddToWishlist}
                                className={cn(
                                    "w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all",
                                    isInWishlist ? "text-red-500 hover:text-red-400" : "text-white/70 hover:text-white hover:bg-white/20"
                                )}
                            >
                                <Heart className="w-3.5 h-3.5" fill={isInWishlist ? 'currentColor' : 'none'} />
                            </button>
                        )}
                        {showAddToCart && product.stock > 0 && (
                            <button
                                onClick={handleAddToCart}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/90 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-semibold hover:bg-accent-primary transition-all"
                            >
                                <ShoppingCart className="w-3 h-3" />
                                افزودن
                            </button>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col p-3 sm:p-4">
                    {/* Name */}
                    <h3 className="text-xs sm:text-sm font-semibold text-white/80 group-hover:text-white transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] mb-2">
                        {product.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 mb-auto">
                        <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <svg
                                    key={i}
                                    className={cn(
                                        'w-3 h-3',
                                        i < Math.floor(averageRating)
                                            ? 'text-amber-400 fill-current'
                                            : 'text-white/15'
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
                        <span className="text-[10px] sm:text-[11px] text-white/30">
                            ({reviewCount})
                        </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mt-3 pt-3 border-t border-white/[0.05]">
                        <span className="text-sm sm:text-base font-bold text-white">
                            {product.effectivePrice.toLocaleString('fa-IR')}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-white/30">ریال</span>
                        {hasDiscount && (
                            <span className="text-[10px] sm:text-[11px] text-white/20 line-through mr-auto">
                                {product.price.toLocaleString('fa-IR')}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};
