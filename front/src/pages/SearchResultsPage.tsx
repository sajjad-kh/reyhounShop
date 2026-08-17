import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import { GlassButton } from '../components/ui/GlassButton';
import { ProductCard } from '../components/ui/ProductCard';
import { FilterSidebar } from '../components/ui/FilterSidebar';
import { GlassPagination } from '../components/ui/GlassPagination';
import { SearchBar } from '../components/ui/SearchBar';
import { productService } from '../services/productService';
import { toast } from '../utils/toast';
import { Product, Category, ProductFilters, ProductSort } from '../types/product';
import { UI_CONSTANTS } from '../utils/constants';


const SORT_OPTIONS = [
    { value: 'relevance-desc', label: 'Most Relevant', field: 'popularity' as const, order: 'desc' as const },
    { value: 'price-asc', label: 'Price: Low to High', field: 'price' as const, order: 'asc' as const },
    { value: 'price-desc', label: 'Price: High to Low', field: 'price' as const, order: 'desc' as const },
    { value: 'rating-desc', label: 'Highest Rated', field: 'rating' as const, order: 'desc' as const },
    { value: 'name-asc', label: 'Name: A to Z', field: 'name' as const, order: 'asc' as const },
    { value: 'createdAt-desc', label: 'Newest First', field: 'createdAt' as const, order: 'desc' as const },
];

import { useCart } from '../context/CartContext';
import { useCart as useBasalamCart } from '../hooks/basalam/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { BasalamProduct } from '../types/basalam';

// Fixed: Prevent undefined length errors on filters.categories
export const SearchResultsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Helper to safely get categories length - prevents undefined errors
    const getCategoriesLength = (cats: number[] | undefined): number => {
        if (!cats || !Array.isArray(cats)) return 0;
        return cats.length;
    };

    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [filters, setFilters] = useState<ProductFilters>(() => {
        const categoryParams = searchParams.getAll('category').map(c => parseInt(c)).filter(c => !isNaN(c));
        return {
            categories: categoryParams.length > 0 ? categoryParams : undefined,
            minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
            maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
            minRating: searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!) : undefined,
            inStock: searchParams.get('inStock') === 'true' ? true : undefined,
            onSale: searchParams.get('onSale') === 'true' ? true : undefined,
        };
    });
    const [sort, setSort] = useState<ProductSort>(() => {
        const sortParam = searchParams.get('sort') || 'relevance-desc';
        const sortOption = SORT_OPTIONS.find(option => option.value === sortParam) || SORT_OPTIONS[0];
        return { field: sortOption.field, order: sortOption.order };
    });

    // Update URL params when filters change
    const updateUrlParams = useCallback((newFilters: ProductFilters, newSort: ProductSort, newSearch: string, page: number = 1) => {
        const params = new URLSearchParams();

        if (newSearch) params.set('search', newSearch);

        // Handle multiple categories
        if (newFilters.categories?.length) {
            newFilters.categories.forEach(cat => params.append('category', cat.toString()));
        }

        if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
        if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
        if (newFilters.minRating) params.set('minRating', newFilters.minRating.toString());
        if (newFilters.inStock) params.set('inStock', 'true');
        if (newFilters.onSale) params.set('onSale', 'true');
        if (page > 1) params.set('page', page.toString());

        const sortValue = `${newSort.field}-${newSort.order}`;
        if (sortValue !== 'relevance-desc') params.set('sort', sortValue);

        setSearchParams(params);
    }, [setSearchParams]);

    // Fetch products
    const fetchProducts = useCallback(async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const response = await productService.getProducts({
                page,
                limit: UI_CONSTANTS.ITEMS_PER_PAGE,
                search: searchQuery || undefined,
                filters,
                sort,
            });

            setProducts(response.products);
            setCurrentPage(response.pagination.page);
            setTotalPages(response.pagination.totalPages);
            setTotalProducts(response.pagination.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load search results');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters, sort]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const categoriesData = await productService.getCategories();
            setCategories(categoriesData);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }, []);

    // Initialize data
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Fetch products when dependencies change
    useEffect(() => {
        const page = parseInt(searchParams.get('page') || '1');
        setCurrentPage(page);
        fetchProducts(page);
    }, [fetchProducts, searchParams]);

    // Handle search
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        updateUrlParams(filters, sort, query, 1);
    };

    // Handle filter changes
    const handleFiltersChange = (newFilters: ProductFilters) => {
        setFilters(newFilters);
        updateUrlParams(newFilters, sort, searchQuery, 1);
    };

    // Handle sort change
    const handleSortChange = (sortValue: string) => {
        const sortOption = SORT_OPTIONS.find(option => option.value === sortValue) || SORT_OPTIONS[0];
        const newSort = { field: sortOption.field, order: sortOption.order };
        setSort(newSort);
        updateUrlParams(filters, newSort, searchQuery, 1);
    };

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        updateUrlParams(filters, sort, searchQuery, page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Clear all filters
    const handleClearFilters = () => {
        const emptyFilters: ProductFilters = {
            categories: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            minRating: undefined,
            inStock: undefined,
            onSale: undefined,
        };
        setFilters(emptyFilters);
        updateUrlParams(emptyFilters, sort, searchQuery, 1);
    };

    // Handle add to cart
    const { addToCart } = useCart();
    const { addItem: addBasalamItem } = useBasalamCart();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const handleAddToCart = async (product: Product) => {
        try {
            // Check if product is from Basalam
            if (product.basalamProductId !== null && product.basalamProductId !== undefined) {
                // Convert to BasalamProduct and add to Basalam cart
                const imageUrl = product.images?.[0]?.url || '';
                const basalamProduct: BasalamProduct = {
                    id: product.basalamProductId,
                    title: product.name,
                    price: product.effectivePrice,
                    stock: product.stock,
                    image: imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${imageUrl}`,
                    seller: {
                        id: 0,
                        name: 'فروشنده بسلام'
                    }
                };
                addBasalamItem(basalamProduct, 1);
                console.log('Added Basalam product to cart:', product.name);
            } else {
                // Add to internal cart
                await addToCart(product.id, 1);
                console.log('Added internal product to cart:', product.name);
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error('خطا در افزودن به سبد خرید');
        }
    };

    // Handle add to wishlist
    const handleAddToWishlist = async (product: Product) => {
        try {
            const wasInWishlist = isInWishlist(product.id);
            await toggleWishlist(product.id);
            if (wasInWishlist) {
                toast.success('از علاقه‌مندی‌ها حذف شد');
            } else {
                toast.success('به علاقه‌مندی‌ها اضافه شد');
            }
        } catch (error) {
            console.error('Failed to toggle wishlist:', error);
            toast.error('خطا در تغییر علاقه‌مندی');
        }
    };

    // Get search result summary
    const getSearchSummary = () => {
        if (!searchQuery) return 'All Products';
        if (totalProducts === 0) return `No results for "${searchQuery}"`;
        if (totalProducts === 1) return `1 result for "${searchQuery}"`;
        return `${totalProducts} results for "${searchQuery}"`;
    };

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="container mx-auto px-4 py-8">
                {/* Header with Search */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary mb-2">Search Results</h1>
                            <p className="text-text-secondary">{getSearchSummary()}</p>
                        </div>

                        {/* Search Bar */}
                        <div className="w-full lg:w-96">
                            <SearchBar
                                initialValue={searchQuery}
                                onSearch={handleSearch}
                                placeholder="Search products..."
                                size="lg"
                            />
                        </div>
                    </div>

                    {/* Search Query Display */}
                    {searchQuery && (
                        <GlassCard className="mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="text-text-secondary">
                                        Searching for: <span className="font-semibold text-text-primary">"{searchQuery}"</span>
                                    </span>
                                </div>
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSearch('')}
                                >
                                    Clear Search
                                </GlassButton>
                            </div>
                        </GlassCard>
                    )}
                </div>

                {/* Sort and Filter Controls */}
                <GlassCard className="mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Results Count */}
                        <div className="text-text-secondary">
                            {loading ? 'Loading...' : `Showing ${products.length} of ${totalProducts} results`}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-4">
                            {/* Sort */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-text-secondary">Sort by:</span>
                                <DropdownSelect
                                    value={`${sort.field}-${sort.order}`}
                                    onChange={(v) => handleSortChange(v)}
                                    options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                                    placeholder="مرتب‌سازی"
                                />
                            </div>

                            {/* Filter Toggle (Mobile) */}
                            <GlassButton
                                variant="secondary"
                                onClick={() => setFiltersOpen(!filtersOpen)}
                                className="lg:hidden"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                                </svg>
                                Filters
                                {(getCategoriesLength(filters.categories) > 0 || filters.minPrice || filters.maxPrice || filters.minRating || filters.inStock !== undefined || filters.onSale !== undefined) && (
                                    <span className="ml-2 px-2 py-1 bg-accent-primary text-white text-xs rounded-full">
                                        {[
                                            getCategoriesLength(filters.categories),
                                            filters.minPrice ? 1 : 0,
                                            filters.maxPrice ? 1 : 0,
                                            filters.minRating ? 1 : 0,
                                            filters.inStock !== undefined ? 1 : 0,
                                            filters.onSale !== undefined ? 1 : 0
                                        ].reduce((a, b) => a + b, 0)}
                                    </span>
                                )}
                            </GlassButton>
                        </div>
                    </div>
                </GlassCard>

                {/* Main Content */}
                <div className="flex gap-8">
                    {/* Filters Sidebar (Desktop) */}
                    <div className="hidden lg:block w-80 flex-shrink-0">
                        <div className="sticky top-24">
                            <FilterSidebar
                                categories={categories}
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                onClearFilters={handleClearFilters}
                            />
                        </div>
                    </div>

                    {/* Mobile Filters Overlay */}
                    {filtersOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setFiltersOpen(false)}
                            />
                            <div className="absolute right-0 top-0 bottom-0 w-full bg-[#0A0F1C] border-l border-white/[0.08] overflow-y-auto">
                                <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                                    <span className="text-sm font-semibold text-white">فیلترها</span>
                                    <button
                                        onClick={() => setFiltersOpen(false)}
                                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-4">
                                    <FilterSidebar
                                        categories={categories}
                                        filters={filters}
                                        onFiltersChange={handleFiltersChange}
                                        onClearFilters={handleClearFilters}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[...Array(8)].map((_, i) => (
                                    <GlassCard key={i} className="animate-pulse">
                                        <div className="aspect-square bg-glass-medium rounded-xl mb-4"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 bg-glass-medium rounded"></div>
                                            <div className="h-6 bg-glass-medium rounded"></div>
                                            <div className="h-4 bg-glass-medium rounded w-2/3"></div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        ) : error ? (
                            <GlassCard className="text-center py-12">
                                <div className="text-accent-error mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary mb-2">Error Loading Results</h3>
                                <p className="text-text-secondary mb-4">{error}</p>
                                <GlassButton onClick={() => fetchProducts(currentPage)}>
                                    Try Again
                                </GlassButton>
                            </GlassCard>
                        ) : products.length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <div className="text-text-muted mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary mb-2">
                                    {searchQuery ? `No results for "${searchQuery}"` : 'No products found'}
                                </h3>
                                <p className="text-text-secondary mb-4">
                                    {searchQuery
                                        ? 'Try different keywords or check your spelling.'
                                        : 'Try adjusting your filters to find what you\'re looking for.'
                                    }
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    {searchQuery && (
                                        <GlassButton onClick={() => handleSearch('')}>
                                            Clear Search
                                        </GlassButton>
                                    )}
                                    <GlassButton variant="secondary" onClick={handleClearFilters}>
                                        Clear All Filters
                                    </GlassButton>
                                </div>
                            </GlassCard>
                        ) : (
                            <>
                                {/* Search Results Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                    {products.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAddToCart={handleAddToCart}
                                            onAddToWishlist={handleAddToWishlist}
                                            isInWishlist={isInWishlist(product.id)}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <GlassPagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};