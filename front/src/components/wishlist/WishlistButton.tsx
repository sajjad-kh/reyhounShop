import React, { useState, useEffect, useCallback } from 'react';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { cn } from '../../utils';

interface WishlistButtonProps {
    productId: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showLabel?: boolean;
    onToggle?: (added: boolean) => void;
}

const sizeConfig = {
    sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { button: 'w-12 h-12', icon: 'w-6 h-6' }
};

const HeartIcon = ({ filled = false, className }: { filled?: boolean; className?: string }) => (
    <svg
        className={cn('w-5 h-5', className)}
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

export const WishlistButton: React.FC<WishlistButtonProps> = ({
    productId,
    size = 'md',
    className = '',
    showLabel = false,
    onToggle
}) => {
    const { state } = useAuth();
    const { user } = state;
    const { toggleWishlist, isInWishlist, isLoading } = useWishlist();
    const [isInList, setIsInList] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Check if product is in wishlist on mount
    useEffect(() => {
        if (user) {
            setIsInList(isInWishlist(productId));
        }
        setLoading(false);
    }, [productId, user, isInWishlist]);

    const handleToggle = useCallback(async () => {
        if (!user) {
            toast.info('برای افزودن به علاقه‌مندی‌ها ابتدا وارد شوید');
            return;
        }

        try {
            setToggling(true);
            const result = await toggleWishlist(productId);
            setIsInList(result.added);
            onToggle?.(result.added);
        } catch (error) {
            // Error is handled by the hook
        } finally {
            setToggling(false);
        }
    }, [user, productId, toggleWishlist, onToggle]);

    const config = sizeConfig[size];

    if (loading) {
        return (
            <div className={cn(
                config.button,
                'rounded-full bg-glass-medium animate-pulse',
                className
            )} />
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={toggling || isLoading}
            className={cn(
                config.button,
                'rounded-full',
                'flex items-center justify-center',
                'transition-all duration-300',
                isInList
                    ? 'bg-accent-primary text-white hover:bg-accent-primary/80 shadow-lg shadow-accent-primary/30'
                    : 'bg-glass-medium hover:bg-glass-heavy text-text-secondary hover:text-text-primary',
                toggling && 'opacity-50 cursor-not-allowed',
                !toggling && 'hover:scale-110 active:scale-95',
                className
            )}
            aria-label={isInList ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
        >
            {toggling ? (
                <div className="glass-spinner w-4 h-4" />
            ) : (
                <HeartIcon
                    filled={isInList}
                    className={config.icon}
                />
            )}

            {showLabel && (
                <span className="mr-2 text-sm font-medium">
                    {isInList ? 'در لیست علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                </span>
            )}
        </button>
    );
};

export default WishlistButton;
