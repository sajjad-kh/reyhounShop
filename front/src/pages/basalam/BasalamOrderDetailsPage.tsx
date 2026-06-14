import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { BasalamOrderDetailsSkeleton } from '../../components/basalam/BasalamSkeletons';
import { useOrderDetails } from '../../hooks/basalam/useOrderDetails';
import { OrderStatus } from '../../types/basalam';
import { cn } from '../../utils';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending_payment: 'در انتظار پرداخت',
    paid: 'پرداخت شده',
    processing: 'در حال پردازش',
    shipped: 'ارسال شده',
    delivered: 'تحویل داده شده',
    cancelled: 'لغو شده'
};

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    pending_payment: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    paid: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    processing: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    shipped: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
    delivered: 'text-green-500 bg-green-500/10 border-green-500/30',
    cancelled: 'text-red-500 bg-red-500/10 border-red-500/30'
};

export const BasalamOrderDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();

    const {
        orderDetails: order,
        isLoading,
        error,
        isSyncing,
        syncStatus
    } = useOrderDetails({
        orderId: Number(orderId),
        autoRefresh: true // Enable auto-refresh for active orders
    });

    const handleSyncStatus = () => {
        syncStatus();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (isLoading) {
        return <BasalamOrderDetailsSkeleton />;
    }

    if (error || !order) {
        return (
            <div className="container mx-auto px-4 py-8 page-enter">
                <GlassCard className="text-center py-16 scale-in">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg className="w-12 h-12 text-accent-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-text-primary text-lg font-medium mb-2">خطا در بارگذاری سفارش</p>
                    <p className="text-accent-error text-sm mb-6">{error || 'سفارش یافت نشد'}</p>
                    <GlassButton onClick={() => navigate('/basalam/orders')} className="hover-lift">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        بازگشت به لیست سفارشات
                    </GlassButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 fade-in-up">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <GlassButton
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/basalam/orders')}
                        className="hover-lift"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </GlassButton>
                    <h1 className="text-xl sm:text-3xl font-bold text-text-primary">
                        جزئیات سفارش #{order.orderNumber}
                    </h1>
                </div>
                <GlassButton
                    variant="secondary"
                    size="md"
                    onClick={handleSyncStatus}
                    loading={isSyncing}
                    disabled={isSyncing}
                    className="hover-lift"
                >
                    <svg className={cn("w-5 h-5 ml-2", isSyncing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    بروزرسانی وضعیت
                </GlassButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Header */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-text-muted mb-1">تاریخ ثبت سفارش</p>
                                <p className="text-lg font-medium text-text-primary">
                                    {formatDate(order.date)}
                                </p>
                            </div>
                            <div className={cn(
                                'px-4 py-2 rounded-lg border',
                                ORDER_STATUS_COLORS[order.status]
                            )}>
                                <span className="font-medium">
                                    {ORDER_STATUS_LABELS[order.status]}
                                </span>
                            </div>
                        </div>

                        {/* Tracking Code */}
                        {order.trackingCode && (
                            <div className="glass-card bg-glass-light p-4 rounded-lg">
                                <p className="text-sm text-text-muted mb-1">کد رهگیری</p>
                                <p className="text-lg font-mono font-bold text-text-primary">
                                    {order.trackingCode}
                                </p>
                            </div>
                        )}
                    </GlassCard>

                    {/* Order Items */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">محصولات سفارش</h2>
                        <div className="space-y-3">
                            {order.items.map((item, index) => (
                                <div
                                    key={item.productId}
                                    className="glass-card bg-glass-light p-4 rounded-xl flex items-center space-x-4 space-x-reverse hover:bg-glass-medium transition-all duration-300 stagger-item"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {/* Product Image */}
                                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-glass-medium flex items-center justify-center">
                                                <span className="text-xs text-text-muted">بدون تصویر</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-text-primary">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-text-muted mt-1">
                                            فروشنده: {item.seller}
                                        </p>
                                        <p className="text-sm text-text-muted mt-1">
                                            {item.quantity} × {item.price.toLocaleString('fa-IR')} تومان
                                        </p>
                                    </div>

                                    {/* Subtotal */}
                                    <div className="text-left">
                                        <p className="font-bold text-text-primary">
                                            {(item.price * item.quantity).toLocaleString('fa-IR')}
                                        </p>
                                        <p className="text-xs text-text-muted">تومان</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Shipping Address */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">آدرس تحویل</h2>
                        <div className="space-y-2">
                            <p className="text-text-primary">
                                <span className="text-text-muted ml-2">استان:</span>
                                {order.shippingAddress.province}
                            </p>
                            <p className="text-text-primary">
                                <span className="text-text-muted ml-2">شهر:</span>
                                {order.shippingAddress.city}
                            </p>
                            <p className="text-text-primary">
                                <span className="text-text-muted ml-2">آدرس:</span>
                                {order.shippingAddress.address}
                            </p>
                            <p className="text-text-primary">
                                <span className="text-text-muted ml-2">کد پستی:</span>
                                {order.shippingAddress.postalCode}
                            </p>
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column - Summary & Status History */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Payment Summary */}
                    <GlassCard className="fade-in-up sticky top-4" style={{ animationDelay: '0.15s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">خلاصه پرداخت</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-text-muted">مبلغ کل:</span>
                                <span className="font-medium text-text-primary">
                                    {order.paymentInfo.amount.toLocaleString('fa-IR')} تومان
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-text-muted">روش پرداخت:</span>
                                <span className="font-medium text-text-primary">
                                    {order.paymentInfo.method}
                                </span>
                            </div>
                            {order.paymentInfo.transactionId && (
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">شماره تراکنش:</span>
                                    <span className="font-mono text-sm text-text-primary">
                                        {order.paymentInfo.transactionId}
                                    </span>
                                </div>
                            )}
                            {order.paymentInfo.paidAt && (
                                <div className="flex items-center justify-between">
                                    <span className="text-text-muted">تاریخ پرداخت:</span>
                                    <span className="text-sm text-text-primary">
                                        {formatDate(order.paymentInfo.paidAt)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-border-glass-light mt-4 pt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-text-primary">مجموع:</span>
                                <span className="text-2xl font-bold text-accent-primary">
                                    {order.totalAmount.toLocaleString('fa-IR')} تومان
                                </span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Status History */}
                    <GlassCard className="fade-in-up" style={{ animationDelay: '0.25s' }}>
                        <h2 className="text-xl font-bold text-text-primary mb-4">تاریخچه وضعیت</h2>
                        <div className="space-y-4">
                            {order.statusHistory.map((history, index) => (
                                <div key={index} className="relative">
                                    {index !== order.statusHistory.length - 1 && (
                                        <div className="absolute right-2 top-8 bottom-0 w-0.5 bg-border-glass-light" />
                                    )}
                                    <div className="flex items-start space-x-3 space-x-reverse">
                                        <div className={cn(
                                            'w-4 h-4 rounded-full flex-shrink-0 mt-1 z-10',
                                            index === 0 ? 'bg-accent-primary' : 'bg-glass-medium border-2 border-border-glass-light'
                                        )} />
                                        <div className="flex-1">
                                            <p className={cn(
                                                'font-medium',
                                                index === 0 ? 'text-accent-primary' : 'text-text-primary'
                                            )}>
                                                {ORDER_STATUS_LABELS[history.status]}
                                            </p>
                                            <p className="text-sm text-text-muted mt-1">
                                                {formatDate(history.timestamp)}
                                            </p>
                                            {history.note && (
                                                <p className="text-sm text-text-muted mt-1">
                                                    {history.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
