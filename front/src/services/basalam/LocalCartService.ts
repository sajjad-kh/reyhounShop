/**
 * Cart Service
 * Manages shopping cart operations with localStorage persistence
 */

import { BasalamProduct, CartItem, CartStorage } from '../../types/basalam';

class CartService {
    private storageKey = 'basalam_cart';

    /**
     * Add item to cart
     */
    addItem(product: BasalamProduct, quantity: number): void {
        const cart = this.getCart();
        const existingItemIndex = cart.findIndex(
            (item) => item.productId === product.id
        );

        if (existingItemIndex >= 0) {
            // Update quantity if item already exists
            cart[existingItemIndex].quantity += quantity;
            cart[existingItemIndex].subtotal =
                cart[existingItemIndex].quantity * cart[existingItemIndex].price;
        } else {
            // Add new item
            cart.push({
                productId: product.id,
                title: product.title,
                price: product.price,
                quantity,
                image: product.image,
                subtotal: product.price * quantity,
            });
        }

        this.saveCart(cart);
        this.triggerCartUpdate();
    }

    /**
     * Remove item from cart
     */
    removeItem(productId: number): void {
        const cart = this.getCart();
        const filteredCart = cart.filter((item) => item.productId !== productId);
        this.saveCart(filteredCart);
        this.triggerCartUpdate();
    }

    /**
     * Update item quantity
     */
    updateQuantity(productId: number, quantity: number): void {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }

        const cart = this.getCart();
        const itemIndex = cart.findIndex((item) => item.productId === productId);

        if (itemIndex >= 0) {
            cart[itemIndex].quantity = quantity;
            cart[itemIndex].subtotal = cart[itemIndex].price * quantity;
            this.saveCart(cart);
            this.triggerCartUpdate();
        }
    }

    /**
     * Get current cart items
     */
    getCart(): CartItem[] {
        try {
            const cartData = localStorage.getItem(this.storageKey);
            if (!cartData) return [];

            const storage: CartStorage = JSON.parse(cartData);
            return storage.items.map((item) => ({
                ...item,
                subtotal: item.price * item.quantity,
            }));
        } catch (error) {
            console.error('Error reading cart from localStorage:', error);
            return [];
        }
    }

    /**
     * Clear all items from cart
     */
    clearCart(): void {
        localStorage.removeItem(this.storageKey);
        this.triggerCartUpdate();
    }

    /**
     * Calculate total amount
     */
    getTotalAmount(): number {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + item.subtotal, 0);
    }

    /**
     * Get cart item count
     */
    getItemCount(): number {
        const cart = this.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    }

    /**
     * Save cart to localStorage
     */
    private saveCart(items: CartItem[]): void {
        const storage: CartStorage = {
            items: items.map((item) => ({
                productId: item.productId,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
            })),
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem(this.storageKey, JSON.stringify(storage));
    }

    /**
     * Trigger cart update event for listeners
     */
    private triggerCartUpdate(): void {
        window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
}

export default new CartService();
