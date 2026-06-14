import { api } from '../utils/api';
import { CartState, AddToCartRequest, UpdateCartItemRequest, ApplyDiscountRequest } from '../types/cart';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

export class CartService {
    private static instance: CartService;

    private constructor() { }

    public static getInstance(): CartService {
        if (!CartService.instance) {
            CartService.instance = new CartService();
        }
        return CartService.instance;
    }

    /**
     * Get current cart
     */
    async getCart(): Promise<CartState> {
        try {
            const response = await api.get<CartState>(API_ENDPOINTS.CART.GET);

            if (response.success && response.data) {
                this.saveCartToLocalStorage(response.data);
                return response.data;
            }

            throw new Error('Failed to fetch cart');
        } catch (error) {
            // If API fails, try to get from local storage
            const localCart = this.getCartFromLocalStorage();
            if (localCart) {
                return localCart;
            }
            throw this.handleCartError(error);
        }
    }

    /**
     * Add item to cart
     */
    async addToCart(request: AddToCartRequest): Promise<CartState> {
        try {
            const response = await api.post<CartState>(API_ENDPOINTS.CART.ADD, request);

            if (response.success && response.data) {
                this.saveCartToLocalStorage(response.data);
                this.dispatchCartUpdate(response.data);
                return response.data;
            }

            throw new Error('Failed to add item to cart');
        } catch (error) {
            throw this.handleCartError(error);
        }
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(request: UpdateCartItemRequest): Promise<CartState> {
        try {
            const response = await api.put<CartState>(
                `${API_ENDPOINTS.CART.UPDATE}/${request.cartItemId}`,
                { quantity: request.quantity }
            );

            if (response.success && response.data) {
                this.saveCartToLocalStorage(response.data);
                this.dispatchCartUpdate(response.data);
                return response.data;
            }

            throw new Error('Failed to update cart item');
        } catch (error) {
            throw this.handleCartError(error);
        }
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(cartItemId: number): Promise<CartState> {
        try {
            const response = await api.delete<CartState>(`${API_ENDPOINTS.CART.REMOVE}/${cartItemId}`);

            if (response.success && response.data) {
                this.saveCartToLocalStorage(response.data);
                this.dispatchCartUpdate(response.data);
                return response.data;
            }

            throw new Error('Failed to remove item from cart');
        } catch (error) {
            throw this.handleCartError(error);
        }
    }

    /**
     * Clear entire cart
     */
    async clearCart(): Promise<void> {
        try {
            const response = await api.delete(API_ENDPOINTS.CART.CLEAR);

            if (response.success) {
                this.clearLocalStorage();
                this.dispatchCartUpdate(this.getEmptyCart());
            }
        } catch (error) {
            throw this.handleCartError(error);
        }
    }

    /**
     * Apply discount code
     */
    async applyDiscountCode(request: ApplyDiscountRequest): Promise<CartState> {
        try {
            const response = await api.post<CartState>(API_ENDPOINTS.CART.APPLY_COUPON, request);

            if (response.success && response.data) {
                this.saveCartToLocalStorage(response.data);
                this.dispatchCartUpdate(response.data);
                return response.data;
            }

            throw new Error('Failed to apply discount code');
        } catch (error) {
            throw this.handleCartError(error);
        }
    }

    /**
     * Get cart from local storage
     */
    getCartFromLocalStorage(): CartState | null {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART_DATA);

        if (!cartData) {
            return null;
        }

        try {
            return JSON.parse(cartData);
        } catch (error) {
            console.error('Failed to parse cart data:', error);
            return null;
        }
    }

    /**
     * Save cart to local storage
     */
    private saveCartToLocalStorage(cart: CartState): void {
        localStorage.setItem(STORAGE_KEYS.CART_DATA, JSON.stringify(cart));
    }

    /**
     * Clear cart from local storage
     */
    private clearLocalStorage(): void {
        localStorage.removeItem(STORAGE_KEYS.CART_DATA);
    }

    /**
     * Get empty cart state
     */
    private getEmptyCart(): CartState {
        return {
            items: [],
            totalItems: 0,
            totalAmount: 0,
            discountAmount: 0,
            shippingCost: 0,
            finalAmount: 0,
        };
    }

    /**
     * Dispatch cart update event
     */
    private dispatchCartUpdate(cart: CartState): void {
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: cart
        }));
    }

    /**
     * Handle cart errors
     */
    private handleCartError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'Cart operation failed');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}

// Export singleton instance
export const cartService = CartService.getInstance();
