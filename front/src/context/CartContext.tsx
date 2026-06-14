import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { CartState, AddToCartRequest, UpdateCartItemRequest, ApplyDiscountRequest } from '../types/cart';
import { cartService } from '../services/cartService';

// Cart Context State
interface CartContextState {
    cart: CartState;
    isLoading: boolean;
    error: string | null;
}

// Cart Actions
type CartAction =
    | { type: 'CART_LOADING' }
    | { type: 'CART_SUCCESS'; payload: CartState }
    | { type: 'CART_ERROR'; payload: string }
    | { type: 'CLEAR_ERROR' };

// Cart Context Interface
interface CartContextType {
    state: CartContextState;
    addToCart: (productId: number, quantity: number) => Promise<void>;
    updateCartItem: (cartItemId: number, quantity: number) => Promise<void>;
    removeFromCart: (cartItemId: number) => Promise<void>;
    clearCart: () => Promise<void>;
    applyDiscountCode: (code: string) => Promise<void>;
    refreshCart: () => Promise<void>;
    clearError: () => void;
}

// Initial State
const initialState: CartContextState = {
    cart: {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        discountAmount: 0,
        shippingCost: 0,
        finalAmount: 0,
    },
    isLoading: true,
    error: null,
};

// Cart Reducer
const cartReducer = (state: CartContextState, action: CartAction): CartContextState => {
    switch (action.type) {
        case 'CART_LOADING':
            return {
                ...state,
                isLoading: true,
                error: null,
            };
        case 'CART_SUCCESS':
            return {
                ...state,
                cart: action.payload,
                isLoading: false,
                error: null,
            };
        case 'CART_ERROR':
            return {
                ...state,
                isLoading: false,
                error: action.payload,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

// Create Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Cart Provider Props
interface CartProviderProps {
    children: ReactNode;
}

// Cart Provider Component
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // Initialize cart on mount (only for authenticated users)
    useEffect(() => {
        const initializeCart = async () => {
            try {
                // Check if user is authenticated
                const token = localStorage.getItem('token');
                if (!token) {
                    // For non-authenticated users, use local storage cart
                    const localCart = cartService.getCartFromLocalStorage();
                    if (localCart) {
                        dispatch({ type: 'CART_SUCCESS', payload: localCart });
                    } else {
                        dispatch({ type: 'CART_SUCCESS', payload: initialState.cart });
                    }
                    return;
                }

                dispatch({ type: 'CART_LOADING' });
                const cart = await cartService.getCart();
                dispatch({ type: 'CART_SUCCESS', payload: cart });
            } catch (error) {
                // Try to load from local storage
                const localCart = cartService.getCartFromLocalStorage();
                if (localCart) {
                    dispatch({ type: 'CART_SUCCESS', payload: localCart });
                } else {
                    dispatch({ type: 'CART_SUCCESS', payload: initialState.cart });
                }
            }
        };

        initializeCart();
    }, []);

    // Listen for cart updates
    useEffect(() => {
        const handleCartUpdate = (event: CustomEvent) => {
            dispatch({ type: 'CART_SUCCESS', payload: event.detail });
        };

        window.addEventListener('cartUpdated', handleCartUpdate as EventListener);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
        };
    }, []);

    // Add to cart
    const addToCart = useCallback(async (productId: number, quantity: number): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            const request: AddToCartRequest = { productId, quantity };
            const updatedCart = await cartService.addToCart(request);
            dispatch({ type: 'CART_SUCCESS', payload: updatedCart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    }, []);

    // Update cart item
    const updateCartItem = async (cartItemId: number, quantity: number): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            const request: UpdateCartItemRequest = { cartItemId, quantity };
            const updatedCart = await cartService.updateCartItem(request);
            dispatch({ type: 'CART_SUCCESS', payload: updatedCart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update cart';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Remove from cart
    const removeFromCart = async (cartItemId: number): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            const updatedCart = await cartService.removeFromCart(cartItemId);
            dispatch({ type: 'CART_SUCCESS', payload: updatedCart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove from cart';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Clear cart
    const clearCart = async (): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            await cartService.clearCart();
            dispatch({ type: 'CART_SUCCESS', payload: initialState.cart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to clear cart';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Apply discount code
    const applyDiscountCode = async (code: string): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            const request: ApplyDiscountRequest = { code };
            const updatedCart = await cartService.applyDiscountCode(request);
            dispatch({ type: 'CART_SUCCESS', payload: updatedCart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to apply discount code';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Refresh cart
    const refreshCart = useCallback(async (): Promise<void> => {
        try {
            dispatch({ type: 'CART_LOADING' });
            const cart = await cartService.getCart();
            dispatch({ type: 'CART_SUCCESS', payload: cart });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh cart';
            dispatch({ type: 'CART_ERROR', payload: errorMessage });
            throw error;
        }
    }, []);

    // Clear error
    const clearError = useCallback((): void => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    const contextValue: CartContextType = {
        state,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        applyDiscountCode,
        refreshCart,
        clearError,
    };

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
    const context = useContext(CartContext);

    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }

    return context;
};

export default CartContext;
