/**
 * Order Sync Service
 * Background service for synchronizing order status with Basalam API
 * 
 * Features:
 * - Poll active orders every 30 seconds
 * - Call sync endpoint for each active order
 * - Update order status in UI via react-query cache
 * - Handle errors gracefully
 */

import BasalamOrderApiService from './BasalamOrderApiService';
import NotificationService from './NotificationService';
import { OrderStatus } from '../../types/basalam';
import { QueryClient } from '@tanstack/react-query';

const SYNC_INTERVAL = 30000; // 30 seconds
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
    'pending_payment',
    'paid',
    'processing',
    'shipped',
];

interface SyncConfig {
    queryClient: QueryClient;
    onStatusChange?: (orderId: number, oldStatus: OrderStatus, newStatus: OrderStatus) => void;
    onError?: (orderId: number, error: Error) => void;
    enableNotifications?: boolean;
}

class OrderSyncService {
    private intervalId: NodeJS.Timeout | null = null;
    private activeOrderIds: Set<number> = new Set();
    private queryClient: QueryClient | null = null;
    private onStatusChange?: (orderId: number, oldStatus: OrderStatus, newStatus: OrderStatus) => void;
    private onError?: (orderId: number, error: Error) => void;
    private isRunning = false;
    private notificationsEnabled = true;

    /**
     * Initialize the sync service with configuration
     */
    initialize(config: SyncConfig): void {
        this.queryClient = config.queryClient;
        this.onStatusChange = config.onStatusChange;
        this.onError = config.onError;
        this.notificationsEnabled = config.enableNotifications !== false;
    }

    /**
     * Check if an order status is active (should be synced)
     */
    private isActiveStatus(status: OrderStatus): boolean {
        return ACTIVE_ORDER_STATUSES.includes(status);
    }

    /**
     * Add an order to the sync list
     */
    addOrder(orderId: number, status: OrderStatus): void {
        if (this.isActiveStatus(status)) {
            this.activeOrderIds.add(orderId);

            // Start sync if not already running
            if (!this.isRunning) {
                this.start();
            }
        }
    }

    /**
     * Remove an order from the sync list
     */
    removeOrder(orderId: number): void {
        this.activeOrderIds.delete(orderId);

        // Stop sync if no active orders
        if (this.activeOrderIds.size === 0) {
            this.stop();
        }
    }

    /**
     * Sync a single order
     */
    private async syncOrder(orderId: number): Promise<void> {
        if (!this.queryClient) {
            console.error('OrderSyncService: QueryClient not initialized');
            return;
        }

        try {
            // Call sync endpoint
            const response = await BasalamOrderApiService.syncOrderStatus(orderId);

            // If status was updated, update the cache
            if (response.updated) {
                const oldStatus = this.queryClient.getQueryData<any>([
                    'basalam-order-details',
                    orderId,
                ])?.status;

                // Update order details cache
                this.queryClient.setQueryData(
                    ['basalam-order-details', orderId],
                    response.order
                );

                // Update order list cache if it exists
                const orderListData = this.queryClient.getQueryData<any>(['basalam-orders']);
                if (orderListData?.orders) {
                    const updatedOrders = orderListData.orders.map((order: any) =>
                        order.id === orderId
                            ? {
                                ...order,
                                status: response.order.status,
                                totalAmount: response.order.totalAmount,
                            }
                            : order
                    );
                    this.queryClient.setQueryData(['basalam-orders'], {
                        ...orderListData,
                        orders: updatedOrders,
                    });
                }

                // Trigger status change callback
                if (oldStatus && oldStatus !== response.order.status) {
                    if (this.onStatusChange) {
                        this.onStatusChange(orderId, oldStatus, response.order.status);
                    }

                    // Show notification for status change
                    if (this.notificationsEnabled) {
                        NotificationService.notifyStatusChange({
                            orderId,
                            orderNumber: response.order.orderNumber,
                            oldStatus,
                            newStatus: response.order.status,
                        });
                    }
                }

                // Remove from active list if order is no longer active
                if (!this.isActiveStatus(response.order.status)) {
                    this.removeOrder(orderId);
                }
            }
        } catch (error) {
            console.error(`Error syncing order ${orderId}:`, error);

            // Trigger error callback
            if (this.onError) {
                this.onError(orderId, error as Error);
            }
        }
    }

    /**
     * Sync all active orders
     */
    private async syncAllOrders(): Promise<void> {
        const orderIds = Array.from(this.activeOrderIds);

        // Sync all orders in parallel
        await Promise.allSettled(
            orderIds.map((orderId) => this.syncOrder(orderId))
        );
    }

    /**
     * Start the background sync
     */
    start(): void {
        if (this.isRunning) {
            return;
        }

        if (!this.queryClient) {
            console.error('OrderSyncService: Cannot start - QueryClient not initialized');
            return;
        }

        this.isRunning = true;

        // Sync immediately on start
        this.syncAllOrders();

        // Set up interval for periodic sync
        this.intervalId = setInterval(() => {
            this.syncAllOrders();
        }, SYNC_INTERVAL);

        console.log('OrderSyncService: Started background sync');
    }

    /**
     * Stop the background sync
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        console.log('OrderSyncService: Stopped background sync');
    }

    /**
     * Get the list of active order IDs being synced
     */
    getActiveOrderIds(): number[] {
        return Array.from(this.activeOrderIds);
    }

    /**
     * Check if sync is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Clear all active orders and stop sync
     */
    reset(): void {
        this.activeOrderIds.clear();
        this.stop();
    }
}

// Export singleton instance
export default new OrderSyncService();
