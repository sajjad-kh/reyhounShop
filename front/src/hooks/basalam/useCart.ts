/**
 * useCart Hook
 * React hook for managing cart state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import CartService from '../../services/basalam/LocalCartService';
import { BasalamProduct, CartItem } from '../../types/basalam';

export const useCart = () => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [itemCount, setItemCount] = useState<number>(0);

    // Load cart from localStorage on mount
    useEffect(() => {
        loadCart();
    }, []);

    // Listen for cart updates
    useEffect(() => {
        const handleCartUpdate = () => {
            loadCart();
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
        };
    }, []);

    const loadCart = useCallback(() => {
        const items = CartService.getCart();
        const total = CartService.getTotalAmount();
        const count = CartService.getItemCount();

        setCart(items);
        setTotalAmount(total);
        setItemCount(count);
    }, []);

    const addItem = useCallback((product: BasalamProduct, quantity: number) => {
        CartService.addItem(product, quantity);
    }, []);

    const removeItem = useCallback((productId: number) => {
        CartService.removeItem(productId);
    }, []);

    const updateQuantity = useCallback((productId: number, quantity: number) => {
        CartService.updateQuantity(productId, quantity);
    }, []);

    const clearCart = useCallback(() => {
        CartService.clearCart();
    }, []);

    return {
        cart,
        totalAmount,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
    };
};
