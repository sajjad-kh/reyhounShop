import { api } from '../utils/api';

type ApiResponse<T> = {
    success: boolean;
    data: T;
    meta?: any;
};

export interface Review {
    id: number;
    rating: number;
    comment?: string;
    isApproved: boolean;
    createdAt: string;

    product: {
        id: number;
        name: string;
        images?: {
            id: number;
            url: string;
        }[];
    };
}

export const reviewService = {
    getMyReviews: async (): Promise<Review[]> => {
        const res = await api.get<ApiResponse<Review[]>>('/reviews/my');
        console.log("res:",res)
        return res.data;
    },

    
    createReview: async (
        productId: number,
        data: { orderId: number; rating: number; comment?: string }
    ) => {
        const res = await api.post(
            `/products/${productId}/reviews`,
            {
                orderId: Number(data.orderId),
                rating: Number(data.rating),
                comment: data.comment?.trim() ?? ''
            }
        );
        return res.data;
    }

};