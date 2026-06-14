// components/OrderActivityModal.tsx
import { apiClient } from '../../../utils/api';
import React, { useEffect, useRef, useState } from 'react';




import { AnimatePresence, motion } from "framer-motion";
import SendActionsPanel from "./SendActionsPanel";
import DesignActionsPanel from "./DesignActionsPanel";

import {
    X,
    Clock,Info,
    Image as ImageIcon,
    UploadCloud,
    Expand,ChevronDown, History
} from 'lucide-react';

import OrderTimeline from "../components/OrderTimeline";

import type { UnifiedAdminOrderRow } from '../types';
import { getImageUrl } from '../../../utils/constants';
type ActivityItem = {
    id: string;
    type: string;
    title: string;
    description?: string;
    createdAt: string;
    actor?: string;
    images?: string[];
};

type Props = {
    open: boolean;
    order: UnifiedAdminOrderRow | null;
    activities: ActivityItem[];
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

    // ==================== ADMIN DESIGN ====================
    const [selectedDesignFile, setSelectedDesignFile] =
        useState<File | null>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [uploadProgress, setUploadProgress] = useState(0);

    const [isUploading, setIsUploading] = useState(false);

    // ==================== LIGHTBOX ====================
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // cleanup memory leak
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        console.log("ORDER CHANGEDD:", order);
        console.log("MESSAGES:", order?.timeline);
    }, [order]);


    const handleDesignSelect = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setSelectedDesignFile(file);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        const localPreview = URL.createObjectURL(file);

        setPreviewUrl(localPreview);

        setUploadProgress(0);
    };

    const removeSelectedFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedDesignFile(null);

        setPreviewUrl(null);

        setUploadProgress(0);

        setIsUploading(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmitDesign = async () => {
        if (!order || isUploading) return;
        try {
            setIsUploading(true);
            setUploadProgress(0);

            const formData = new FormData();

            if (selectedDesignFile) {
                formData.append('file', selectedDesignFile);
            }

            formData.append(
                'message',
                adminComment || 'طرح ارسال شد'
            );

            const response = await apiClient.post(
                `/admin/orders/${order.internalOrderId}/design`,
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        const total = progressEvent.total || 1;

                        const percent = Math.round(
                            (progressEvent.loaded * 100) / total
                        );

                        setUploadProgress(percent);
                    },
                }
            );
            // reset states
            removeSelectedFile();

            setAdminComment('');

            onDesignSubmitted?.();

        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };



    type Section = "orderInfo" | "timeline" | "designActions" | "sendActions" | null;

    const [openSection, setOpenSection] = useState<Section>("orderInfo");

    const toggleSection = (section: Exclude<Section, null>) => {
        setOpenSection(prev => (prev === section ? null : section));
    };

    const handleSubmitShipment = async (
    trackingCode: string
    ) => {
    if (!order?.internalOrderId) return;

    try {
        await apiClient.post(
        `/admin/orders/${order.internalOrderId}/ship`,
        {
            trackingCode
        }
        );

        onDesignSubmitted?.(); // refresh list

    } catch (err) {
        console.error(err);
    }
    };


    // ==================== ENTERPRISE DOWNLOAD (MINIMAL) ====================
    if (!open || !order) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <div
                    className="relative w-full max-w-7xl h-[94vh] rounded-3xl overflow-hidden border border-white/10 bg-[#0A0F1C] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ==================== HEADER ==================== */}
                    <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0F1C]/95 backdrop-blur-xl px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    مدیریت سفارش
                                </h2>

                                <div className="flex items-center gap-4 mt-2">
                                    <span className="font-mono text-lg text-white">
                                        {order.displayId}
                                    </span>

                                    <span
                                        className={`px-4 py-1 rounded-full text-sm ${order.statusClassName}`}
                                    >
                                        {order.statusLabel}
                                    </span>
                                </div>
                            </div>
                            {/* Payment Status */}
                            <div className="mb-6">
                                <p className="text-white/60 text-sm">وضعیت پرداخت</p>
                                <p className="text-green-400 font-medium mt-1">
                                    {order.paymentAuditLine || 'در انتظار بررسی'}
                                </p>
                            </div>



                            <button
                                onClick={onClose}
                                className="text-3xl text-white/70 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    {/* ==================== BODY ==================== */}
                    <div className="flex flex-col lg:flex-row h-[calc(94vh-85px)] min-h-0">
                        {/* ==================== ACTIVITY LOG ==================== */}

                            <div className="flex-1 p-6 lg:p-8 space-y-4 overflow-hidden">

                                {/* ================= ORDER INFO ================= */}
                                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">

                                    <button
                                        onClick={() => toggleSection("orderInfo")}
                                        className="w-full flex items-center justify-between p-5 text-white hover:bg-white/5 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Info className="w-5 h-5 text-cyan-400" />

                                            <h3 className="text-lg font-semibold">
                                                اطلاعات سفارش
                                            </h3>
                                        </div>

                                        <motion.div
                                            animate={{
                                                rotate: openSection === "orderInfo" ? 180 : 0,
                                            }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <ChevronDown className="w-5 h-5 text-white/70" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {openSection === "orderInfo" && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    ease: "easeInOut",
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-white/10 p-5">

                                                    <div>
                                                        <p className="text-sm text-white/60">
                                                            مشتری
                                                        </p>

                                                        <p className="mt-1 font-medium text-white">
                                                            {order.customerName}
                                                        </p>

                                                        <p className="mt-2 text-xs text-white/70">
                                                            {order.detailLine}
                                                        </p>
                                                    </div>

                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                {/* ================= TIMELINE ================= */}
                                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">

                                    <button
                                        onClick={() => toggleSection("timeline")}
                                        className="w-full flex items-center justify-between p-5 text-white hover:bg-white/5 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <History className="w-5 h-5 text-violet-400" />

                                            <h3 className="text-lg font-semibold">
                                                تاریخچه فعالیت
                                            </h3>
                                        </div>

                                        <motion.div
                                            animate={{
                                                rotate: openSection === "timeline" ? 180 : 0,
                                            }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <ChevronDown className="w-5 h-5 text-white/70" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {openSection === "timeline" && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    ease: "easeInOut",
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <div className="border-t border-white/10 pt-0 pb-5 max-h-[400px] overflow-y-auto">
                                                    <OrderTimeline order={order} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>

                        {/* ==================== RIGHT PANEL ==================== */}
                        <div className="w-full lg:w-[31rem] border-t lg:border-t-0 border-white/10 bg-white/[0.03] flex flex-col min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-h-[96%]">

                            {/* ==================== USER FILES ==================== */}
                            <div className="mx-8 mt-3 mb-2 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur overflow-hidden">

                                <div className="p-3 border-b border-white/10 flex items-center gap-2 text-white/60 text-sm">
                                    <ImageIcon className="w-4 h-4" />
                                    فایل‌های ارسالی کاربر
                                </div>

                                {order.designFiles && order.designFiles.length > 0 ? (

                                    <div className="flex gap-3 overflow-x-auto px-3 py-3 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                                        {order.designFiles.map((file, index) => {
                                            const url = getImageUrl(file.url);

                                            const handleDownload = async () => {
                                                try {
                                                    const res = await fetch(url);
                                                    const blob = await res.blob();

                                                    const a = document.createElement("a");
                                                    const blobUrl = URL.createObjectURL(blob);

                                                    a.href = blobUrl;
                                                    a.download =
                                                        `${order.displayId}_${String(index + 1).padStart(2, "0")}.${file.originalName.split(".").pop() || "png"}`;

                                                    document.body.appendChild(a);
                                                    a.click();
                                                    a.remove();

                                                    URL.revokeObjectURL(blobUrl);
                                                } catch (err) {
                                                    console.error("Download failed", err);
                                                }
                                            };

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={handleDownload}
                                                    className="
                                                        flex-shrink-0 w-28
                                                        cursor-pointer
                                                        rounded-xl
                                                        overflow-hidden
                                                        border border-white/10
                                                        bg-black/20
                                                        hover:border-accent-primary/60
                                                        transition-all
                                                        group
                                                    "
                                                >
                                                    <img
                                                        src={url}
                                                        className="h-20 w-full object-cover pointer-events-none group-hover:scale-[1.03] transition-transform"
                                                    />

                                                    <div className="px-2 py-1 text-[10px] text-white/50 truncate bg-black/40">
                                                        {file.originalName}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                ) : (
                                    <div className="px-3 py-3 text-white/40 text-sm">
                                        کاربر فایلی ارسال نکرده است.
                                    </div>
                                )}
                            </div>

                            {/* ==================== ADMIN Design ACTIONS ==================== */}
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

                            {/* ==================== ADMIN SEND ACTIONS ==================== */}

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

            {/* ==================== LIGHTBOX ==================== */}
            {lightboxOpen && previewUrl && (
                <div
                    className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <img
                        src={previewUrl}
                        alt="full-preview"
                        className="max-w-full max-h-full rounded-3xl object-contain shadow-2xl"
                    />
                </div>
            )}
        </>
    );
}