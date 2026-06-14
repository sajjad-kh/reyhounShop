// components/PaymentReceiptReviewModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { UnifiedAdminOrderRow } from '../types';

type Props = {
    row: UnifiedAdminOrderRow;
    onClose: () => void;
    submitting: boolean;
    formError: string | null;
    onApprove: () => void;
    onRejectSubmit: (reason: string) => void;
};

export default function PaymentReceiptReviewModal({
    row,
    onClose,
    submitting,
    formError,
    onApprove,
    onRejectSubmit,
}: Props) {
    const [rejectReason, setRejectReason] = React.useState('');

    const paid = row.paymentStatus === 'SUCCESS' || 
                 row.paymentStatus === 'COMPLETED' || 
                 row.paymentStatus === 'APPROVED';

    React.useEffect(() => {
        setRejectReason('');
    }, [row.key]);

    if (row.source !== 'internal') return null;

    const handleBackdrop = (e: React.MouseEvent) => {
        if (!submitting) onClose();
    };

    return (
        <div
            role="presentation"
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            dir="rtl"
            onClick={handleBackdrop}
        >
            <GlassCard
                className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="absolute left-4 top-4 p-2 rounded-lg hover:bg-white/10 disabled:opacity-50"
                >
                    <X className="w-5 h-5 text-text-secondary" />
                </button>

                <h3 className="text-lg font-bold text-text-primary pr-8 mb-1">رسید پرداخت سفارش</h3>
                <p className="text-sm text-text-secondary mb-4 font-mono">{row.displayId}</p>

                {row.paymentRejectionReason && (
                    <div className="mb-4 text-sm text-orange-400 bg-orange-500/10 px-3 py-2 rounded-lg">
                        آخرین دلیل رد: {row.paymentRejectionReason}
                    </div>
                )}

                {!row.receiptHref ? (
                    <p className="text-text-muted">هنوز رسیدی بارگذاری نشده است.</p>
                ) : row.receiptIsPdf ? (
                    <div className="rounded-xl bg-glass-light p-6 text-center mb-6">
                        <p className="mb-3">رسید به صورت PDF است</p>
                        <a href={row.receiptHref} target="_blank" rel="noopener noreferrer" className="text-accent-primary underline">
                            باز کردن PDF
                        </a>
                    </div>
                ) : (
                    <a href={row.receiptHref} target="_blank" rel="noopener noreferrer" className="block mb-6">
                        <img
                            src={row.receiptHref}
                            alt="رسید پرداخت"
                            className="w-full rounded-xl border border-white/10 max-h-[340px] object-contain bg-black/40"
                        />
                    </a>
                )}

                {paid ? (
                    <p className="text-green-400 font-medium">این سفارش قبلاً تأیید شده است.</p>
                ) : row.receiptHref ? (
                    <>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="دلیل رد رسید را بنویسید..."
                            rows={3}
                            className="w-full mt-2 mb-4 px-4 py-3 rounded-xl bg-glass-light border border-border-glass-light text-text-primary placeholder-text-muted focus:ring-2 focus:ring-accent-primary resize-y"
                            disabled={submitting}
                        />
                        {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}

                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            <button
                                onClick={() => onRejectSubmit(rejectReason)}
                                disabled={submitting}
                                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 disabled:opacity-50"
                            >
                                رد رسید
                            </button>
                            <button
                                onClick={onApprove}
                                disabled={submitting}
                                className="flex-1 py-3 rounded-xl bg-gradient-accent text-white font-medium shadow-glass disabled:opacity-50"
                            >
                                تأیید پرداخت
                            </button>
                        </div>
                    </>
                ) : null}
            </GlassCard>
        </div>
    );
}