import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { useAuthCart } from '../hooks/useAuthCart';

interface AppProviderProps {
    children: ReactNode;
}

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

/**
 * Internal component to sync auth and cart
 */
const AuthCartSync: React.FC<{ children: ReactNode }> = ({ children }) => {
    useAuthCart();
    return <>{children}</>;
};

/**
 * Combined provider for all app contexts
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <CartProvider>
                    <AuthCartSync>
                        {children}
                    </AuthCartSync>
                </CartProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
};
