import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { WishlistItem } from '../../services/wishlistService';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { cn } from '../../utils';
import { getImageUrl } from '../../utils/constants';

// Icons
const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg
        className="w-5 h-5"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
    </svg>
);

const ShoppingCartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
    </svg>
);

const EmptyWishlistIcon = () => (
    <svg className="w-24 h-24 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
    </svg>
);

export const WishlistPage: React.FC = () => {
    const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());
    const [addingToCart, setAddingToCart] = useState<Set<number>>(new Set());

    const { addToCart } = useCart();
    const { wishlist, isLoading, error, removeFromWishlist, clearWishlist: clearWishlistHook, refreshWishlist } = useWishlist();

    const handleRemoveFromWishlist = async (wishlistItemId: number) => {
        try {
            setRemovingItems(prev => new Set(prev).add(wishlistItemId));
            await removeFromWishlist(wishlistItemId);
        } catch (err) {
            console.error('Error removing from wishlist:', err);
            alert('Failed to remove item from wishlist');
        } finally {
            setRemovingItems(prev => {
                const next = new Set(prev);
                next.delete(wishlistItemId);
                return next;
            });
        }
    };

    const handleMoveToCart = async (item: WishlistItem) => {
        try {
            setAddingToCart(prev => new Set(prev).add(item.id));

            // Add to cart
            await addToCart(item.productId, 1);

            // Remove from wishlist
            await removeFromWishlist(item.id);

        } catch (err) {
            console.error('Error moving to cart:', err);
            alert('Failed to move item to cart');
        } finally {
            setAddingToCart(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    const handleClearWishlist = async () => {
        if (!window.confirm('Are you sure you want to clear your entire wishlist?')) {
            return;
        }

        try {
            await clearWishlistHook();
        } catch (err) {
            console.error('Error clearing wishlist:', err);
            alert('Failed to clear wishlist');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-text-primary">My Wishlist</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <GlassCard key={i} className="animate-pulse">
                            <div className="aspect-square bg-glass-medium rounded-xl mb-4" />
                            <div className="h-4 bg-glass-medium rounded mb-2" />
                            <div className="h-4 bg-glass-medium rounded w-2/3" />
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-text-primary">My Wishlist</h1>
                <GlassCard className="text-center py-12">
                    <p className="text-accent-error mb-4">{error}</p>
                    <GlassButton onClick={refreshWishlist} variant="primary">
                        Try Again
                    </GlassButton>
                </GlassCard>
            </div>
        );
    }

    // Empty state
    if (wishlist.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-text-primary">My Wishlist</h1>
                <GlassCard className="text-center py-16">
                    <div className="flex justify-center mb-6">
                        <EmptyWishlistIcon />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary mb-2">
                        Your wishlist is empty
                    </h2>
                    <p className="text-text-secondary mb-6">
                        Start adding products you love to your wishlist
                    </p>
                    <GlassButton
                        variant="primary"
                        onClick={() => window.location.href = '/products'}
                    >
                        Browse Products
                    </GlassButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">My Wishlist</h1>
                    <p className="text-text-secondary mt-1">
                        {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
                    </p>
                </div>

                {wishlist.length > 0 && (
                    <GlassButton
                        variant="secondary"
                        size="sm"
                        onClick={handleClearWishlist}
                    >
                        <TrashIcon />
                        <span className="ml-2">Clear All</span>
                    </GlassButton>
                )}
            </div>

            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map(item => {
                    const product = item.product;
                    const primaryImage = product.images.find(img => img.isMain) || product.images[0];
                    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
                    const discountPercentage = hasDiscount
                        ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
                        : 0;
                    const isRemoving = removingItems.has(item.id);
                    const isAddingCart = addingToCart.has(item.id);

                    return (
                        <GlassCard
                            key={item.id}
                            hover
                            className={cn(
                                'group relative transition-all duration-300',
                                (isRemoving || isAddingCart) && 'opacity-50 pointer-events-none'
                            )}
                        >
                            {/* Product Image */}
                            <div className="relative aspect-square mb-4 overflow-hidden rounded-xl">
                                <img
                                    src={getImageUrl(primaryImage?.url)}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    loading="lazy"
                                />

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

                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemoveFromWishlist(item.id)}
                                    disabled={isRemoving}
                                    className="absolute top-2 right-2 glass-card bg-glass-medium hover:bg-accent-error/20 p-2 rounded-lg transition-all duration-200"
                                    aria-label="Remove from wishlist"
                                >
                                    {isRemoving ? (
                                        <div className="glass-spinner w-4 h-4" />
                                    ) : (
                                        <HeartIcon filled />
                                    )}
                                </button>
                            </div>

                            {/* Product Info */}
                            <div className="space-y-3">
                                {/* Category */}
                                <p className="text-xs text-text-muted uppercase tracking-wide">
                                    {product.category.name}
                                </p>

                                {/* Product Name */}
                                <h3 className="font-semibold text-text-primary line-clamp-2">
                                    {product.name}
                                </h3>

                                {/* Rating */}
                                <div className="flex items-center space-x-1">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={cn(
                                                    'w-4 h-4',
                                                    i < Math.floor(product.averageRating)
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
                                    <span className="text-sm text-text-muted">
                                        ({product.reviewCount})
                                    </span>
                                </div>

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

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <GlassButton
                                        variant="primary"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleMoveToCart(item)}
                                        disabled={product.stock === 0 || isAddingCart}
                                        loading={isAddingCart}
                                        ripple
                                    >
                                        <ShoppingCartIcon />
                                        <span className="ml-2">Add to Cart</span>
                                    </GlassButton>

                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => window.location.href = `/products/${product.id}`}
                                    >
                                        View
                                    </GlassButton>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
};
