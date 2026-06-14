// Product related types
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    effectivePrice: number;
    stock: number;
    category: Category;
    images: ProductImage[];
    shippingMethods?: Array<{ id: number; name: string; baseCost: number; basalamId?: number | null }>;
    basalamProductId?: number | null; // If exists → Basalam product, if null → Internal product
    averageRating: number;
    reviewCount: number;
    reviews?: ProductReview[];
    slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: number;
    children?: Category[];
}

export interface ProductImage {
    id: number;
    url: string;
    isMain: boolean;
    productId: number;
}

export interface ProductReview {
    id: number;
    userId: number;
    userName: string;
    userAvatar?: string;
    rating: number;
    title: string;
    comment: string;
    createdAt: string;
    helpful: number;
    verified: boolean;
}

export interface ProductFilters {
    categories?: number[];
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    onSale?: boolean;
}

export interface ProductSort {
    field: 'price' | 'rating' | 'name' | 'createdAt' | 'popularity';
    order: 'asc' | 'desc';
}

// Helper function to determine product type
export const getProductType = (product: Product): 'basalam' | 'internal' => {
    return product.basalamProductId !== null && product.basalamProductId !== undefined
        ? 'basalam'
        : 'internal';
};