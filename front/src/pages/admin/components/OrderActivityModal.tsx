// components/OrderActivityModal.tsx
import { apiClient } from '../../../utils/api';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from '../../../utils/toast';

import { AnimatePresence, motion } from "framer-motion";
import SendActionsPanel from "./SendActionsPanel";
import DesignActionsPanel from "./DesignActionsPanel";

import {
    X,
    Info,
    Image as ImageIcon,
    ChevronDown, History,
    Download,
    Package,
    CreditCard
} from 'lucide-react';

import OrderTimeline from "../components/OrderTimeline";

import type { UnifiedAdminOrderRow } from '../types';
import { getImageUrl } from '../../../utils/constants';

type Props = {
    open: boolean;
    order: UnifiedAdminOrderRow | null;
    activities: any[];
    onClose: () => void;
    onDesignSubmitted?: () => void;
};

export default function OrderActivityModal({
    open,
    order,
    activities,
    onClose,
    onDesignSubmitted
}: Props) {

    const [adminComment, setAdminComment] = useState('');
    const [selectedDesignFile, setSelectedDesignFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    const handleDesignSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedDesignFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        setUploadProgress(0);
    };

    const removeSelectedFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedDesignFile(null);
        setPreviewUrl(null);
        setUploadProgress(0);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmitDesign = async () => {
        if (!order || isUploading) return;
        try {
            setIsUploading(true);
            setUploadProgress(0);
            const formData = new FormData();
            if (selectedDesignFile) formData.append('file', selectedDesignFile);
            formData.append('message', adminComment || 'طرح ارسال شد');

            await apiClient.post(
                `/admin/orders/${order.internalOrderId}/design`,
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        const total = progressEvent.total || 1;
                        setUploadProgress(Math.round((progressEvent.loaded * 100) / total));
                    },
                }
            );
            removeSelectedFile();
            setAdminComment('');
            onDesignSubmitted?.();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmitShipment = async (trackingCode: string) => {
        if (!order?.internalOrderId) return;
        try {
            await apiClient.post(`/admin/orders/${order.internalOrderId}/ship`, { trackingCode });
            toast.success('سفارش با موفقیت ارسال شد');
            setOpenSection(null);
            onDesignSubmitted?.();
        } catch (err) {
            console.error(err);
            toast.error('خطا در ارسال سفارش');
        }
    };

    type Section = "orderInfo" | "timeline" | "designActions" | "sendActions" | null;
    const [openSection, setOpenSection] = useState<Section>("orderInfo");
    const toggleSection = (section: Exclude<Section, null>) => {
        setOpenSection(prev => (prev === section ? null : section));
    };

    if (!open || !order) return null;

    return (
        <>
            {/* ==================== MODAL ==================== */}
            <div
                className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4"
                onClick={onClose}
            >
                <div
                    className="relative w-full sm:max-w-7xl h-[100dvh] sm:h-[94vh] sm:rounded-3xl rounded-t-3xl overflow-hidden border-t border-white/10 sm:border sm:border-white/10 bg-[#0A0F1C] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ==================== HEADER ==================== */}
                    <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0A0F1C]/95 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center justify-between gap-2">
                            {/* LEFT: Title + Order ID */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-purple-500/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-primary/10">
                                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-accent-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                                        مدیریت سفارش
                                    </h2>
                                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                                        <span className="text-[11px] sm:text-xs text-white/50 truncate">
                                            {order.displayId}
                                        </span>
                                        <span className="w-px h-3 bg-white/10 flex-shrink-0" />
                                        <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${order.statusClassName}`}>
                                            {order.statusLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Payment + Close */}
                            <div className="flex items-center gap-2 sm:gap-5 flex-shrink-0">
                                {/* Payment */}
                                <div className="hidden xs:block text-left">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <CreditCard className="w-3.5 h-3.5 text-white/25" />
                                        <span className="text-[9px] sm:text-[10px] text-white/25 uppercase tracking-wider font-medium">پرداخت</span>
                                    </div>
                                    <p className={`text-xs sm:text-sm font-semibold ${order.paymentAuditLine?.includes('تایید') || order.paymentAuditLine?.includes('موفق') ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {order.paymentAuditLine || 'بررسی نشده'}
                                    </p>
                                </div>

                                {/* Close */}
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-200"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ==================== BODY ==================== */}
                    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden [overscroll-behavior:contain]">

                        {/* ==================== LEFT: ACTIVITY LOG ==================== */}
                        <div className="p-3 sm:p-5 lg:p-6 lg:flex-1 space-y-2.5 sm:space-y-3 lg:overflow-hidden pb-4 lg:pb-0">

                            {/* ORDER INFO */}
                            <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                                <button
                                    onClick={() => toggleSection("orderInfo")}
                                    className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 text-white hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
                                            <Info className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        <span className="text-[11px] sm:text-xs font-semibold text-white/70">اطلاعات سفارش</span>
                                    </div>
                                    <motion.div animate={{ rotate: openSection === "orderInfo" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown className="w-4 h-4 text-white/30" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {openSection === "orderInfo" && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-white/[0.05] px-4 sm:px-5 py-3 sm:py-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] sm:text-[11px] text-white/25 uppercase tracking-wider font-medium">مشتری</p>
                                                        <p className="text-[11px] sm:text-xs font-medium text-white/70">{order.customerName}</p>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] sm:text-[11px] text-white/25 uppercase tracking-wider font-medium">جزئیات</p>
                                                        <p className="text-[11px] sm:text-xs text-white/45 leading-relaxed">{order.detailLine}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* TIMELINE */}
                            <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                                <button
                                    onClick={() => toggleSection("timeline")}
                                    className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 text-white hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                                            <History className="w-4 h-4 text-violet-400" />
                                        </div>
                                        <span className="text-[11px] sm:text-xs font-semibold text-white/70">تاریخچه فعالیت</span>
                                        {order.timeline && order.timeline.length > 0 && (
                                            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-violet-500/12 text-violet-300/80 border border-violet-400/15">
                                                {order.timeline.length}
                                            </span>
                                        )}
                                    </div>
                                    <motion.div animate={{ rotate: openSection === "timeline" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown className="w-4 h-4 text-white/30" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {openSection === "timeline" && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-white/[0.05] pb-3 sm:pb-4 max-h-[50vh] sm:max-h-none lg:max-h-[calc(94vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                <OrderTimeline order={order} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>

                        {/* ==================== RIGHT PANEL ==================== */}
                        <div className="w-full lg:w-[30rem] border-t lg:border-t-0 border-white/[0.06] bg-white/[0.015] flex flex-col min-h-0 max-h-[50vh] sm:max-h-none lg:overflow-y-auto overflow-y-auto overflow-x-hidden pb-4 lg:pb-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent [overscroll-behavior:contain]">

                            {/* USER FILES */}
                            <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 mb-2 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/[0.05] flex items-center gap-2 sm:gap-2.5">
                                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-[11px] sm:text-[12px] font-semibold text-white/60">فایل‌های ارسالی کاربر</span>
                                    {order.designFiles && order.designFiles.length > 0 && (
                                        <span className="mr-auto px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-blue-500/12 text-blue-300/80 border border-blue-400/15">
                                            {order.designFiles.length}
                                        </span>
                                    )}
                                </div>

                                {order.designFiles && order.designFiles.length > 0 ? (
                                    <div className="flex gap-2 sm:gap-2.5 overflow-x-auto p-2.5 sm:p-3 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        {order.designFiles.map((file, index) => {
                                            const url = getImageUrl(file.url);
                                            const handleDownload = () => {
                                                try {
                                                    const rawPath = file.url.replace(/^\/?uploads\//, '');
                                                    window.open(`${apiClient.defaults.baseURL}/admin/orders/download?file=${encodeURIComponent(rawPath)}`, '_blank');
                                                } catch (err) { console.error("Download failed", err); }
                                            };

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex-shrink-0 w-20 sm:w-24 rounded-xl overflow-hidden border border-white/[0.06] bg-black/20 hover:border-accent-primary/30 transition-all duration-200 group relative"
                                                >
                                                    <div onClick={handleDownload} className="cursor-pointer">
                                                        <img src={url} className="h-14 sm:h-16 w-full object-cover pointer-events-none group-hover:scale-[1.03] transition-transform duration-300" />
                                                        <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[8px] sm:text-[9px] text-white/35 truncate bg-black/30">
                                                            {file.originalName || `فایل ${index + 1}`}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                                                        className="absolute top-1 left-1 p-1 rounded-lg bg-black/50 text-white/50 hover:text-white hover:bg-accent-primary/70 transition-all opacity-0 group-hover:opacity-100"
                                                        title="دانلود"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-3 sm:px-4 py-4 sm:py-6 text-center">
                                        <p className="text-white/20 text-[11px] sm:text-xs">کاربر فایلی ارسال نکرده است</p>
                                    </div>
                                )}
                            </div>

                            {/* ADMIN Design ACTIONS */}
                            <div className="mx-4 sm:mx-6">
                                <DesignActionsPanel
                                    isOpen={openSection === "designActions"}
                                    toggle={() => toggleSection("designActions")}
                                    fileInputRef={fileInputRef}
                                    selectedDesignFile={selectedDesignFile}
                                    previewUrl={previewUrl}
                                    adminComment={adminComment}
                                    setAdminComment={setAdminComment}
                                    isUploading={isUploading}
                                    uploadProgress={uploadProgress}
                                    onFileSelect={handleDesignSelect}
                                    onRemoveFile={removeSelectedFile}
                                    onSubmit={handleSubmitDesign}
                                    onOpenLightbox={() => setLightboxOpen(true)}
                                />
                            </div>

                            {/* ADMIN SEND ACTIONS */}
                            <div className="mx-4 sm:mx-6 my-2">
                                <SendActionsPanel
                                    open={true}
                                    isOpen={openSection === "sendActions"}
                                    onToggle={() => toggleSection("sendActions")}
                                    order={order}
                                    onSubmitShipment={handleSubmitShipment}
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX */}
            {lightboxOpen && previewUrl && (
                <div
                    className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img src={previewUrl} alt="full-preview" className="max-w-full max-h-full rounded-xl sm:rounded-3xl object-contain shadow-2xl" />
                </div>
            )}
        </>
    );
}
