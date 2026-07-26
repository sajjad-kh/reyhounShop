import { api } from '../utils/api';

export interface Discount {
    id: number;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    minPurchase: number | null;
    maxUses: number | null;
    usedCount: number;
    applicableTo: string;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface DiscountValidation {
    valid: boolean;
    discount?: Discount;
    discountAmount?: number;
    cartTotal?: number;
    finalTotal?: number;
    error?: string;
}

export interface CreateDiscountRequest {
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    minPurchase?: number | null;
    maxUses?: number | null;
    applicableTo?: string;
    expiresAt?: string | null;
}

export interface BulkGrantRequest {
    points: number;
    reason: string;
}

export interface BulkGrantResponse {
    granted: number;
    points: number;
}

interface ApiResult<T> {
    success: boolean;
    data?: T;
    message?: string;
}

class DiscountService {
    private unwrap<T>(res: ApiResult<T>): T {
        if (res.success && res.data !== undefined) {
            return res.data;
        }
        throw new Error(res.message || 'خطا در عملیات تخفیف');
    }

    // ----- ADMIN -----
    async createDiscount(req: CreateDiscountRequest): Promise<Discount> {
        const res = await api.post<Discount>('/discounts', req);
        return res;
    }

    async getDiscounts(): Promise<Discount[]> {
        const res = await api.get<{ discounts: Discount[]; pagination: unknown }>('/discounts');
        // `api.get` returns the full response body: { discounts, pagination, data, meta, _meta }
        // `res.discounts` is the actual array; `res.data` is a separate (indexed) object — do NOT use it.
        if (res && Array.isArray((res as any).discounts)) {
            return (res as any).discounts;
        }
        const body = res?.data as any;
        if (body && Array.isArray(body.discounts)) {
            return body.discounts;
        }
        return [];
    }

    async deleteDiscount(id: number): Promise<void> {
        await api.delete(`/discounts/${id}`);
    }

    async reactivateDiscount(id: number): Promise<Discount> {
        const res = await api.post<{ discount: Discount }>(`/discounts/${id}/reactivate`);
        return res.discount;
    }

    async bulkGrantPoints(req: BulkGrantRequest): Promise<BulkGrantResponse> {
        const res = await api.post<BulkGrantResponse>('/loyalty/admin/bulk-grant', req);
        return this.unwrap(res);
    }

    // ----- USER (checkout) -----
    async validateDiscount(code: string): Promise<DiscountValidation> {
        const res = await api.post<DiscountValidation & { success: boolean }>('/cart/validate-discount', {
            discountCode: code,
        });
        if (!res || !(res as any).valid) {
            throw new Error((res as any)?.error || 'کد تخفیف نامعتبر است');
        }
        return res;
    }
}

export const discountService = new DiscountService();
export default discountService;
