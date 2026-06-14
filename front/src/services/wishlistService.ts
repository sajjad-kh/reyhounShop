import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { Product } from '../types/product';

export interface WishlistItem {
    id: number;
    userId: number;
    productId: number;
    product: Product;
    createdAt: string;
}

export class WishlistService {
    private static instance: WishlistService;

    private constructor() { }

    public static getInstance(): WishlistService {
        if (!WishlistService.instance) {
            WishlistService.instance = new WishlistService();
        }
        return WishlistService.instance;
    }

    /**
     * Get user's wishlist
     */
    async getWishlist(): Promise<WishlistItem[]> {
        try {
            const response = await api.get<WishlistItem[]>(API_ENDPOINTS.USER.WISHLIST);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
            throw error;
        }
    }

    /**
     * Add product to wishlist
     */
    async addToWishlist(productId: number): Promise<WishlistItem> {
        try {
            const response = await api.post<WishlistItem>(API_ENDPOINTS.USER.WISHLIST, {
                productId,
            });

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to add to wishlist');
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            throw error;
        }
    }

    /**
     * Remove product from wishlist
     */
    async removeFromWishlist(wishlistItemId: number): Promise<void> {
        try {
            const response = await api.delete(`${API_ENDPOINTS.USER.WISHLIST}/${wishlistItemId}`);

            if (!response.success) {
                throw new Error('Failed to remove from wishlist');
            }
        } catch (error) {
            console.error('Failed to remove from wishlist:', error);
            throw error;
        }
    }

    /**
     * Check if product is in wishlist
     */
    async isInWishlist(productId: number): Promise<boolean> {
        try {
            const wishlist = await this.getWishlist();
            return wishlist.some(item => item.productId === productId);
        } catch (error) {
            console.error('Failed to check wishlist:', error);
            return false;
        }
    }

    /**
     * Clear entire wishlist
     */
    async clearWishlist(): Promise<void> {
        try {
            const response = await api.delete(API_ENDPOINTS.USER.WISHLIST);

            if (!response.success) {
                throw new Error('Failed to clear wishlist');
            }
        } catch (error) {
            console.error('Failed to clear wishlist:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const wishlistService = WishlistService.getInstance();
