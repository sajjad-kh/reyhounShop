import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { OrderTracker } from '../../components/order/OrderTracker';
import { orderService } from '../../services/orderService';
import { reviewService } from '../../services/reviewService';
import { Order } from '../../types/order';
import { formatCurrency, formatDate } from '../../utils/format';
import { getImageUrl } from '../../utils/constants';

/* ================= ICONS ================= */

const PackageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
    </svg>
);

/* ================= PAGE ================= */
//jadide
export const ReviewsPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Order | null>(null);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await orderService.getOrders();
                setOrders(Array.isArray(data) ? data : []);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="glass-spinner w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="space-y-5 px-3 sm:px-0">

            {/* HEADER */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                    تاریخچه سفارشات
                </h1>
                <p className="text-sm text-text-secondary">
                    نمایش سفارشات شما
                </p>
            </div>

            {/* EMPTY */}
            {orders.length === 0 ? (
                <GlassCard className="p-8 text-center">
                    <PackageIcon />
                    <p className="mt-3 text-text-secondary">
                        No orders yet
                    </p>
                </GlassCard>
            ) : (

                <div className="space-y-3">

                    {orders.map((o) => (
                        <GlassCard
                            key={o.id}
                            className="p-4 sm:p-5 cursor-pointer active:scale-[0.99] transition"
                            onClick={() => setSelected(o)}
                        >

                            {/* TOP ROW (MOBILE SAFE STACK) */}
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

                                <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate max-w-[200px] sm:max-w-none">
                                            #{o.trackingCode}
                                        </h3>

                                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-white/10 whitespace-nowrap border border-white/10">
                                            {o.status}
                                        </span>
                                       
                                    </div>

                                    <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                        {(o.items?.length ?? 0)} items • {formatDate(o.createdAt)}
                                    </p>
                                    {o.paymentStatus === 'FAILED' && (o.paymentRejectionReason || '').trim() ? (
                                        <p className="text-[11px] text-orange-300/95 mt-1.5 line-clamp-2">
                                            دلیل رد رسید: {o.paymentRejectionReason}
                                        </p>
                                    ) : null}

                                </div>

                                <div className="sm:text-right">
                                    <p className="text-xs text-text-secondary">Total</p>

                                </div>

                            </div>

                            {/* ITEMS PREVIEW (SAFE SCROLL MOBILE) */}
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

                                {(o.items ?? []).slice(0, 4).map((i) => (
                                    <div
                                        key={i.id}
                                        className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white/10"
                                    >
                                        <img
                                            src={getImageUrl(i.product?.images?.[0]?.url)}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}

                                {(o.items?.length ?? 0) > 4 && (
                                    <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400">
                                        +{o.items.length - 4}
                                    </div>
                                )}

                            </div>

                        </GlassCard>
                    ))}

                </div>
            )}



        </div>
    );
};