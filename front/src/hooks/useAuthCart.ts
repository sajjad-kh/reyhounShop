import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useCart } from './useCart';

/**
 * Hook to sync cart when user authentication state changes
 */
export const useAuthCart = () => {
    const { state: authState } = useAuth();
    const { refreshCart } = useCart();

    useEffect(() => {
        // When user logs in, refresh cart to get server-side cart
        if (authState.user && !authState.isLoading) {
            refreshCart();
        }
    }, [authState.user, authState.isLoading, refreshCart]); // Now refreshCart is stable with useCallback
};