import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { User, Address, LoyaltyPoints } from '../types/user';

export class UserService {
    private static instance: UserService;

    private constructor() { }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    /**
     * Get user profile
     */
    async getProfile(): Promise<User> {
        try {
            const response = await api.get<User>(API_ENDPOINTS.USER.PROFILE);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to fetch profile');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        try {
            const response = await api.put<User>(API_ENDPOINTS.USER.PROFILE, data);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to update profile');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get user addresses
     */
    async getAddresses(): Promise<Address[]> {
        try {
            const response = await api.get<Address[]>(API_ENDPOINTS.USER.ADDRESSES);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
            return [];
        }
    }

    /**
     * Add new address
     */
    async addAddress(address: Omit<Address, 'id'>): Promise<Address> {
        try {
            const response = await api.post<Address>(API_ENDPOINTS.USER.ADDRESSES, address);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to add address');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Update address
     */
    async updateAddress(id: number, address: Partial<Address>): Promise<Address> {
        try {
            const response = await api.put<Address>(`${API_ENDPOINTS.USER.ADDRESSES}/${id}`, address);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to update address');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Delete address
     */
    async deleteAddress(id: number): Promise<void> {
        try {
            const response = await api.delete(`${API_ENDPOINTS.USER.ADDRESSES}/${id}`);

            if (!response.success) {
                throw new Error('Failed to delete address');
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get wishlist
     */
    async getWishlist(): Promise<number[]> {
        try {
            const response = await api.get<number[]>(API_ENDPOINTS.USER.WISHLIST);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
            return [];
        }
    }

    /**
     * Add to wishlist
     */
    async addToWishlist(productId: number): Promise<void> {
        try {
            const response = await api.post(API_ENDPOINTS.USER.WISHLIST, { productId });

            if (!response.success) {
                throw new Error('Failed to add to wishlist');
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Remove from wishlist
     */
    async removeFromWishlist(productId: number): Promise<void> {
        try {
            const response = await api.delete(`${API_ENDPOINTS.USER.WISHLIST}/${productId}`);

            if (!response.success) {
                throw new Error('Failed to remove from wishlist');
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get loyalty points
     */
    async getLoyaltyPoints(): Promise<LoyaltyPoints> {
        try {
            const response = await api.get<LoyaltyPoints>(API_ENDPOINTS.USER.LOYALTY_POINTS);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to fetch loyalty points');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle service errors
     */
    private handleError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'User service error');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}

// Export singleton instance
export const userService = UserService.getInstance();
