// API related types
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    pagination?: PaginationInfo;
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        requestId: string;
    };
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface SearchParams {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price' | 'rating' | 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}