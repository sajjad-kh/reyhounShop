/**
 * useOrderSync Hook
 * React hook for managing background order synchronization
 * 
 * Features:
 * - Initialize and manage OrderSyncService
 * - Automatically add/remove orders from sync
 * - Handle status change notifications
 * - Clean up on unmount
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import OrderSyncService from '../../services/basalam/OrderSyncService';
import { OrderStatus } from '../../types/basalam';

interface UseOrderSyncOptions {
    onStatusChange?: (orderId: number, oldStatus: OrderStatus, newStatus: OrderStatus) => void;
    onError?: (orderId: number, error: Error) => void;
}

/**
 * Hook to manage background order synchronization
 */
export const useOrderSync = (options: UseOrderSyncOptions = {}) => {
    const queryClient = useQueryClient();
    const isInitialized = useRef(false);

    // Initialize the sync service once
    useEffect(() => {
        if (!isInitialized.current) {
            OrderSyncService.initialize({
                queryClient,
                onStatusChange: options.onStatusChange,
                onError: options.onError,
            });
            isInitialized.current = true;
        }
    }, [queryClient, options.onStatusChange, options.onError]);

    // Add an order to sync
    const addOrder = useCallback((orderId: number, status: OrderStatus) => {
        OrderSyncService.addOrder(orderId, status);
    }, []);

    // Remove an order from sync
    const removeOrder = useCallback((orderId: number) => {
        OrderSyncService.removeOrder(orderId);
    }, []);

    // Start sync manually
    const start = useCallback(() => {
        OrderSyncService.start();
    }, []);

    // Stop sync manually
    const stop = useCallback(() => {
        OrderSyncService.stop();
    }, []);

    // Reset sync service
    const reset = useCallback(() => {
        OrderSyncService.reset();
    }, []);

    // Get active order IDs
    const getActiveOrderIds = useCallback(() => {
        return OrderSyncService.getActiveOrderIds();
    }, []);

    // Check if sync is active
    const isActive = useCallback(() => {
        return OrderSyncService.isActive();
    }, []);

    return {
        addOrder,
        removeOrder,
        start,
        stop,
        reset,
        getActiveOrderIds,
        isActive,
    };
};
