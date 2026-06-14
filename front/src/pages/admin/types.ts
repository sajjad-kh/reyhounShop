// types.ts

export type OrderSourceFilter = 'internal' | 'basalam' | 'all';

export interface BasalamOrder {
    id: number;
    order: {
        id: number;
        customer: {
            user: { name: string };
            recipient: {
                name: string;
                mobile: string;
                postal_address: string;
                postal_code: string;
            };
        };
    };
    status: { id: number; title: string };
    items: Array<{
        id: number;
        product: {
            id: number;
            name: string;
            photos: Array<{ resized: { xs: string; sm: string } }>;
        };
        quantity: number;
        price: number;
    }>;
    shipping_method: { current: { id: number; title: string } };
    estimate_send_at: string;
    created_at: string;
}

export interface InternalAdminOrder {
    id: number;
    trackingCode?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    paymentProofUrl?: string | null;
    paymentRejectionReason?: string | null;
    createdAt?: string;
    user?: { name?: string | null; email?: string | null };
    address?: {
        fullName?: string | null;
        line?: string;
        city?: string;
        province?: string;
        postalCode?: string | null;
    } | null;
    shippingMethod?: { id?: number; name?: string | null } | null;
    items?: Array<{
        quantity: number;
        product?: { name?: string | null; images?: Array<{ url: string }> } | null;
    }>;
    designFiles?: {
        id?: string;
        url: string;
        createdAt?: string;
        uploadedBy?: string;
    }[];
}

export interface UnifiedAdminOrderRow {
    shippingMethod?: {
        id: number;
        name: string;
    };

    key: string;
    source: 'internal' | 'basalam';
    sourceBadge: string;
    internalOrderId?: number;
    receiptHref?: string;
    receiptIsPdf?: boolean;
    paymentStatus?: string | null;
    paymentRejectionReason?: string | null;
    productThumbs: Array<{ src: string; alt: string; quantity: number }>;
    overflowCount: number;
    displayId: string;
    customerName: string;
    trackingCode: string | null;
    detailLine: string;

    status: string;
    statusLabel: string;
    statusClassName: string;
    shippingTitle: string;
    estimateDateLabel: string;
    deadlineExtra?: React.ReactNode;
    estimateSortTs: number;
    paymentAuditLine?: string;

    designFiles?: Array<{
        id: number;
        url: string;
        originalName: string;
        mimeType: string;
    }>;

    messages?: Array<{
        id: number;
        message: string;
        type?: string;
        isAdmin?: boolean;
        createdAt: string | Date;
        user?: {
            id: number;
            name?: string;
            email?: string;
            role?: string;
        };
    }>;

    // ✅ ADD THIS (IMPORTANT)
    timeline?: Array<{
        type: "MESSAGE" | "DESIGN" | "STATUS" | string;
        data?: {
            id?: number;
            message?: string;
            note?: string;
            isAdmin?: boolean;
            createdAt?: string | Date;
            user?: {
                id: number;
                name?: string;
                email?: string;
                role?: string;
            };
        };
    }>;

}

export const STATUS_MAP: { [key: number]: { title: string; color: string } } = {
    3739: { title: 'جدید', color: 'bg-blue-500/20 text-blue-500' },
    3237: { title: 'در حال آماده‌سازی', color: 'bg-yellow-500/20 text-yellow-500' },
    3238: { title: 'ارسال شده', color: 'bg-purple-500/20 text-purple-500' },
    5017: { title: 'اطلاعات ارسال نادرست', color: 'bg-red-500/20 text-red-500' },
    3572: { title: 'نرسیده', color: 'bg-orange-500/20 text-orange-500' },
    3740: { title: 'ثبت مشکل شده', color: 'bg-red-500/20 text-red-500' },
    4633: { title: 'درخواست لغو مشتری', color: 'bg-red-500/20 text-red-500' },
    5075: { title: 'درخواست توافق تاخیر', color: 'bg-orange-500/20 text-orange-500' },
    3195: { title: 'رضایت مشتری', color: 'bg-green-500/20 text-green-500' },
    3233: { title: 'عودت وجه کامل', color: 'bg-red-500/20 text-red-500' },
    3067: { title: 'لغو', color: 'bg-gray-500/20 text-gray-500' },
    6440: { title: 'درخواست لغو غرفه‌دار', color: 'bg-red-500/20 text-red-500' },
};

export const INTERNAL_STATUS_META: Record<string, { title: string; color: string }> = {
    PENDING: { title: 'در انتظار', color: 'bg-yellow-500/20 text-yellow-500' },
    PAYMENT_REJECTED: { title: 'رد رسید پرداخت', color: 'bg-red-500/20 text-red-400' },
    PROCESSING: { title: 'در حال پردازش', color: 'bg-purple-500/20 text-purple-500' },
    SHIPPED: { title: 'ارسال شده', color: 'bg-indigo-500/20 text-indigo-500' },
    DELIVERED: { title: 'تحویل شده', color: 'bg-green-500/20 text-green-500' },
    CANCELLED: { title: 'لغو شده', color: 'bg-gray-500/20 text-gray-500' },
    DELAYED: { title: 'تأخیر', color: 'bg-orange-500/20 text-orange-500' },
};

export interface OrderWithTimeline extends InternalAdminOrder {
    timeline: TimelineItem[];
}

export interface TimelineItem {
    type: 'MESSAGE' | 'STATUS' | 'ACTIVITY' | 'DESIGN';

    createdAt?: string | Date;

    data?: {
        id?: number;

        // MESSAGE
        message?: string;
        isAdmin?: boolean;

        // STATUS
        note?: string;
        fromStatus?: string;
        toStatus?: string;

        // DESIGN
        fileUrl?: string;
        version?: number;
        status?: string;
        isFinal?: boolean;

        // ACTIVITY
        action?: string;
        entity?: string;
        entityId?: number;

        // COMMON
        user?: {
            id: number;
            name?: string;
            email?: string;
            role?: string;
        };

        designer?: {
            id: number;
            name?: string;
            email?: string;
        };
    };
}