import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export interface OrderStats {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    loading: boolean;
    error: string | null;
}

export const useOrderStats = (userId?: number) => {
    const [stats, setStats] = useState<OrderStats>({
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!userId) {
            setStats({
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
                loading: false,
                error: null,
            });
            return;
        }

        const fetchStats = async () => {
            try {
                setStats(prev => ({ ...prev, loading: true, error: null }));

                // Fetch orders from Basalam API
                const response = await api.get('/basalam/orders', {
                    params: { page: 1, limit: 100 }, // Get all orders for stats
                });

                if (response.success && response.data) {
                    const orders = response.data.orders || [];

                    const totalOrders = orders.length;
                    const pendingOrders = orders.filter((order: any) =>
                        order.status === 'pending_payment' || order.status === 'processing'
                    ).length;
                    const completedOrders = orders.filter((order: any) =>
                        order.status === 'delivered'
                    ).length;

                    setStats({
                        totalOrders,
                        pendingOrders,
                        completedOrders,
                        loading: false,
                        error: null,
                    });
                } else {
                    throw new Error('Failed to fetch order stats');
                }
            } catch (error: any) {
                console.error('Error fetching order stats:', error);
                setStats(prev => ({
                    ...prev,
                    loading: false,
                    error: error.message || 'Failed to load order statistics',
                }));
            }
        };

        fetchStats();

        // Refresh stats every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [userId]);

    const refresh = async () => {
        if (!userId) return;

        try {
            setStats(prev => ({ ...prev, loading: true }));

            const response = await api.get('/basalam/orders', {
                params: { page: 1, limit: 100 },
            });

            if (response.success && response.data) {
                const orders = response.data.orders || [];

                const totalOrders = orders.length;
                const pendingOrders = orders.filter((order: any) =>
                    order.status === 'pending_payment' || order.status === 'processing'
                ).length;
                const completedOrders = orders.filter((order: any) =>
                    order.status === 'delivered'
                ).length;

                setStats({
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    loading: false,
                    error: null,
                });
            }
        } catch (error: any) {
            console.error('Error refreshing order stats:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to refresh statistics',
            }));
        }
    };

    return { ...stats, refresh };
};

export default useOrderStats;
