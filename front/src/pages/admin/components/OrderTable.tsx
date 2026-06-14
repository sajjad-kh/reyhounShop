// components/OrderTable.tsx
import React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { ThumbStack } from './ThumbStack';
import type { UnifiedAdminOrderRow } from '../types';

type Props = {
    rows: UnifiedAdminOrderRow[];
    onReceiptClick: (row: UnifiedAdminOrderRow) => void;
    onManagementClick: (row: UnifiedAdminOrderRow) => void;   // ← جدید برای مدال مدیریت
};

export default function OrderTable({ rows, onReceiptClick, onManagementClick }: Props) {
    return (
        <GlassCard className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border-glass-light">
                            <th className="text-center py-3 px-4 text-text-primary font-semibold">عکس محصول</th>
                            <th className="text-center py-3 px-3 text-text-primary font-semibold min-w-[100px]">رسید</th>
                            <th className="text-center py-3 px-4 text-text-primary font-semibold">کد سفارش</th>
                            <th className="text-right py-3 px-4 text-text-primary font-semibold">نام مشتری</th>
                            <th className="text-center py-3 px-4 text-text-primary font-semibold">وضعیت</th>
                            <th className="text-center py-3 px-4 text-text-primary font-semibold">روش ارسال</th>
                            <th className="text-center py-3 px-4 text-text-primary font-semibold">مهلت / تاریخ</th>
                            <th className="text-center py-3 px-4 text-text-primary font-semibold w-36">مدیریت سفارش</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.key}
                                className="border-b border-border-glass-light hover:bg-glass-light transition-colors"
                            >
                                {/* عکس محصول */}
                                <td className="py-3 px-4">
                                    <ThumbStack thumbs={row.productThumbs} overflow={row.overflowCount} />
                                </td>

                                {/* رسید پرداخت */}
                                <td className="py-3 px-3 text-center">
                                    {row.source === 'internal' && row.receiptHref ? (
                                        <button
                                            onClick={() => onReceiptClick(row)}
                                            className="mx-auto inline-flex rounded-lg overflow-hidden border-2 border-white/40 hover:border-accent-primary hover:scale-105 transition-all"
                                        >
                                            {row.receiptIsPdf ? (
                                                <span className="flex items-center justify-center w-14 h-14 bg-glass-medium text-xs font-medium">PDF</span>
                                            ) : (
                                                <img
                                                    src={row.receiptHref}
                                                    alt="رسید"
                                                    className="w-14 h-14 object-cover"
                                                />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="text-text-muted text-xs">—</span>
                                    )}
                                </td>

                                {/* کد سفارش */}
                                <td className="py-3 px-4 text-center">
                                    <div className="font-mono text-sm">{row.displayId}</div>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] bg-white/10 text-text-secondary">
                                        {row.sourceBadge}
                                    </span>
                                </td>

                                {/* مشتری */}
                                <td className="py-3 px-4">
                                    <div className="font-medium">{row.customerName}</div>
                                    <div className="text-xs text-text-muted mt-1 line-clamp-2">{row.detailLine}</div>
                                </td>

                                {/* وضعیت */}
                                <td className="py-3 px-4 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs ${row.statusClassName}`}>
                                        {row.statusLabel}
                                    </span>
                                    {row.paymentAuditLine && (
                                        <div className="text-[11px] text-text-secondary mt-1.5">{row.paymentAuditLine}</div>
                                    )}
                                </td>

                                {/* روش ارسال */}
                                <td className="py-3 px-4 text-center text-sm text-text-primary">
                                    {row.shippingTitle}
                                </td>

                                {/* مهلت / تاریخ */}
                                <td className="py-3 px-4 text-center">
                                    <div className="text-sm">{row.estimateDateLabel}</div>
                                    {row.deadlineExtra && <div className="text-xs mt-1">{row.deadlineExtra}</div>}
                                </td>

                                {/* مدیریت سفارش - ستون جدید */}
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => onManagementClick(row)}
                                        className="w-full px-5 py-2.5 bg-gradient-to-r from-accent-primary to-purple-600 text-white text-sm font-medium rounded-2xl hover:shadow-lg hover:scale-105 transition-all active:scale-95"
                                    >
                                        مدیریت سفارش
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
}