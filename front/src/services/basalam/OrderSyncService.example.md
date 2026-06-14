# OrderSyncService Usage Guide

## Overview

The `OrderSyncService` is a background service that automatically synchronizes order status with the Basalam API every 30 seconds for active orders. It integrates seamlessly with React Query to update the UI when order status changes.

## Features

- ✅ Automatic polling every 30 seconds for active orders
- ✅ Seamless integration with React Query cache
- ✅ Automatic start/stop based on active orders
- ✅ Status change notifications
- ✅ Error handling with callbacks
- ✅ Memory efficient (only syncs active orders)

## Active Order Statuses

The service only syncs orders with the following statuses:
- `pending_payment`
- `paid`
- `processing`
- `shipped`

Orders with `delivered` or `cancelled` status are automatically removed from sync.

## Usage

### Method 1: Automatic Integration (Recommended)

The easiest way to use the sync service is through the `useOrderDetails` hook with `autoRefresh` enabled:

```typescript
import { useOrderDetails } from '../../hooks/basalam/useOrderDetails';

function OrderDetailsPage() {
    const { orderId } = useParams();
    
    const {
        orderDetails,
        isLoading,
        isSyncing,
        syncStatus
    } = useOrderDetails({
        orderId: Number(orderId),
        autoRefresh: true // Enable automatic background sync
    });

    // The order will automatically sync every 30 seconds
    // and the UI will update when status changes
    
    return (
        <div>
            <h1>Order #{orderDetails?.orderNumber}</h1>
            <p>Status: {orderDetails?.status}</p>
            
            {/* Manual sync button */}
            <button onClick={syncStatus} disabled={isSyncing}>
                {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
        </div>
    );
}
```

### Method 2: Manual Control with useOrderSync Hook

For more control, use the `useOrderSync` hook:

```typescript
import { useOrderSync } from '../../hooks/basalam/useOrderSync';
import { useEffect } from 'react';

function OrderListPage() {
    const { orders } = useBasalamOrders();
    
    const { addOrder, removeOrder, isActive } = useOrderSync({
        onStatusChange: (orderId, oldStatus, newStatus) => {
            console.log(`Order ${orderId} changed from ${oldStatus} to ${newStatus}`);
            // Show notification to user
            toast.success(`Order status updated to ${newStatus}`);
        },
        onError: (orderId, error) => {
            console.error(`Error syncing order ${orderId}:`, error);
        }
    });

    // Add active orders to sync
    useEffect(() => {
        orders?.forEach(order => {
            if (isActiveStatus(order.status)) {
                addOrder(order.id, order.status);
            }
        });

        // Cleanup: remove orders when component unmounts
        return () => {
            orders?.forEach(order => {
                removeOrder(order.id);
            });
        };
    }, [orders, addOrder, removeOrder]);

    return (
        <div>
            <h1>My Orders</h1>
            <p>Sync Status: {isActive() ? 'Active' : 'Inactive'}</p>
            {/* Order list */}
        </div>
    );
}
```

### Method 3: Direct Service Usage

For advanced use cases, you can use the service directly:

```typescript
import OrderSyncService from '../../services/basalam/OrderSyncService';
import { useQueryClient } from '@tanstack/react-query';

function App() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Initialize the service
        OrderSyncService.initialize({
            queryClient,
            onStatusChange: (orderId, oldStatus, newStatus) => {
                console.log('Status changed:', orderId, oldStatus, newStatus);
            },
            onError: (orderId, error) => {
                console.error('Sync error:', orderId, error);
            }
        });

        // Add orders to sync
        OrderSyncService.addOrder(123, 'paid');
        OrderSyncService.addOrder(456, 'processing');

        // Service will automatically start when orders are added

        // Cleanup
        return () => {
            OrderSyncService.reset();
        };
    }, [queryClient]);

    return <div>App</div>;
}
```

## API Reference

### OrderSyncService Methods

#### `initialize(config: SyncConfig): void`
Initialize the service with configuration.

```typescript
OrderSyncService.initialize({
    queryClient: QueryClient,
    onStatusChange?: (orderId, oldStatus, newStatus) => void,
    onError?: (orderId, error) => void
});
```

#### `addOrder(orderId: number, status: OrderStatus): void`
Add an order to the sync list. Automatically starts sync if not running.

```typescript
OrderSyncService.addOrder(123, 'paid');
```

#### `removeOrder(orderId: number): void`
Remove an order from the sync list. Automatically stops sync if no orders remain.

```typescript
OrderSyncService.removeOrder(123);
```

#### `start(): void`
Manually start the background sync.

```typescript
OrderSyncService.start();
```

#### `stop(): void`
Manually stop the background sync.

```typescript
OrderSyncService.stop();
```

#### `reset(): void`
Clear all orders and stop sync.

```typescript
OrderSyncService.reset();
```

#### `getActiveOrderIds(): number[]`
Get list of order IDs currently being synced.

```typescript
const orderIds = OrderSyncService.getActiveOrderIds();
console.log('Syncing orders:', orderIds);
```

#### `isActive(): boolean`
Check if sync is currently running.

```typescript
if (OrderSyncService.isActive()) {
    console.log('Sync is running');
}
```

## How It Works

1. **Initialization**: The service is initialized with a React Query client
2. **Adding Orders**: When you add an order with an active status, it's added to the sync list
3. **Auto-Start**: The service automatically starts when the first order is added
4. **Polling**: Every 30 seconds, the service calls the sync endpoint for each active order
5. **Cache Update**: If the status changed, the React Query cache is updated
6. **UI Update**: React components automatically re-render with the new data
7. **Callbacks**: Optional callbacks are triggered for status changes and errors
8. **Auto-Stop**: When an order reaches a final status (delivered/cancelled), it's removed from sync
9. **Cleanup**: When all orders are removed, the service automatically stops

## Performance Considerations

- **Efficient Polling**: Only active orders are synced
- **Parallel Requests**: All orders are synced in parallel
- **Automatic Cleanup**: Orders are removed when they reach final status
- **Cache Integration**: Uses React Query cache to prevent unnecessary re-renders
- **Background Only**: Sync only runs when tab is active (respects React Query settings)

## Best Practices

1. **Use autoRefresh in useOrderDetails**: This is the simplest and most efficient way
2. **Clean up on unmount**: Always remove orders when components unmount
3. **Handle errors gracefully**: Provide error callbacks to handle sync failures
4. **Show sync status**: Display loading indicators when syncing
5. **Notify users**: Show notifications when order status changes

## Example: Complete Integration

```typescript
import React, { useEffect } from 'react';
import { useOrderDetails } from '../../hooks/basalam/useOrderDetails';
import { useToast } from '../../hooks/useToast';

function OrderDetailsPage() {
    const { orderId } = useParams();
    const toast = useToast();
    
    const {
        orderDetails,
        isLoading,
        isSyncing,
        syncStatus,
        error
    } = useOrderDetails({
        orderId: Number(orderId),
        autoRefresh: true
    });

    // Show notification when status changes
    useEffect(() => {
        if (orderDetails) {
            // You can track previous status and show notification
            // This is handled automatically by the sync service
        }
    }, [orderDetails?.status]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    if (!orderDetails) return <NotFound />;

    return (
        <div>
            <h1>Order #{orderDetails.orderNumber}</h1>
            
            {/* Status Badge */}
            <StatusBadge status={orderDetails.status} />
            
            {/* Sync Button */}
            <button 
                onClick={syncStatus}
                disabled={isSyncing}
                className="sync-button"
            >
                {isSyncing ? (
                    <>
                        <Spinner /> Syncing...
                    </>
                ) : (
                    <>
                        <RefreshIcon /> Sync Status
                    </>
                )}
            </button>
            
            {/* Order Details */}
            <OrderItems items={orderDetails.items} />
            <ShippingAddress address={orderDetails.shippingAddress} />
            <StatusHistory history={orderDetails.statusHistory} />
        </div>
    );
}
```

## Troubleshooting

### Sync not working
- Ensure `QueryClient` is initialized
- Check that order status is active (not delivered/cancelled)
- Verify backend sync endpoint is working

### Multiple syncs running
- Make sure to call `removeOrder` on component unmount
- Use `reset()` to clear all orders if needed

### UI not updating
- Verify React Query cache keys match
- Check that `queryClient` is the same instance used in `QueryProvider`

### Performance issues
- Limit the number of active orders being synced
- Consider increasing sync interval if needed (modify `SYNC_INTERVAL`)
