import React from 'react';
import { OrderStatus } from '../../types/order';

interface OrderTrackerProps {
    status: OrderStatus | string;
    paymentStatus?: string;
    paymentRejectionReason?: string | null;
}

const orderSteps = [
    { key: 'payment', label: 'پرداخت', icon: '💳', statuses: ['PENDING_PAYMENT', 'PAYMENT_REVIEW'] },
    { key: 'info', label: 'تکمیل اطلاعات', icon: '📝', statuses: ['INFO'] },
    { key: 'design', label: 'طراحی و چاپ', icon: '🎨', statuses: ['DESIGNING', 'DESIGN_REVIEW', 'DESIGN_APPROVED', 'PRINTING'] },
    { key: 'shipping', label: 'ارسال', icon: '🚚', statuses: ['PACKAGING', 'SHIPPED'] },
    { key: 'delivery', label: 'تحویل', icon: '🎉', statuses: ['DELIVERED'] },
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({
    status,
    paymentStatus,
    paymentRejectionReason,
}) => {
    const ps = String(paymentStatus || '').toUpperCase();
    const st = String(status);

    // ================= PAYMENT ERROR =================
    if (ps === 'FAILED') {
        return (
            <div className="glass-card p-5 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <div className="text-right">
                    <h3 className="text-orange-300 font-semibold mb-2">
                        رسید پرداخت تأیید نشد
                    </h3>

                    <p className="text-white/70 text-sm">
                        رسید توسط مدیر تأیید نشده است.
                    </p>

                    {!!paymentRejectionReason && (
                        <div className="mt-3 p-3 rounded-lg bg-black/20 text-orange-100 text-sm">
                            <span className="font-bold">دلیل:</span>{' '}
                            {paymentRejectionReason}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ================= CANCEL =================
    const isCancelled = st === 'CANCELLED' || st === 'ORDER_CANCELLED';

    if (isCancelled) {
        return (
            <div className="glass-card p-6 bg-red-500/10 border border-red-500/30">
                <div className="text-center text-red-400 font-bold">
                    سفارش لغو شده
                </div>
            </div>
        );
    }

    const paymentOk =
        ps === 'SUCCESS' || ps === 'COMPLETED';

    const currentIndex = orderSteps.findIndex(
        (step) => step.statuses.includes(st)
    );

    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    return (
        <div className="space-y-4">

            {/* ================= PAYMENT ================= */}
            {paymentOk && (
                <div
                    dir="rtl"
                    className="text-xs sm:text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-center"
                >
                    پرداخت تأیید شده
                </div>
            )}

            {/* ================= DESKTOP ================= */}
            <div className="hidden md:flex items-center justify-between">

                {orderSteps.map((step, index) => {

                    const completed = index < safeIndex;
                    const active = step.statuses.includes(st);

                    return (
                        <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center flex-1">

                            <div
                                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                                    completed
                                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                                        : active
                                            ? 'bg-green-500/20 border-2 border-green-500 to-pink-500 scale-110 shadow-lg text-white'
                                            : 'bg-white/10 text-white/70'
                                }`}
                            >
                                <span className={completed ? 'opacity-40' : ''}>
                                    {step.icon}
                                </span>

                            </div>

                                <span
                                    className={`mt-3 text-[11px] sm:text-sm font-medium ${
                                        completed
                                            ? 'text-green-400'
                                            : active
                                                ? 'text-green-400'
                                                : 'text-white/40'
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {index < orderSteps.length - 1 && (
                                <div className="flex-1 h-0.5 mx-2">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            index < safeIndex
                                                ? 'bg-green-500'
                                                : 'bg-white/10'
                                        }`}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ================= MOBILE PROGRESS BAR ================= */}
            <div className="md:hidden">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{
                            width: `${(safeIndex / (orderSteps.length - 1)) * 100}%`
                        }}
                    />
                </div>

                <div className="text-center mt-2 text-xs text-white/60">
                    {orderSteps[safeIndex]?.label}
                </div>
            </div>

        </div>
    );
};