import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Pagination } from '../../components/ui/Pagination';
import { BasalamOrderListItemSkeleton } from '../../components/basalam/BasalamSkeletons';
import { useBasalamOrders } from '../../hooks/basalam/useBasalamOrders';
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
    pending_payment: 'text-yellow-500 bg-yellow-500/10',
    paid: 'text-blue-500 bg-blue-500/10',
    processing: 'text-purple-500 bg-purple-500/10',
    shipped: 'text-indigo-500 bg-indigo-500/10',
    delivered: 'text-green-500 bg-green-500/10',
    cancelled: 'text-red-500 bg-red-500/10'
};

export const BasalamOrderListPage: React.FC = () => {
    const navigate = useNavigate();

    const {
        orders,
        pagination,
        isLoading,
        error,
        page,
        setPage,
        limit,
        statusFilter,
        setStatusFilter,
        refresh
    } = useBasalamOrders({
        page: 1,
        limit: 10
    });

    const handleOrderClick = (orderId: number) => {
        navigate(`/basalam/orders/${orderId}`);
    };

    const handleRefresh = () => {
        refresh();
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

    return (
        <div className="container mx-auto px-4 py-8 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 fade-in-up">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">سفارشات من</h1>
                <GlassButton
                    variant="secondary"
                    size="md"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="hover-lift"
                >
                    <svg className={cn("w-5 h-5 ml-2", isLoading && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    بروزرسانی
                </GlassButton>
            </div>

            {/* Status Filter */}
            <GlassCard className="mb-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center space-x-2 space-x-reverse overflow-x-auto pb-2 custom-scrollbar">
                    <button
                        onClick={() => setStatusFilter(undefined)}
                        className={cn(
                            'px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap active:scale-95',
                            !statusFilter
                                ? 'bg-accent-primary text-white shadow-lg scale-105'
                                : 'bg-glass-light hover:bg-glass-medium text-text-muted hover-brightness'
                        )}
                    >
                        همه
                    </button>
                    {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as OrderStatus)}
                            className={cn(
                                'px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap active:scale-95',
                                statusFilter === status
                                    ? 'bg-accent-primary text-white shadow-lg scale-105'
                                    : 'bg-glass-light hover:bg-glass-medium text-text-muted hover-brightness'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* Loading State */}
            {isLoading && (
                <div className="space-y-4 fade-in">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <BasalamOrderListItemSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && (
                <GlassCard className="text-center py-12">
                    <p className="text-accent-error mb-4">{error}</p>
                    <GlassButton onClick={handleRefresh}>تلاش مجدد</GlassButton>
                </GlassCard>
            )}

            {/* Empty State */}
            {!isLoading && !error && orders.length === 0 && (
                <GlassCard className="text-center py-16 scale-in">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <p className="text-text-primary text-lg font-medium mb-2">سفارشی یافت نشد</p>
                    <p className="text-text-muted text-sm mb-6">
                        {statusFilter ? 'سفارشی با این وضعیت وجود ندارد' : 'هنوز سفارشی ثبت نکرده‌اید'}
                    </p>
                    <GlassButton onClick={() => navigate('/basalam/products')} className="hover-lift">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        مشاهده محصولات
                    </GlassButton>
                </GlassCard>
            )}

            {/* Orders List */}
            {!isLoading && !error && orders.length > 0 && (
                <>
                    <div className="space-y-4">
                        {orders.map((order, index) => (
                            <GlassCard
                                key={order.id}
                                hover
                                className="cursor-pointer transition-all duration-300 hover-lift stagger-item"
                                style={{ animationDelay: `${index * 0.05}s` }}
                                onClick={() => handleOrderClick(order.id)}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Order Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-4 space-x-reverse mb-2">
                                            <h3 className="text-lg font-bold text-text-primary">
                                                سفارش #{order.orderNumber}
                                            </h3>
                                            <span className={cn(
                                                'px-3 py-1 rounded-lg text-sm font-medium',
                                                ORDER_STATUS_COLORS[order.status]
                                            )}>
                                                {ORDER_STATUS_LABELS[order.status]}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-text-muted">
                                            <span>{formatDate(order.date)}</span>
                                            <span>•</span>
                                            <span>{order.itemsCount} محصول</span>
                                        </div>
                                    </div>

                                    {/* Order Amount */}
                                    <div className="text-left">
                                        <p className="text-2xl font-bold text-text-primary">
                                            {order.totalAmount.toLocaleString('fa-IR')}
                                        </p>
                                        <p className="text-sm text-text-muted">تومان</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total > limit && (
                        <div className="mt-8 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={Math.ceil(pagination.total / limit)}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
