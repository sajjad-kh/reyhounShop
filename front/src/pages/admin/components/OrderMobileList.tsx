// components/OrderMobileList.tsx
import React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Package } from 'lucide-react';
import type { UnifiedAdminOrderRow } from '../types';

type Props = {
    rows: UnifiedAdminOrderRow[];
    onReceiptClick: (row: UnifiedAdminOrderRow) => void;
    onOrderClick: (row: UnifiedAdminOrderRow) => void;
};

export default function OrderMobileList({ rows, onReceiptClick, onOrderClick }: Props) {
    return (
        <div className="md:hidden space-y-4">
            {rows.map((row) => (
                <GlassCard key={row.key} className="p-4 cursor-pointer" onClick={() => onOrderClick(row)}>
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-border-glass-light">
                        <div>
                            <div className="font-mono text-sm">{row.displayId}</div>
                            {(row.trackingCode || row.phone) && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] bg-white/10 text-text-secondary font-mono">
                                    {row.trackingCode || row.phone}
                                </span>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.statusClassName}`}>
                            {row.statusLabel}
                        </span>
                    </div>

                    <div className="flex items-center justify-between my-4">
                        {/* Product images */}
                        <div className="flex items-center gap-1.5">
                            {row.productThumbs.length === 0 ? (
                                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-white/30" />
                                </div>
                            ) : (
                                row.productThumbs.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="relative flex-shrink-0">
                                        <img
                                            src={item.src || '/placeholder.png'}
                                            alt={item.alt}
                                            className="w-14 h-14 object-cover rounded-xl border-2 border-white/20"
                                            title={item.alt}
                                        />
                                        {item.quantity > 1 && (
                                            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-accent-primary text-white text-[9px] font-bold flex items-center justify-center">
                                                {item.quantity}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                            {row.overflowCount > 0 && (
                                <span className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/60">
                                    +{row.overflowCount}
                                </span>
                            )}
                        </div>

                        {/* Separator + Receipt */}
                        {row.source === 'internal' && row.receiptHref && (
                            <>
                                <div className="w-px h-10 bg-white/10" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onReceiptClick(row); }}
                                    className="flex-shrink-0 rounded-xl overflow-hidden border border-white/20 hover:border-accent-primary transition-all"
                                >
                                    {row.receiptIsPdf ? (
                                        <div className="w-14 h-14 bg-glass-medium text-[10px] flex items-center justify-center rounded-xl">PDF</div>
                                    ) : (
                                        <img
                                            src={row.receiptHref}
                                            alt="رسید پرداخت"
                                            className="w-14 h-14 object-cover rounded-xl border-2 border-white/20"
                                        />
                                    )}
                                </button>
                            </>
                        )}
                    </div>

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