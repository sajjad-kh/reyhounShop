// components/OrderMobileList.tsx
import React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { ThumbStack } from './ThumbStack';
import type { UnifiedAdminOrderRow } from '../types';

type Props = {
    rows: UnifiedAdminOrderRow[];
    onReceiptClick: (row: UnifiedAdminOrderRow) => void;
};

export default function OrderMobileList({ rows, onReceiptClick }: Props) {
    return (
        <div className="md:hidden space-y-4">
            {rows.map((row) => (
                <GlassCard key={row.key} className="p-4">
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-border-glass-light">
                        <div>
                            <div className="font-mono text-sm">{row.displayId}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] bg-white/10 text-text-secondary">
                                {row.sourceBadge}
                            </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.statusClassName}`}>
                            {row.statusLabel}
                        </span>
                    </div>

                    <div className="flex justify-center my-4">
                        <ThumbStack thumbs={row.productThumbs} overflow={row.overflowCount} />
                    </div>

                    {row.source === 'internal' && row.receiptHref && (
                        <button
                            onClick={() => onReceiptClick(row)}
                            className="w-full mb-4 rounded-xl overflow-hidden border border-white/20 hover:border-accent-primary transition-all"
                        >
                            {row.receiptIsPdf ? (
                                <div className="py-4 bg-glass-medium text-sm">PDF - مشاهده رسید پرداخت</div>
                            ) : (
                                <img
                                    src={row.receiptHref}
                                    alt="رسید پرداخت"
                                    className="w-full h-28 object-contain bg-black/30"
                                />
                            )}
                        </button>
                    )}

                    <div className="mb-4">
                        <div className="font-medium text-text-primary">{row.customerName}</div>
                        <div className="text-xs text-text-muted mt-1 leading-relaxed">{row.detailLine}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-text-muted text-xs">روش ارسال</div>
                            <div className="text-text-primary">{row.shippingTitle}</div>
                        </div>
                        <div>
                            <div className="text-text-muted text-xs">تاریخ</div>
                            <div className="text-text-primary">{row.estimateDateLabel}</div>
                            {row.deadlineExtra && <div className="text-xs mt-1">{row.deadlineExtra}</div>}
                        </div>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}