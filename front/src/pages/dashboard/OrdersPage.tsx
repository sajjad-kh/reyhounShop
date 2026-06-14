import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { OrderTracker } from '../../components/order/OrderTracker';
import { orderService } from '../../services/orderService';
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

/* ================= SAFE ================= */

const safeNumber = (v?: number | null) => v ?? 0;

function userPaymentBadge(o: Order): { label: string; className: string } {
    const ps = String(o.paymentStatus || '').toUpperCase();
    if (ps === 'SUCCESS' || ps === 'COMPLETED') {
        return { label: 'پرداخت تأیید شد', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (ps === 'FAILED') {
        return { label: 'پرداخت تأیید نشد', className: 'bg-red-500/20 text-red-300 border-red-500/30' };
    }
    if (o.paymentProofUrl) {
        return { label: 'رسید ارائه شده — تأیید ادمین', className: 'bg-amber-500/15 text-amber-200 border-amber-500/25' };
    }
    return { label: 'در انتظار پرداخت / رسید', className: 'bg-white/8 text-text-secondary border-white/15' };
}

/* ================= PAGE ================= */

export const OrdersPage: React.FC = () => {
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

    const canResubmit = (order: Order | null): boolean => {
        if (!order) return false;
        return Boolean(
            order.canResubmitPaymentProof ||
            order.paymentStatus === 'FAILED' ||
            order.status === 'PAYMENT_REJECTED'
        );
    };

    const handleResubmitProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selected) return;

        try {
            setIsResubmitting(true);
            const updated = await orderService.resendPaymentProof(selected.id, file);
            setSelected(updated);
            setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
            alert('رسید با موفقیت مجدد ارسال شد و در انتظار بررسی ادمین است.');
        } catch (error: any) {
            const message = error?.response?.data?.error?.message || error?.message || 'خطا در ارسال مجدد رسید';
            alert(message);
        } finally {
            setIsResubmitting(false);
            event.target.value = '';
        }
    };

    const handleDownloadPdf = async () => {
        if (!selected) return;
        try {
            setIsDownloadingPdf(true);
            await orderService.downloadReceiptPdf(selected.id);
        } catch (error) {
            alert('دانلود PDF رسید با خطا مواجه شد.');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

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
                                        {(() => {
                                            const pb = userPaymentBadge(o);
                                            return (
                                                <span
                                                    className={`text-[10px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap border ${pb.className}`}
                                                    title={pb.label}
                                                >
                                                    {pb.label}
                                                </span>
                                            );
                                        })()}
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
                                    <p className="text-lg font-bold">
                                        {formatCurrency(safeNumber(o.finalAmount))}
                                    </p>
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

            {/* ================= MODAL (MOBILE FIXED FULL SCREEN) ================= */}
            {selected && (
                <div className="fixed inset-0 z-50 bg-black/70 flex">

                    <div className="w-full h-full sm:h-auto sm:max-w-3xl sm:mx-auto sm:my-10 bg-black/30 backdrop-blur-xl overflow-y-auto">

                        <GlassCard className="p-4 sm:p-6 min-h-full sm:min-h-auto">

                            {/* HEADER */}
                            <div className="flex justify-between items-start gap-3">

                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-bold truncate">
                                        Order #{selected.trackingCode}
                                    </h2>
                                    <p className="text-xs text-text-secondary">
                                        {formatDate(selected.createdAt)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-2 shrink-0"
                                >
                                    <CloseIcon />
                                </button>

                            </div>

                            {/* PAYMENT */}
                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                {(() => {
                                    const pb = userPaymentBadge(selected);
                                    return (
                                        <span
                                            className={`px-3 py-1 rounded-full border ${pb.className}`}
                                        >
                                            {pb.label}
                                        </span>
                                    );
                                })()}
                                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-text-secondary">
                                    وضعیت سفارش: {selected.status}
                                </span>
                            </div>

                            {/* TRACKER */}
                            <div className="mt-4">
                                <OrderTracker
                                    status={selected.status}
                                    paymentStatus={selected.paymentStatus}
                                    paymentRejectionReason={selected.paymentRejectionReason}
                                />
                            </div>

                            {/* ITEMS (MOBILE SAFE LIST) */}
                            <div className="mt-5 space-y-3">

                                {(selected.items ?? []).map((i) => (
                                    <div
                                        key={i.id}
                                        className="flex gap-3 items-center"
                                    >

                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                                            <img
                                                src={getImageUrl(i.product?.images?.[0]?.url)}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm truncate">
                                                {i.product?.name}
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                Qty: {i.quantity}
                                            </p>
                                        </div>

                                        <div className="text-right text-sm">
                                            {formatCurrency(safeNumber(i.subtotal))}
                                        </div>

                                    </div>
                                ))}

                            </div>

                            {/* TOTAL */}
                            <div className="mt-5 pt-3 border-t border-white/10 flex justify-between">
                                <span>Total</span>
                                <span className="font-bold">
                                    {formatCurrency(safeNumber(selected.finalAmount))}
                                </span>
                            </div>

                            {/* RECEIPT ACTIONS */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloadingPdf}
                                    className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm hover:bg-white/10 disabled:opacity-60"
                                >
                                    {isDownloadingPdf ? 'در حال دانلود...' : 'دانلود PDF رسید'}
                                </button>

                                {canResubmit(selected) && (
                                    <label className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm hover:bg-amber-500/20 cursor-pointer">
                                        {isResubmitting ? 'در حال ارسال...' : 'ارسال مجدد رسید'}
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                                            className="hidden"
                                            onChange={handleResubmitProof}
                                            disabled={isResubmitting}
                                        />
                                    </label>
                                )}
                            </div>

                        </GlassCard>

                    </div>
                </div>
            )}

        </div>
    );
};