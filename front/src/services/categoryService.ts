import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { Category } from '../types/product';

export class CategoryService {
    private static instance: CategoryService;

    private constructor() { }

    public static getInstance(): CategoryService {
        if (!CategoryService.instance) {
            CategoryService.instance = new CategoryService();
        }
        return CategoryService.instance;
    }

    /**
     * Get all categories
     */
    async getCategories(): Promise<Category[]> {
        try {
            const response = await api.get<Category[]>(API_ENDPOINTS.PRODUCTS.CATEGORIES);

            if (response.success && response.data) {
                return Array.isArray(response.data) ? response.data : [];
            }

            return [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    /**
     * Get a single category by ID
     */
    async getCategory(id: number): Promise<Category> {
        try {
            const response = await api.get<{ data: Category }>(`${API_ENDPOINTS.PRODUCTS.CATEGORIES}/${id}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching category ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new category
     */
    async createCategory(categoryData: { name: string }): Promise<Category> {
        try {
            const response = await api.post<Category>('/categories', categoryData);
            return response.data;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const categoryService = CategoryService.getInstance();
