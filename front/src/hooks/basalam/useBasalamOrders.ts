/**
 * useBasalamOrders Hook
 * React hook for fetching and managing orders list with react-query
 * 
 * Features:
 * - Fetch orders list with react-query
 * - Implement pagination state
 * - Add filtering by status
 * - Handle loading and error states
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import BasalamOrderApiService from '../../services/basalam/BasalamOrderApiService';
import { OrderFilters, OrderStatus } from '../../types/basalam';

interface UseBasalamOrdersOptions {
    page?: number;
    limit?: number;
    status?: OrderStatus;
}

export const useBasalamOrders = (initialOptions: UseBasalamOrdersOptions = {}) => {
    // Pagination state - initialized from options
    const [page, setPage] = useState(initialOptions.page || 1);
    const [limit, setLimit] = useState(initialOptions.limit || 10);

    // Filtering state - initialized from options
    const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(initialOptions.status);

    // Build filters object for API call
    const filters: OrderFilters = {
        page,
        limit,
        ...(statusFilter && { status: statusFilter }),
    };

    // Fetch orders with react-query
    // Query key includes all filters to refetch when they change
    const {
        data,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['basalam-orders', filters],
        queryFn: () => BasalamOrderApiService.getOrders(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes - cache data for 5 minutes
        retry: 2, // Retry failed requests twice
    });

    return {
        // Data
        orders: data?.orders || [],
        pagination: data?.pagination || { total: 0, page, limit },

        // Loading states
        isLoading, // Initial loading
        isFetching, // Loading during refetch

        // Error handling
        error: error ? (error as Error).message : null,

        // Pagination controls
        page,
        setPage,
        limit,
        setLimit,

        // Filtering controls
        statusFilter,
        setStatusFilter,

        // Refresh function
        refresh: refetch,
    };
};
