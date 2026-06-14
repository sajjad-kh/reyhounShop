import React, { useRef, useState } from 'react';
import { Order } from '../../types/order';
import { getImageUrl } from '../../utils/constants';
import { orderService } from '../../services/orderService';
import Swal from 'sweetalert2';
import { toast } from 'react-hot-toast';
interface OrderCardProps {
    order: Order;
    onClick: () => void;
    onOrderUpdated?: (order: Order) => void;
}

const statusColors = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    PAYMENT_REJECTED: 'bg-red-500/20 text-red-300 border-red-500/40',
    CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PROCESSING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    SHIPPED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
    RETURNED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

/** API may return full URL (formatOrder) or relative /uploads/...; avoid double base. */
function paymentProofHref(url: string): string {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${path}`;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, onOrderUpdated }) => {
    const statusColor = statusColors[order.status] || statusColors.PENDING;
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canResubmit = Boolean(
        order.canResubmitPaymentProof ||
        order.paymentStatus === 'FAILED' ||
        order.status === 'PAYMENT_REJECTED'
    );

    const handleSelectFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isResubmitting) {
            fileInputRef.current?.click();
        }
    };

    const handleConfirmDelivery = async () => {

        const result = await Swal.fire({
            html: `
                <div class="text-center px-1">

                    <!-- ICON -->
                    <div class="mx-auto mb-5 flex items-center justify-center">
                        <span class="text-5xl sm:text-6xl leading-none">
                            📦
                        </span>
                    </div>

                    <!-- TITLE -->
                    <h2 class="text-xl sm:text-2xl font-semibold text-white">
                        تأیید تحویل سفارش
                    </h2>

                    <!-- SUBTITLE -->
                    <p class="mt-2 text-sm text-white/70 leading-7">
                        آیا از دریافت کامل سفارش اطمینان دارید؟
                    </p>

                    <!-- INFO BOX -->
                    <div class="mt-6 rounded-xl border border-white/10
                                bg-white/5 backdrop-blur-md px-3 py-3 rtl">
                        <p class="text-xs sm:text-sm text-white/70 leading-6 ">
                            با تأیید، وضعیت سفارش به
                            <span class="text-emerald-300 font-medium">تحویل شده</span>
                            تغییر می‌کند.
                        </p>
                    </div>

                </div>
            `,

            background: 'rgba(15, 23, 42, 0.75)',   // ⭐ dark glass واقعی
            backdrop: 'rgba(0, 0, 0, 0.55)',

            showCancelButton: true,
            confirmButtonText: 'تأیید تحویل',
            cancelButtonText: 'لغو',

            reverseButtons: true,
            buttonsStyling: false,

            width: '92%',

            customClass: {
                popup: `
                    rounded-3xl
                    border border-white/10
                    bg-white/5
                    backdrop-blur-2xl
                    shadow-[0_50px_160px_rgba(0,0,0,0.65)]
                    max-w-[420px]
                    px-5 py-6
                `,

                htmlContainer: `
                    px-1
                    !text-right
                    !dir-rtl
                `,

                confirmButton: `
                    w-full sm:w-auto
                    bg-emerald-500 hover:bg-emerald-600
                    text-white font-medium
                    px-6 py-3
                    rounded-xl
                    transition
                `,

                cancelButton: `
                    w-full sm:w-auto
                    bg-white/10 hover:bg-white/15
                    border border-white/10
                    text-white/80 hover:text-white
                    px-6 py-3
                    rounded-xl
                    transition
                `,

                actions: `
                    flex flex-col sm:flex-row gap-3 mt-6
                `
            }
        });


        if (!result.isConfirmed) return;

        try {
            const updatedOrder = await orderService.confirmDelivery(order.id);

            onOrderUpdated?.(updatedOrder);

            toast.success('تحویل سفارش با موفقیت ثبت شد');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsResubmitting(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsResubmitting(true);
            const updated = await orderService.resendPaymentProof(order.id, file);
            onOrderUpdated?.(updated);
            alert('رسید با موفقیت ارسال شد و در انتظار بررسی ادمین است.');
        } catch (error: any) {
            const message = error?.response?.data?.error?.message || error?.message || 'خطا در ارسال مجدد رسید';
            alert(message);
        } finally {
            setIsResubmitting(false);
            event.target.value = '';
        }
    };

    const handleDownloadPdf = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setIsDownloadingPdf(true);

            // ۱. ساخت یک المان مخفی برای پرینت فاکتور
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) return;

            // ۲. محاسبه مقادیر اقلام فاکتور
            const itemsHtml = (order.items ?? []).map((item: any) => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; text-align: right; color: #334155;">${item.product?.name || 'محصول سفارشی'}</td>
                    <td style="padding: 12px; text-align: center; color: #334155;">${Number(item.quantity || 1).toLocaleString('fa-IR')}</td>
                    <td style="padding: 12px; text-align: left; color: #334155;">${Number(item.price || 0).toLocaleString('fa-IR')} ریال</td>
                    <td style="padding: 12px; text-align: left; font-weight: bold; color: #1e293b;">${Number((item.price || 0) * (item.quantity || 1)).toLocaleString('fa-IR')} ریال</td>
                </tr>
            `).join('');

            const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('fa-IR', {
                year: 'numeric', month: 'long', day: 'numeric'
            }) : '—';

            // ۳. تزریق استایل و ساختار راست‌چین فاکتور تجاری
            doc.open();
            doc.write(`
                <html dir="rtl" lang="fa">
                <head>
                    <title>فاکتور سفارش ${order.trackingCode}</title>
                    <style>
                        @body { font-family: Tahoma, Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #1e293b; }
                        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: Tahoma, sans-serif; }
                        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        .title { font-size: 24px; font-weight: bold; color: #0f172a; }
                        .details { font-size: 13px; color: #475569; line-height: 24px; }
                        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        .items-table th { background: #f1f5f9; color: #475569; padding: 12px; text-align: right; font-size: 14px; border-bottom: 2px solid #cbd5e1; }
                        .summary-box { float: left; width: 300px; margin-top: 30px; border-top: 2px solid #cbd5e1; padding-top: 10px; }
                        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                        @media print {
                            body { padding: 0; }
                            .invoice-box { border: none; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="invoice-box">
                        <table class="header-table">
                            <tr>
                                <td class="title" style="text-align: right;">پیش‌فاکتور رسمی فروشگاه</td>
                                <td class="details" style="text-align: left;">
                                    <strong>شماره پیگیری:</strong> ${order.trackingCode}<br>
                                    <strong>تاریخ ثبت:</strong> ${formattedDate}<br>
                                    <strong>وضعیت سفارش:</strong> ${order.status}
                                </td>
                            </tr>
                        </table>

                        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; line-height: 22px;">
                            <strong>مشخصات خریدار:</strong><br>
                            نام مشتری: ${order.user?.name || 'مشتری گرامی'} | ایمیل/تلفن: ${order.user?.email || '—'}
                        </div>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="text-align: right;">شرح محصول</th>
                                    <th style="text-align: center; width: 80px;">تعداد</th>
                                    <th style="text-align: left; width: 120px;">قیمت واحد</th>
                                    <th style="text-align: left; width: 150px;">جمع کل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div class="summary-box">
                            <div class="summary-row">
                                <span>مبلغ کل اقلام:</span>
                                <span>${Number(order.totalPrice || 0).toLocaleString('fa-IR')} ریال</span>
                            </div>
                            <div class="summary-row" style="font-weight: bold; font-size: 16px; color: #0284c7; border-top: 1px dashed #cbd5e1; margin-top: 5px; padding-top: 10px;">
                                <span>مبلغ قابل پرداخت:</span>
                                <span>${Number(order.totalPrice || 0).toLocaleString('fa-IR')} ریال</span>
                            </div>
                        </div>
                        <div style="clear: both;"></div>
                        
                        <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                            از خرید شما سپاسگزاریم. این برگه به عنوان رسید دیجیتال سفارش شما صادر شده است.
                        </div>
                    </div>
                </body>
                </html>
            `);
            doc.close();

            // ۴. اجرای پرینتر/دانلود PDF و حذف المان اضافه
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                document.body.removeChild(iframe);
            }, 500);

        } catch (err) {
            console.error(err);
            toast.error('دانلود فاکتور با خطا مواجه شد.');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className='md:flex-row md:items-center justify-between gap-4 mb-4 flex flex-col glass-card p-6 cursor-pointer hover:bg-white/10 transition-all duration-300 hover:scale-[1.01]'>

            <div
                dir="rtl"
                onClick={onClick}
                className='text-right w-[90%]'
            >
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="text-right">
                        <div className='flex justify-between'>






                            <div className="text-right">
                                <div className="flex items-center gap-3 mb-2 flex-wrap justify-end">

                                    <h3 className="text-xl font-bold text-white">
                                        سفارش : {order.trackingCode}
                                    </h3>

                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                                        {order.status}
                                    </span>

                                </div>
                                <p className="text-white/60 text-sm">
                                    تاریخ ثب:{" "}
                                    {order.createdAt ? (
                                        new Date(order.createdAt).toLocaleDateString('fa-IR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })
                                    ) : (
                                        '—'
                                    )}
                                </p>
                                {order?.paymentProofUrl ? (
                                <span className="text-white-400">

                                    {/* Download Button */}
                                    <a
                                        href={paymentProofHref(order.paymentProofUrl)}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 underline text-sm"
                                    >
                                    رسید پرداخت
                                    </a>

                                </span>
                                ) : (
                                <span className="text-red-400">
                                    رسید پرداخت موجود نیست
                                </span>
                                )}
                                {order.paymentStatus === 'FAILED' && order.paymentRejectionReason && (
                                    <p className="text-amber-400/95 text-sm mt-2 text-right max-w-md ml-auto">
                                        <span className="font-semibold text-amber-300">دلیل رد رسید: </span>
                                        {order.paymentRejectionReason}
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* PRICE */}
                    <div className="flex items-center justify-between gap-2 text-right">
                        <span className="text-white/60 text-sm">مبلغ کل:</span>

                        <span className="text-2xl font-bold text-white">
                            {
                                Number(order.totalPrice ?? 0).toLocaleString('fa-IR', {
                                    maximumFractionDigits: 0
                                })
                            }  <span className="text-white/60 text-sm">ریال</span> 
                        </span>
                    </div>
                </div>

                {/* PAYMENT */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between flex-row-reverse">

                    <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">پرداخت:</span>

                        <span className={`text-sm font-medium ${
                            order.paymentStatus === 'SUCCESS' ||
                            order.paymentStatus === 'COMPLETED'
                                ? 'text-green-400'
                                : order.paymentStatus === 'FAILED'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                        }`}>
                            {order.paymentStatus}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-purple-400">
                        <span className="text-sm">مشاهده جزئیات</span>

                        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 5l7 7-7 7" />
                        </svg>
                    </div>

                </div>

                {/* ACTIONS */}
                <div className="mt-3 flex flex-wrap gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-white/90 hover:bg-white/10 disabled:opacity-60"
                    >
                        {isDownloadingPdf ? 'در حال دانلود...' : 'دانلود رسید سفارش'}
                    </button>

                    {order.status==="SHIPPED" && (
                        <>
                            <button
                                type="button"
                                onClick={handleConfirmDelivery}
                                disabled={isResubmitting}
                                className="
                                    px-4 py-2
                                    rounded-lg
                                    border border-amber-500/50
                                    text-amber-300
                                    text-sm font-medium
                                    transition-all duration-200
                                    hover:border-amber-400
                                    hover:text-amber-200
                                    hover:bg-amber-400/10
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                "
                            >
                                {isResubmitting ? 'در حال ثبت...' : 'تأیید تحویل'}
                            </button>
                        </>
                    )}

                    {canResubmit && (
                        <>
                            <button
                                type="button"
                                onClick={handleSelectFile}
                                disabled={isResubmitting}
                                className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                            >
                                {isResubmitting ? 'در حال ارسال...' : 'ارسال مجدد رسید'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isResubmitting}
                            />
                        </>
                    )}


                </div>
            </div>

            <div className="text-right w-full md:w-[12%] lg:w-[10%]">
                <div className="text-right gap-4 m-2 items-center justify-between">
                    {/* ITEMS */}
                    <div className="gap-3 overflow-x-auto pb-2 flex-row-reverse">

                        {(order.items ?? []).slice(0, 4).map((item) => (
                            <div
                                key={item.id}
                                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5"
                            >
                                <img
                                    src={getImageUrl(
                                        (item.product as { image?: string } | undefined)?.image ||
                                            item.product?.images?.[0]?.url ||
                                            '/placeholder.png',
                                    )}
                                    alt={item.product?.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}

                        {(order.items?.length ?? 0) > 4 && (
                            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                                <span className="text-white/60 text-sm font-medium">
                                    +{order.items.length - 4}
                                </span>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};