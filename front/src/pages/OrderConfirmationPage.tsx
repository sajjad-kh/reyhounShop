import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { Order } from '../types/order';
import { GlassButton } from '../components/ui/GlassButton';
import { OrderTracker } from '../components/order/OrderTracker';
import { getImageUrl } from '../utils/constants';
import { getTimelineMeta } from "../utils/getTimelineMeta";
import { Upload, CheckCircle, X } from "lucide-react";

import { reviewService } from '../services/reviewService';

import ReviewModal from '../components/modals/ReviewModal';
import Swal from 'sweetalert2';


export const OrderConfirmationPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [reviewError, setReviewError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return navigate('/');
            try {
                const data = await orderService.getOrderById(Number(orderId));
                setOrder(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, navigate]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const openApproveModal = () => setShowApproveModal(true);


    const confirmApproveDesign = async () => {
        if (!order) return;

        setSending(true);
        setShowApproveModal(false);

        try {

            await orderService.approveDesign(order.id);

            const freshOrder = await orderService.getOrderById(order.id);

            setOrder(freshOrder);

            alert('طرح با موفقیت تأیید شد ✅');

        } catch (err) {
            console.error(err);
            alert('خطا در تأیید طرح');
        } finally {
            setSending(false);
        }
    };


    const handleSendRevision = async () => {
        if (!feedback.trim() || !order) return;

        setSending(true);

        const formData = new FormData();
        formData.append('message', feedback.trim());

        if (selectedImage) {
            formData.append('referenceImage', selectedImage);
        }

        try {
            const revision = await orderService.sendDesignRevisionRequest(
                Number(orderId),
                formData
            );

            // ✅ 1. optimistic timeline insert
            const newTimelineItem = {
                type: "MESSAGE",
                createdAt: new Date().toISOString(),
                data: {
                    id: revision.id,
                    message: revision.message,
                    isAdmin: revision.isAdmin,
                    type: revision.type
                }
            };

            setOrder(prev => {
                if (!prev) return prev;

                return {
                    ...prev,
                    timeline: [
                        ...(prev.timeline || []),
                        newTimelineItem
                    ]
                };
            });

            // ❗ 2. sync backend (silent)
            const freshOrder = await orderService.getOrderById(Number(orderId));

            setOrder(freshOrder);

            // reset UI
            setFeedback('');
            setSelectedImage(null);
            setPreviewUrl(null);

        } catch (err) {
            console.error('REVISION_ERROR:', err);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black/60">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!order) return null;

    const productTotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const LOCKED_STATUSES = [
    'DESIGN_APPROVED',
    'PRINTING',
    'SHIPPED',
    'DELIVERED'
    ];

    const canReview = !LOCKED_STATUSES.includes(order.status);
    const lastDesign = order.timeline?.find(item => item.type === "DESIGN");

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-black/95 to-black text-white px-4 py-6 md:py-8">
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8" dir="rtl">

                {/* HEADER */}
                <div className="text-center p-5 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                    <h1 className="text-xl md:text-2xl font-bold">بررسی و تأیید سفارش</h1>
                    <p className="text-white/60 mt-1 text-sm md:text-base">
                        کد پیگیری: <span className="font-mono">{order.trackingCode}</span>
                    </p>
                </div>

                {/* TRACKER */}
                <OrderTracker
                    status={order.status}
                    paymentStatus={order.paymentStatus}
                    paymentRejectionReason={order.paymentRejectionReason}
                />

                {/* PAYMENT SUMMARY */}
                <div className="rounded-2xl p-5 bg-white/5 border border-white/10 space-y-2">
                    <h2 className="font-bold mb-3 text-lg">خلاصه پرداخت</h2>
                    <Row label="جمع محصولات" value={productTotal} />
                    <Row label="هزینه ارسال" value={order.shippingCost} />
                    <Row label="مبلغ نهایی" value={order.totalPrice} bold />
                </div>

                {/* PRODUCTS */}
                <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                    <h2 className="font-bold mb-4 text-lg">محصولات سفارش</h2>
                    <div className="space-y-3">
                        {order.items.map((item: any) => (
                            <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-black/20 border border-white/10">
                                <img
                                    src={getImageUrl(item.product?.images?.[0] || '/placeholder.png')}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />



                                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm md:text-base">
                                            {item.product?.name}
                                        </p>

                                        <p className="text-white/50 text-xs md:text-sm line-clamp-1">
                                            {item.product?.description}
                                        </p>

                                        <p className="text-white/60 text-xs mt-1 flex items-center justify-start">
                                            تعداد: {item.quantity.toLocaleString('fa-IR')} عدد

                                            {order.status?.toUpperCase() === 'DELIVERED' && (
                                                order.reviewedProductIds?.includes(item.product.id) ? (
                                                    <span className="mx-1 px-2 py-2 text-xs text-emerald-400">
                                                        ✓ نظر ثبت شد
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProductId(item.product.id);
                                                            setReviewError(null);
                                                            setReviewModalOpen(true);
                                                        }}
                                                        className="
                                                            flex-shrink-0
                                                            inline-flex items-center gap-2
                                                            rounded-xl
                                                            mx-1 px-2 py-2
                                                            text-xs font-medium
                                                            text-amber-300
                                                            transition-all
                                                            hover:bg-amber-500/20
                                                            hover:border-amber-400/40
                                                            hover:scale-[1.02]
                                                        "
                                                    >
                                                        ⭐ شرکت در نظرسنجی
                                                    </button>
                                                )
                                            )}

                                        
                                        </p>
                                    </div>

                                </div>









                                <div className="font-bold text-sm md:text-base whitespace-nowrap">
                                    {(item.price * item.quantity).toLocaleString('fa-IR')} ریال
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="relative mt-8">
                    <div className="absolute left-1/2 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-purple-500 to-transparent z-0 hidden md:block" />
                    <div className="space-y-8 md:space-y-10 relative z-10">
                        {order.timeline?.length ? (
                            order.timeline
                                .filter(item => {
                                    // ❌ STATUS های DESIGN_REVIEW رو کلاً حذف کن
                                    if (item.type === "STATUS" && item.data?.toStatus === "DESIGN_REVIEW") {
                                        return false;
                                    }
                                    return true;
                                })
                                .map((item: any, index: number) => {
                                    const meta = getTimelineMeta(item);
                                    const Icon = meta.icon;

                                    const isAdmin =
                                        item.type === "DESIGN" ||
                                        item.data?.isAdmin === true;

                                    const isLeft = isAdmin;
                                    const isRight = !isAdmin;

                                    const date = item.data?.createdAt
                                        ? new Date(item.data.createdAt)
                                        : null;

                                    const formattedDate = date && !isNaN(date.getTime())
                                        ? date.toLocaleString("fa-IR", {
                                            year: "2-digit",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })
                                        : "—";

                                    return (
                                        <div key={index} className="relative flex flex-col md:flex-row md:items-center group">

                                            {/* MOBILE NODE */}
                                            <div className="md:hidden flex justify-center mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center ring-4 ring-zinc-900">
                                                    <span className="text-white font-bold text-lg">{index + 1}</span>
                                                </div>
                                            </div>

                                            {/* LEFT */}
                                            <div className="w-full md:w-1/2 md:pr-8 lg:pr-16 flex justify-center md:justify-end">
                                                {isLeft && (
                                                    <div className="w-full max-w-md rounded-2xl p-5 border bg-white/5 backdrop-blur-xl shadow-xl">

                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className={`flex items-center gap-2 text-sm ${meta.color}`}>
                                                                <Icon className="w-4 h-4" />
                                                                {meta.label}
                                                            </span>

                                                            <span className="text-xs text-white/40">
                                                                {formattedDate}
                                                            </span>
                                                        </div>

                                                        {/* 🎨 DESIGN ENHANCED */}
                                                        {item.type === "DESIGN" && item.data?.fileUrl && (
                                                            <>
                                                                <img
                                                                    src={item.data.fileUrl}
                                                                    className="w-full rounded-xl border border-purple-400/30"
                                                                    alt="design"
                                                                />

                                                                <div className="mt-3 text-xs text-white/60 space-y-1">
                                                                    <p>Version: {item.data?.version}</p>
                                                                    <p>Status: {item.data?.status}</p>
                                                                    {item.data?.isFinal && (
                                                                        <p className="text-green-400">Final Design</p>
                                                                    )}
                                                                    {item.data?.designer?.email && (
                                                                        <p>Designer: {item.data.designer.email}</p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* MESSAGE */}
                                                        {item.type !== "DESIGN" && (
                                                            <div className="space-y-3">
                                                                <p className="text-sm text-white/80 leading-6">
                                                                    {item.data?.message || item.data?.note || "—"}
                                                                </p>

                                                                {item.data?.attachments?.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {item.data.attachments.map((file: any) => (
                                                                            <img
                                                                                key={file.id}
                                                                                src={getImageUrl(file.url)}
                                                                                alt="attachment"
                                                                                className="rounded-xl border border-white/10 object-cover"
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* CENTER NODE */}
                                            <div className="hidden md:flex w-14 flex-col items-center z-20">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-[0_0_25px_-3px] shadow-purple-500 ring-4 ring-zinc-950 group-hover:scale-110 transition-all">
                                                    <span className="text-white font-bold text-xl drop-shadow-md">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* RIGHT */}
                                            <div className="w-full md:w-1/2 md:pl-8 lg:pl-16 flex justify-center md:justify-start">
                                                {isRight && (
                                                    <div className="w-full max-w-md rounded-2xl p-5 border bg-white/5 backdrop-blur-xl shadow-xl">

                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className={`flex items-center gap-2 text-sm ${meta.color}`}>
                                                                <Icon className="w-4 h-4" />
                                                                {meta.label}
                                                            </span>

                                                            <span className="text-xs text-white/40">
                                                                {formattedDate}
                                                            </span>
                                                        </div>

                                                        {/* 🎨 DESIGN ENHANCED */}
                                                        {item.type === "DESIGN" && item.data?.fileUrl && (
                                                            <>
                                                                <img
                                                                    src={item.data.fileUrl}
                                                                    className="w-full rounded-xl border border-purple-400/30"
                                                                    alt="design"
                                                                />

                                                                <div className="mt-3 text-xs text-white/60 space-y-1">
                                                                    <p>Version: {item.data?.version}</p>
                                                                    <p>Status: {item.data?.status}</p>
                                                                    {item.data?.isFinal && (
                                                                        <p className="text-green-400">Final Design</p>
                                                                    )}
                                                                    {item.data?.designer?.email && (
                                                                        <p>Designer: {item.data.designer.email}</p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* MESSAGE */}
                                                        {item.type !== "DESIGN" && (
                                                            <div className="space-y-3">
                                                                <p className="text-sm text-white/80 leading-6">
                                                                    {item.data?.message || item.data?.note || "—"}
                                                                </p>

                                                                {item.data?.attachments?.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {item.data.attachments.map((file: any) => (
                                                                            <img
                                                                                key={file.id}
                                                                                src={getImageUrl(file.url)}
                                                                                alt="attachment"
                                                                                className="rounded-xl border border-white/10 object-cover"
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })
                        ) : (
                            <p className="text-center text-white/40 py-12 text-sm">
                                هیچ فعالیتی ثبت نشده است
                            </p>
                        )}
                    </div>
                </div>

                {/* DESIGN REVIEW SECTION */}
                {canReview && (
                    <div className="rounded-2xl p-5 md:p-6 bg-white/5 border border-white/10 backdrop-blur-xl">
                        <h3 className="font-bold text-lg mb-2">نظر شما درباره طرح چیست؟</h3>
                        <p className="text-white/60 text-sm mb-5">در صورت رضایت تأیید کنید، در غیر این صورت درخواست تغییر بدهید</p>

                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="نظر، پیشنهاد یا درخواست تغییرات خود را بنویسید..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 min-h-[130px] focus:outline-none focus:border-purple-500 resize-y"
                        />

                        <div className="mt-6">
                            <label className="block text-white/70 text-sm mb-2">عکس مرجع (اختیاری)</label>
                            <label className="cursor-pointer block">
                                <div className="border-2 border-dashed border-white/30 hover:border-purple-500 rounded-2xl p-8 text-center transition-all">
                                    <Upload className="w-9 h-9 mx-auto mb-3 text-white/50" />
                                    <p className="text-sm">کلیک کنید تا عکس آپلود شود</p>
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            </label>
                        </div>

                        {previewUrl && (
                            <div className="mt-4 relative inline-block">
                                <img src={previewUrl} alt="preview" className="max-h-56 rounded-xl border border-white/20" />
                                <button onClick={() => { setPreviewUrl(null); setSelectedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">✕</button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                            <button
                                onClick={openApproveModal}
                                disabled={sending}
                                className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                <CheckCircle className="w-5 h-5" />
                                تأیید طرح (بدون تغییر)
                            </button>

                            <button
                                onClick={handleSendRevision}
                                disabled={!feedback.trim() || sending}
                                className="py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-medium disabled:opacity-50"
                            >
                                {sending ? "در حال ارسال..." : "ارسال درخواست تغییر"}
                            </button>
                        </div>
                    </div>
                )}

                {/* APPROVE MODAL */}
                {showApproveModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <CheckCircle className="text-emerald-500" />
                                    تأیید نهایی طرح
                                </h2>
                                <button onClick={() => setShowApproveModal(false)} className="text-white/60 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <p className="text-center text-white/80 leading-relaxed">
                                    آیا از تأیید نهایی این طرح اطمینان دارید؟<br />
                                    بعد از تأیید، مرحله چاپ آغاز خواهد شد.
                                </p>

                                {lastDesign?.data?.fileUrl && (
                                    <div className="rounded-2xl overflow-hidden border border-white/10">
                                        <img src={lastDesign.data.fileUrl} alt="طرح" className="w-full h-56 object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 p-6 border-t border-white/10">
                                <button onClick={() => setShowApproveModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition">انصراف</button>
                                <button onClick={confirmApproveDesign} disabled={sending} className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 font-medium transition disabled:opacity-70">
                                    {sending ? 'در حال پردازش...' : 'بله، تأیید می‌کنم'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NAVIGATION */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <GlassButton className="flex-1" onClick={() => navigate('/dashboard/orders')}>
                        سفارشات من
                    </GlassButton>
                    <GlassButton variant="secondary" className="flex-1" onClick={() => navigate('/')}>
                        ادامه خرید
                    </GlassButton>
                </div>
                <ReviewModal
                    isOpen={reviewModalOpen}
                    onClose={() => setReviewModalOpen(false)}
                    loading={reviewLoading}
                    error={reviewError}
                    onSubmit={async (data) => {
                        try {
                            setReviewLoading(true);
                            setReviewError(null);

                            const currentOrderId = Number(orderId ?? order.id);
                            if (!currentOrderId || Number.isNaN(currentOrderId)) {
                                setReviewError('شناسه سفارش یافت نشد');
                                return;
                            }

                            await reviewService.createReview(selectedProductId!, {
                                orderId: currentOrderId,
                                rating: data.rating,
                                comment: data.comment
                            });

                            setOrder(prev => prev ? {
                                ...prev,
                                reviewedProductIds: [
                                    ...(prev.reviewedProductIds ?? []),
                                    selectedProductId!
                                ]
                            } : prev);

                            setReviewModalOpen(false);

                            Swal.fire({
                                icon: 'success',
                                title: 'ثبت شد',
                                text: data.comment?.trim()
                                    ? 'نظر شما ثبت شد و پس از تایید نمایش داده می‌شود'
                                    : 'امتیاز شما ثبت شد',
                                confirmButtonText: 'باشه'
                            });

                        } catch (err: any) {
                            const apiError = err?.response?.data?.error;
                            const code = apiError?.code;
                            const details = apiError?.details as Array<{ field: string; message: string }> | undefined;

                            if (code === 'DUPLICATE_REVIEW') {
                                setReviewError('شما قبلاً برای این سفارش نظر ثبت کرده‌اید');
                                return;
                            }
                            if (code === 'ORDER_ID_REQUIRED') {
                                setReviewError('شناسه سفارش یافت نشد');
                                return;
                            }
                            if (code === 'COMMENT_REQUIRED') {
                                setReviewError('برای امتیاز ۱ تا ۳ ستاره وارد کردن نظر الزامی است');
                                return;
                            }
                            if (code === 'PRODUCT_NOT_PURCHASED') {
                                setReviewError('فقط برای محصولات خریداری شده می‌توانید نظر ثبت کنید');
                                return;
                            }
                            if (code === 'VALIDATION_ERROR') {
                                const commentError = details?.find(d => d.field === 'comment');
                                const orderError = details?.find(d => d.field === 'orderId');
                                if (commentError) {
                                    setReviewError('برای امتیاز ۱ تا ۳ ستاره وارد کردن نظر الزامی است');
                                    return;
                                }
                                if (orderError) {
                                    setReviewError('شناسه سفارش یافت نشد');
                                    return;
                                }
                            }

                            setReviewError('خطا در ثبت نظر');

                        } finally {
                            setReviewLoading(false);
                        }
                    }}
                />
            </div>
        </div>
    );
};

const Row = ({ label, value, bold }: any) => (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold border-t border-white/10 pt-2' : 'text-white/70'}`}>
        <span>{label}</span>
        <span>{value.toLocaleString('fa-IR')} ریال</span>
    </div>
);