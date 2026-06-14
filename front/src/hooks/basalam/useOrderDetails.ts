/**
 * useOrderDetails Hook
 * React hook for fetching and managing order details with react-query
 * 
 * Features:
 * - Fetch order details with react-query
 * - Implement auto-refresh for active orders
 * - Handle loading and error states
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import BasalamOrderApiService from '../../services/basalam/BasalamOrderApiService';
import OrderSyncService from '../../services/basalam/OrderSyncService';

interface UseOrderDetailsOptions {
    orderId: number;
    autoRefresh?: boolean;
}

/**
 * Check if an order is active (should be auto-refreshed)
 * Active orders are those that are not in final states
 */
const isActiveOrder = (status: string): boolean => {
    return status !== 'delivered' && status !== 'cancelled';
};

export const useOrderDetails = ({ orderId, autoRefresh = false }: UseOrderDetailsOptions) => {
    const queryClient = useQueryClient();

    // Fetch order details with react-query
    const {
        data: orderDetails,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['basalam-order-details', orderId],
        queryFn: () => BasalamOrderApiService.getOrderDetails(orderId),
        enabled: !!orderId, // Only fetch if orderId is provided
        staleTime: 2 * 60 * 1000, // 2 minutes - cache data for 2 minutes
        retry: 2, // Retry failed requests twice
        refetchInterval: false, // Disable react-query auto-refresh, use OrderSyncService instead
        refetchIntervalInBackground: false, // Don't refetch when tab is not active
    });

    // Add order to sync service when autoRefresh is enabled and order is active
    useEffect(() => {
        if (autoRefresh && orderDetails && isActiveOrder(orderDetails.status)) {
            // Initialize sync service if not already initialized
            if (!OrderSyncService.isActive()) {
                OrderSyncService.initialize({
                    queryClient,
                });
            }

            // Add order to sync
            OrderSyncService.addOrder(orderId, orderDetails.status);

            // Remove order from sync on unmount or when it becomes inactive
            return () => {
                OrderSyncService.removeOrder(orderId);
            };
        }
    }, [autoRefresh, orderId, orderDetails?.status, queryClient]);

    // Mutation for syncing order status
    const syncStatusMutation = useMutation({
        mutationFn: () => BasalamOrderApiService.syncOrderStatus(orderId),
        onSuccess: (response) => {
            // Update the cache with the new order data
            if (response.updated) {
                queryClient.setQueryData(['basalam-order-details', orderId], response.order);
            }
        },
        onError: (error) => {
            console.error('Error syncing order status:', error);
        },
    });

    // Manual sync status function
    const syncStatus = () => {
        syncStatusMutation.mutate();
    };

    return {
        // Data
        orderDetails: orderDetails || null,

        // Loading states
        isLoading, // Initial loading
        isFetching, // Loading during refetch
        isSyncing: syncStatusMutation.isPending,

        // Error handling
        error: error ? (error as Error).message : null,
        syncError: syncStatusMutation.error ? (syncStatusMutation.error as Error).message : null,

        // Actions
        refresh: refetch,
        syncStatus,
    };
};
