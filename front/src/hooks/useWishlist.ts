import { useState, useEffect, useCallback } from 'react';
import { wishlistService, WishlistItem } from '../services/wishlistService';

export const useWishlist = () => {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load wishlist
    const loadWishlist = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const items = await wishlistService.getWishlist();
            setWishlist(items);
        } catch (err) {
            setError('Failed to load wishlist');
            console.error('Error loading wishlist:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check if product is in wishlist
    const isInWishlist = useCallback((productId: number): boolean => {
        return wishlist.some(item => item.productId === productId);
    }, [wishlist]);

    // Get wishlist item by product ID
    const getWishlistItem = useCallback((productId: number): WishlistItem | undefined => {
        return wishlist.find(item => item.productId === productId);
    }, [wishlist]);

    // Add to wishlist
    const addToWishlist = useCallback(async (productId: number): Promise<void> => {
        try {
            setError(null);
            const newItem = await wishlistService.addToWishlist(productId);
            setWishlist(prev => [...prev, newItem]);
        } catch (err) {
            setError('Failed to add to wishlist');
            console.error('Error adding to wishlist:', err);
            throw err;
        }
    }, []);

    // Remove from wishlist
    const removeFromWishlist = useCallback(async (wishlistItemId: number): Promise<void> => {
        try {
            setError(null);
            await wishlistService.removeFromWishlist(wishlistItemId);
            setWishlist(prev => prev.filter(item => item.id !== wishlistItemId));
        } catch (err) {
            setError('Failed to remove from wishlist');
            console.error('Error removing from wishlist:', err);
            throw err;
        }
    }, []);

    // Toggle wishlist (add if not in wishlist, remove if in wishlist)
    const toggleWishlist = useCallback(async (productId: number): Promise<void> => {
        const item = getWishlistItem(productId);
        if (item) {
            await removeFromWishlist(item.id);
        } else {
            await addToWishlist(productId);
        }
    }, [getWishlistItem, addToWishlist, removeFromWishlist]);

    // Clear wishlist
    const clearWishlist = useCallback(async (): Promise<void> => {
        try {
            setError(null);
            await wishlistService.clearWishlist();
            setWishlist([]);
        } catch (err) {
            setError('Failed to clear wishlist');
            console.error('Error clearing wishlist:', err);
            throw err;
        }
    }, []);

    // Load wishlist on mount
    useEffect(() => {
        loadWishlist();
    }, [loadWishlist]);

    return {
        wishlist,
        isLoading,
        error,
        isInWishlist,
        getWishlistItem,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        refreshWishlist: loadWishlist,
    };
};

export default useWishlist;
