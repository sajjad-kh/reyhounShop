import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { Order } from '../types/order';
import { GlassButton } from '../components/ui/GlassButton';
import { OrderCard } from '../components/order/OrderCard';

export const OrderHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setIsLoading(true);
                const ordersData = await orderService.getOrders();
                setOrders(ordersData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load orders');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="glass-card p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
                    <p className="text-white/60 mb-6">{error}</p>
                    <GlassButton onClick={() => window.location.reload()}>Try Again</GlassButton>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="mx-auto">
                {/* Header */}
                <div className="mb-8 rtl">
                    <h1 className="text-4xl font-bold text-white mb-2">تاریخچه سفارشات</h1>
                    <p className="text-white/60">نمایش سفارشات</p>
                </div>

                {/* Orders List */}
                {orders.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <svg
                            className="w-24 h-24 text-white/20 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                        </svg>
                        <h3 className="text-2xl font-semibold text-white mb-2">No orders yet</h3>
                        <p className="text-white/60 mb-6">
                            Start shopping to see your orders here
                        </p>
                        <GlassButton onClick={() => navigate('/')} ripple>
                            Start Shopping
                        </GlassButton>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onOrderUpdated={(updatedOrder) => {
                                    setOrders(prev =>
                                        prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
                                    );
                                }}
                                onClick={() => navigate(`/orders/${order.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
