import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { Product, Category, ProductFilters, ProductSort, ProductReview } from '../types/product';

export interface ProductListResponse {
    products: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ProductSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: number;
    filters?: ProductFilters;
    sort?: ProductSort;
}

export class ProductService {
    private static instance: ProductService;

    private constructor() { }

    public static getInstance(): ProductService {
        if (!ProductService.instance) {
            ProductService.instance = new ProductService();
        }
        return ProductService.instance;
    }

    /**
     * Get products list with filters and pagination
     */
    async getProducts(params: ProductSearchParams = {}): Promise<ProductListResponse> {
        try {
            const queryParams = new URLSearchParams();

            // Add pagination
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.limit) queryParams.append('limit', params.limit.toString());

            // Add search
            if (params.search) queryParams.append('search', params.search);

            // Add category
            if (params.category) queryParams.append('category', params.category.toString());

            // Add filters
            if (params.filters) {
                if (params.filters.categories?.length) {
                    params.filters.categories.forEach(cat =>
                        queryParams.append('categories[]', cat.toString())
                    );
                }
                if (params.filters.minPrice) queryParams.append('minPrice', params.filters.minPrice.toString());
                if (params.filters.maxPrice) queryParams.append('maxPrice', params.filters.maxPrice.toString());
                if (params.filters.minRating) queryParams.append('minRating', params.filters.minRating.toString());
                if (params.filters.inStock !== undefined) queryParams.append('inStock', params.filters.inStock.toString());
                if (params.filters.onSale !== undefined) queryParams.append('onSale', params.filters.onSale.toString());
            }

            // Add sorting
            if (params.sort) {
                queryParams.append('sortBy', params.sort.field);
                queryParams.append('sortOrder', params.sort.order);
            }

            const url = `${API_ENDPOINTS.PRODUCTS.LIST}?${queryParams.toString()}`;
            const response = await api.get<ProductListResponse>(url);

            if (response.success && response.data) {
                const result = response.data;
                return {
                    ...result,
                    products: (result.products || []).map(product => ({
                        ...product,
                        averageRating: product.averageRating ?? 0,
                        reviewCount: product.reviewCount ?? 0,
                    })),
                };
            }

            // Return empty result instead of throwing
            return {
                products: [],
                pagination: {
                    page: params.page || 1,
                    limit: params.limit || 20,
                    total: 0,
                    totalPages: 0
                }
            };
        } catch (error) {
            console.error('Failed to fetch products:', error);
            // Return empty result instead of throwing to prevent page crash
            return {
                products: [],
                pagination: {
                    page: params.page || 1,
                    limit: params.limit || 20,
                    total: 0,
                    totalPages: 0
                }
            };
        }
    }

    /**
     * Get product by ID
     */
    async getProduct(id: number): Promise<Product> {
        try {
            const response = await api.get<Product>(API_ENDPOINTS.PRODUCTS.DETAIL(id));

            if (response.success && response.data) {
                // Ensure images array exists
                const product = response.data;
                if (!product.images) {
                    product.images = [];
                }
                return product;
            }

            throw new Error('Product not found');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Search products with advanced options
     */
    async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
        try {
            const queryParams = new URLSearchParams({
                q: query,
                limit: limit.toString()
            });

            const url = `${API_ENDPOINTS.PRODUCTS.SEARCH}?${queryParams.toString()}`;
            const response = await api.get<Product[]>(url);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    }

    /**
     * Get search suggestions
     */
    async getSearchSuggestions(query: string, limit: number = 8): Promise<{
        products: Product[];
        suggestions: string[];
    }> {
        try {
            const queryParams = new URLSearchParams({
                q: query,
                limit: limit.toString(),
                suggestions: 'true'
            });

            const url = `${API_ENDPOINTS.PRODUCTS.SEARCH}?${queryParams.toString()}`;
            const response = await api.get<{
                products: Product[];
                suggestions: string[];
            }>(url);

            if (response.success && response.data) {
                return response.data;
            }

            return { products: [], suggestions: [] };
        } catch (error) {
            console.error('Search suggestions failed:', error);
            return { products: [], suggestions: [] };
        }
    }

    /**
     * Get popular search terms
     */
    async getPopularSearches(limit: number = 10): Promise<string[]> {
        try {
            const queryParams = new URLSearchParams({
                limit: limit.toString()
            });

            const url = `${API_ENDPOINTS.PRODUCTS.POPULAR_SEARCHES}?${queryParams.toString()}`;
            const response = await api.get<string[]>(url);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch popular searches:', error);
            return [];
        }
    }

    /**
     * Get product categories
     */
    async getCategories(): Promise<Category[]> {
        try {
            const response = await api.get<Category[]>(API_ENDPOINTS.PRODUCTS.CATEGORIES);

            if (response.success && response.data) {
                return response.data;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            return [];
        }
    }

    /**
     * Get product reviews
     */
    async getProductReviews(productId: number, page: number = 1, limit: number = 10): Promise<{
        reviews: ProductReview[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            const url = `${API_ENDPOINTS.PRODUCTS.REVIEWS(productId)}?${queryParams.toString()}`;
            const response = await api.get<{
                reviews: ProductReview[];
                pagination: {
                    page: number;
                    limit: number;
                    total: number;
                    totalPages: number;
                };
            }>(url);

            if (response.success && response.data) {
                return response.data;
            }

            return {
                reviews: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
            };
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            return {
                reviews: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
            };
        }
    }

    /**
     * Handle service errors
     */
    private handleError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'Product service error');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}

// Export singleton instance
export const productService = ProductService.getInstance();