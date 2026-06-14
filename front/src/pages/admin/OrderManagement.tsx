// OrderManagement.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Search, Package, RefreshCw, AlertCircle, Store } from 'lucide-react';
import { adminService } from '../../services/adminService';

import type { OrderSourceFilter, UnifiedAdminOrderRow } from './types';
import { fetchBasalamVendorParcels } from './basalamApi';
import {
    mapInternalToUnified,
    mapBasalamToUnified,
    rowMatchesSearch,
} from './orderUtils';

import PaymentReceiptReviewModal from './components/PaymentReceiptReviewModal';
import OrderTable from './components/OrderTable';
import OrderMobileList from './components/OrderMobileList';
import OrderActivityModal from './components/OrderActivityModal';  

const OrderManagement: React.FC = () => {
    // Order Receipt Modal States
    const [proofModalRow, setProofModalRow] = useState<UnifiedAdminOrderRow | null>(null);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewFormError, setReviewFormError] = useState<string | null>(null);

    // New Management Modal States
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const [selectedOrderForManagement, setSelectedOrderForManagement] = useState<UnifiedAdminOrderRow | null>(null);

    const [basalamToken, setBasalamToken] = useState(() => localStorage.getItem('basalam_token') || '');
    const [sourceFilter, setSourceFilter] = useState<OrderSourceFilter>('internal');
    const [internalRaw, setInternalRaw] = useState<any[]>([]);
    const [basalamOrders, setBasalamOrders] = useState<any[]>([]);
    const [loadingInternal, setLoadingInternal] = useState(false);
    const [loadingBasalam, setLoadingBasalam] = useState(false);
    const [errorInternal, setErrorInternal] = useState<string | null>(null);
    const [errorBasalam, setErrorBasalam] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [basalamStatusFilter, setBasalamStatusFilter] = useState<number[]>([]);

    const needsBasalam = sourceFilter === 'basalam' || sourceFilter === 'all';

    // ================== Load Functions ==================
    const loadInternalOrders = useCallback(async () => {
        setLoadingInternal(true);
        setErrorInternal(null);
        try {
            const resp = await adminService.getAllOrders({ limit: 100, page: 1 });
            setInternalRaw(resp.data ?? []);
            console.log ("resp",resp)

        } catch (e: any) {
            setErrorInternal(e.message || 'خطا در دریافت سفارش‌های داخلی');
            setInternalRaw([]);
        } finally {
            setLoadingInternal(false);
        }

    }, []);

    const loadBasalamOrders = useCallback(async () => {
        const t = basalamToken.trim() || localStorage.getItem('basalam_token') || '';
        if (!t) {
            setBasalamOrders([]);
            setErrorBasalam(null);
            return;
        }

        setLoadingBasalam(true);
        setErrorBasalam(null);
        try {
            const response = await fetchBasalamVendorParcels(t, basalamStatusFilter);
            setBasalamOrders(Array.isArray(response.data) ? response.data : []);
        } catch (err: any) {
            setErrorBasalam(err.message || 'خطا در دریافت سفارشات باسلام');
            setBasalamOrders([]);
        } finally {
            setLoadingBasalam(false);
        }
    }, [basalamToken, basalamStatusFilter]);

    // ================== Effects ==================
    useEffect(() => {
        if (sourceFilter === 'internal' || sourceFilter === 'all') {
            loadInternalOrders();
        }
    }, [sourceFilter, loadInternalOrders]);

    useEffect(() => {
        if (needsBasalam) {
            loadBasalamOrders();
        }
    }, [needsBasalam, loadBasalamOrders]);

    // ================== Unified Rows ==================
    const unifiedRows = useMemo(() => {
        const mapped: UnifiedAdminOrderRow[] = [];

        if (sourceFilter === 'internal' || sourceFilter === 'all') {
            internalRaw.forEach((o) => {
                const row = mapInternalToUnified(o);
                if (row) mapped.push(row);
            });
        }

        if ((sourceFilter === 'basalam' || sourceFilter === 'all') && basalamOrders.length) {
            basalamOrders.forEach((o) => {
                const row = mapBasalamToUnified(o);
                if (row) mapped.push(row);
            });
        }

        mapped.sort((a, b) => b.estimateSortTs - a.estimateSortTs);

        if (!searchQuery.trim()) return mapped;
        return mapped.filter((r) => rowMatchesSearch(r, searchQuery));
    }, [internalRaw, basalamOrders, sourceFilter, searchQuery]);

    const loading = loadingInternal || (needsBasalam && loadingBasalam);

    // ================== Handlers ==================
    const persistBasalamToken = () => {
        const trimmed = basalamToken.trim();
        if (!trimmed) {
            setErrorBasalam('توکن را وارد کنید');
            return;
        }
        localStorage.setItem('basalam_token', trimmed);
        loadBasalamOrders();
    };

    const clearBasalamToken = () => {
        localStorage.removeItem('basalam_token');
        setBasalamToken('');
        setBasalamOrders([]);
    };

    const refreshVisible = () => {
        if (sourceFilter === 'internal' || sourceFilter === 'all') loadInternalOrders();
        if (needsBasalam) loadBasalamOrders();
    };

    const openPaymentProofModal = (row: UnifiedAdminOrderRow) => {
        if (row.source !== 'internal') return;
        setReviewFormError(null);
        setProofModalRow(row);
    };

    const closePaymentProofModal = () => {
        if (reviewSubmitting) return;
        setProofModalRow(null);
        setReviewFormError(null);
    };

    // New Handler for Management Modal
    const handleManagementClick = (row: UnifiedAdminOrderRow) => {
        setSelectedOrderForManagement(row);
        setIsManagementModalOpen(true);
    };

    const closeManagementModal = () => {
        setIsManagementModalOpen(false);
        setSelectedOrderForManagement(null);
    };

    const handleApprovePayment = async () => {
        const id = proofModalRow?.internalOrderId;
        if (!id) return;

        setReviewSubmitting(true);
        setReviewFormError(null);
        try {
            await adminService.reviewOrderPayment(id, { decision: 'approve' });
            await loadInternalOrders();
            setProofModalRow(null);
        } catch (err: any) {
            setReviewFormError(err.message || 'خطا در تأیید پرداخت');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleRejectPayment = async (reason: string) => {
        const id = proofModalRow?.internalOrderId;
        if (!id) return;

        const trimmed = reason.trim();
        if (!trimmed) {
            setReviewFormError('برای رد رسید حتماً دلیل را بنویسید.');
            return;
        }

        setReviewSubmitting(true);
        setReviewFormError(null);
        try {
            await adminService.reviewOrderPayment(id, {
                decision: 'reject',
                rejectionReason: trimmed,
            });
            await loadInternalOrders();
            setProofModalRow(null);
        } catch (err: any) {
            setReviewFormError(err.message || 'خطا در رد رسید');
        } finally {
            setReviewSubmitting(false);
        }
    };


    const refreshSingleOrder = async (orderId: number) => {
        try {
            const response = await adminService.getOrderById(orderId);

            const updated = mapInternalToUnified(response.data);

            setSelectedOrderForManagement(updated);

            setInternalRaw((prev) =>
                prev.map((o) =>
                    o.id === orderId ? response.data : o
                )
            );

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-primary p-6" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">مدیریت سفارشات</h1>
                    <p className="text-text-secondary">سفارش‌های اپ، باسلام، یا هر دو</p>
                </div>

                {/* Filters & Search */}
                <GlassCard className="p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setSourceFilter('internal')} className={`flex-1 min-w-[92px] px-4 py-2 rounded-xl font-medium ${sourceFilter === 'internal' ? 'bg-gradient-accent text-white shadow-glass' : 'bg-glass-light text-text-primary hover:bg-glass-medium'}`}>داخلی (اپ)</button>
                                <button onClick={() => setSourceFilter('basalam')} className={`flex-1 min-w-[92px] px-4 py-2 rounded-xl font-medium ${sourceFilter === 'basalam' ? 'bg-gradient-accent text-white shadow-glass' : 'bg-glass-light text-text-primary hover:bg-glass-medium'}`}>باسلام</button>
                                <button onClick={() => setSourceFilter('all')} className={`flex-1 min-w-[92px] px-4 py-2 rounded-xl font-medium ${sourceFilter === 'all' ? 'bg-gradient-accent text-white shadow-glass' : 'bg-glass-light text-text-primary hover:bg-glass-medium'}`}>همه</button>
                            </div>

                            <button onClick={refreshVisible} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-accent text-white rounded-xl font-medium hover:shadow-glass disabled:opacity-50">
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                بروزرسانی
                            </button>
                        </div>

                        <div className="relative w-full">
                            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input
                                type="text"
                                placeholder="جستجو: کد سفارش، مشتری، آدرس، محصول..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pr-12 pl-4 py-2 rounded-xl bg-glass-light border border-border-glass-light text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            />
                        </div>

                        {needsBasalam && (
                            <GlassCard className="p-4 bg-glass-light/60 border-border-glass-light">
                                <div className="flex items-center gap-2 mb-2 text-sm text-text-secondary">
                                    <Store className="w-4 h-4" />
                                    <span>اتصال باسلام</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={basalamToken}
                                        onChange={(e) => setBasalamToken(e.target.value)}
                                        placeholder="Bearer توکن openapi باسلام"
                                        className="flex-1 px-4 py-2 rounded-xl bg-glass-medium border border-border-glass-light text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                    />
                                    <button onClick={persistBasalamToken} className="px-4 py-2 bg-gradient-accent text-white rounded-xl font-medium">ذخیره</button>
                                    <button onClick={clearBasalamToken} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-xl font-medium">حذف</button>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </GlassCard>

                {/* Errors */}
                {(errorInternal || errorBasalam) && (
                    <div className="flex flex-col gap-2 text-red-500 bg-red-500/10 px-4 py-3 rounded-xl">
                        {errorInternal && <div>داخلی: {errorInternal}</div>}
                        {errorBasalam && <div>باسلام: {errorBasalam}</div>}
                    </div>
                )}

                {/* Orders Display */}
                {loading && unifiedRows.length === 0 ? (
                    <GlassCard className="p-8 text-center">
                        <div className="glass-spinner w-12 h-12 mx-auto mb-4" />
                        <p className="text-text-secondary">در حال بارگذاری سفارشات...</p>
                    </GlassCard>
                ) : unifiedRows.length === 0 ? (
                    <GlassCard className="p-8 text-center">
                        <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
                        <p className="text-text-secondary">سفارشی یافت نشد</p>
                    </GlassCard>
                ) : (
                    <>
                        <OrderTable 
                            rows={unifiedRows} 
                            onReceiptClick={openPaymentProofModal}
                            onManagementClick={handleManagementClick}     // ← اتصال مدال جدید
                        />
                        <OrderMobileList rows={unifiedRows} onReceiptClick={openPaymentProofModal} />
                    </>
                )}
            </div>

            {/* Receipt Review Modal */}
            {proofModalRow && (
                <PaymentReceiptReviewModal
                    row={proofModalRow}
                    onClose={closePaymentProofModal}
                    submitting={reviewSubmitting}
                    formError={reviewFormError}
                    onApprove={handleApprovePayment}
                    onRejectSubmit={handleRejectPayment}
                />
            )}

            {/* New Order Management Modal */}
            <OrderActivityModal
                open={isManagementModalOpen}
                order={selectedOrderForManagement}
                activities={[]}                    // بعداً activities واقعی بفرست
                onClose={closeManagementModal}
                onDesignSubmitted={() => {
                    if (selectedOrderForManagement?.internalOrderId) {
                        refreshSingleOrder(
                            selectedOrderForManagement.internalOrderId
                        );
                    }
                }}

            />
        </div>
    );
};

export default OrderManagement;