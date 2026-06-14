// orderUtils.tsx
import { getImageUrl } from '../../utils/constants';
import type { BasalamOrder, InternalAdminOrder, UnifiedAdminOrderRow } from './types';
import { STATUS_MAP, INTERNAL_STATUS_META } from './types';  

// ... بقیه توابع
export function normalizeInternalThumb(url?: string): string | null {
    const u = getImageUrl(url || '');
    return u && u !== '/placeholder.png' ? u : null;
}

export function calculateDaysRemaining(estimateSendAt: string): number {
    const sendDate = new Date(estimateSendAt);
    const today = new Date();
    const diffTime = sendDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function mapBasalamToUnified(order: BasalamOrder): UnifiedAdminOrderRow | null {
    if (!order) return null;

    const items = order.items || [];
    const productThumbs = items.slice(0, 3).map((item) => ({
        src: item?.product?.photos?.[0]?.resized?.sm || '',
        alt: item?.product?.name || '',
        quantity: item?.quantity ?? 0,
    }));

    const statusInfo =
        (order.status?.id && STATUS_MAP[order.status.id]) || {
            title: order.status?.title || 'نامشخص',
            color: 'bg-gray-500/20 text-gray-500',
        };

    let deadlineExtra: React.ReactNode | undefined;

    if (order.status.id !== 3238 && order.status.id !== 3195) {
        const daysRemaining = calculateDaysRemaining(order.estimate_send_at);

        deadlineExtra = (
            <span
                className={`font-bold ${
                    daysRemaining < 0
                        ? 'text-red-500'
                        : daysRemaining <= 2
                        ? 'text-orange-500'
                        : 'text-green-500'
                }`}
            >
                {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} روز تاخیر`
                    : `${daysRemaining} روز مانده`}
            </span>
        );
    }

    return {
        key: `basalam-${order.id}`,
        source: 'basalam',
        sourceBadge: 'باسلام',
        productThumbs,
        overflowCount: items.length > 3 ? items.length - 3 : 0,
        displayId: String(order.id),
        customerName:
            order.order?.customer?.user?.name ||
            order.order?.customer?.recipient?.name ||
            'نامشخص',
        detailLine: order.order?.customer?.recipient?.postal_address || 'آدرس نامشخص',
        statusLabel: statusInfo.title,
        statusClassName: statusInfo.color,
        shippingTitle: order.shipping_method?.current?.title || 'نامشخص',
        estimateDateLabel: new Date(order.estimate_send_at).toLocaleDateString('fa-IR'),
        deadlineExtra,
        estimateSortTs: new Date(order.created_at || order.estimate_send_at).getTime(),
    };
}


export function buildInternalPaymentAuditLine(o: InternalAdminOrder): string {
    const ps = (o.paymentStatus || '').toUpperCase();
    const hasProof = !!(o.paymentProofUrl && String(o.paymentProofUrl).trim());

    if (ps === 'SUCCESS') return 'پرداخت: تأیید شده';
    if (ps === 'FAILED' && (o.paymentRejectionReason || '').trim()) {
        return 'پرداخت: رسید رد شده (مشتری دلیل را می‌بیند)';
    }
    if (ps === 'FAILED') return 'پرداخت: تأیید نشده';
    if (hasProof && ps === 'PENDING') return 'پرداخت: رسید آپلود شد — منتظر تأیید ادمین';
    if (!hasProof) return 'پرداخت: هنوز رسیدی نیست';
    return `پرداخت: ${o.paymentStatus || '—'}`;
}

export function mapInternalToUnified(order: InternalAdminOrder): UnifiedAdminOrderRow | null {
    if (!order) return null;

    const meta = INTERNAL_STATUS_META[order.status || ''] || {
        title: order.status || 'نامشخص',
        color: 'bg-gray-500/20 text-gray-500',
    };

    const items = order.items || [];
    const productThumbs = items.slice(0, 3).map((it) => ({
        src: normalizeInternalThumb(it?.product?.images?.[0]?.url) || '',
        alt: it?.product?.name || '',
        quantity: it.quantity,
    }));

    const addressLine = order.address?.line?.trim()
        ? [order.address.line, order.address.city, order.address.province].filter(Boolean).join(' · ')
        : [order.address?.city, order.address?.province].filter(Boolean).join(' · ') || 'بدون آدرس';

    const customer =
        order.address?.fullName?.trim() ||
        order.user?.name?.trim() ||
        order.user?.email?.trim() ||
        'نامشخص';

    const ts = order.createdAt ? new Date(order.createdAt).getTime() : 0;

    const rawProof = order.paymentProofUrl;
    const receiptHref = rawProof
        ? /^https?:\/\//i.test(rawProof)
            ? rawProof
            : getImageUrl(rawProof)
        : undefined;

    const receiptIsPdf = !!rawProof && rawProof.toLowerCase().endsWith('.pdf');

    return {
        key: `internal-${order.id}`,
        source: 'internal',
        sourceBadge: 'اپ',
        internalOrderId: order.id,
        receiptHref,
        receiptIsPdf,
        paymentStatus: order.paymentStatus,
        paymentRejectionReason: order.paymentRejectionReason,
        productThumbs,
        overflowCount: items.length > 3 ? items.length - 3 : 0,
        displayId: order.trackingCode || `#${order.id}`,
        customerName: customer,
        detailLine: addressLine,
        statusLabel: meta.title,
        statusClassName: meta.color,
        shippingTitle: order.shippingMethod?.name?.trim() || 'نامشخص',
        estimateDateLabel: order.createdAt
            ? new Date(order.createdAt).toLocaleDateString('fa-IR')
            : '—',
        deadlineExtra: undefined,
        estimateSortTs: ts,
        paymentAuditLine: buildInternalPaymentAuditLine(order),

        designFiles: order.designFiles || [],

        messages:
            order.messages?.map((m: any) => ({
                id: m.id,
                message: m.message,
                type: m.type,
                isAdmin: m.isAdmin,
                createdAt: m.createdAt,
                user: m.user
                    ? {
                          id: m.user.id,
                          name: m.user.name,
                          email: m.user.email,
                          role: m.user.role,
                      }
                    : undefined,
            })) || [],

        // ✅ FIX: timeline added here
        timeline:
            order.timeline?.map((t: any) => {
                switch (t.type) {
                    case 'MESSAGE':
                        return {
                            type: t.type,
                            data: {
                                id: t.data?.id,
                                message: t.data?.message,
                                isAdmin: t.data?.isAdmin,
                                user: t.data?.user
                                    ? {
                                        id: t.data.user.id,
                                        name: t.data.user.name,
                                        email: t.data.user.email,
                                    }
                                    : undefined,
                                createdAt: t.data?.createdAt,
                            },
                        };

                    case 'DESIGN':
                        return {
                            type: t.type,
                            data: {
                                id: t.data?.id,
                                version: t.data?.version,
                                fileUrl: t.data?.fileUrl,
                                status: t.data?.status,
                                isFinal: t.data?.isFinal,
                                designer: t.data?.designer
                                    ? {
                                        id: t.data.designer.id,
                                        name: t.data.designer.name,
                                        email: t.data.designer.email,
                                    }
                                    : undefined,
                            },
                        };

                    case 'STATUS':
                        return {
                            type: t.type,
                            data: {
                                id: t.data?.id,
                                toStatus: t.data?.toStatus,
                                note: t.data?.note,
                                changedBy: t.data?.changedBy
                                    ? {
                                        id: t.data.changedBy.id,
                                        name: t.data.changedBy.name,
                                        email: t.data.changedBy.email,
                                    }
                                    : undefined,
                            },
                        };

                    default:
                        return t;
                }
            }) || [],

        status:order.status,

        trackingCode:order.trackingCode,

    };
}

export function rowMatchesSearch(row: UnifiedAdminOrderRow, q: string): boolean {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    if (row.displayId.toLowerCase().includes(s)) return true;
    if (row.customerName.toLowerCase().includes(s)) return true;
    if (row.detailLine.toLowerCase().includes(s)) return true;
    if (row.shippingTitle.toLowerCase().includes(s)) return true;
    if ((row.paymentAuditLine || '').toLowerCase().includes(s)) return true;
    return row.productThumbs.some((t) => t.alt.toLowerCase().includes(s));
}