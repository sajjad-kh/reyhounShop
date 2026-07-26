import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { DropdownSelect } from '../components/ui/DropdownSelect';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { ProductCard } from '../components/ui/ProductCard';
import { FilterSidebar } from '../components/ui/FilterSidebar';
import { Pagination } from '../components/ui/Pagination';
import { productService } from '../services/productService';
import { Product, Category, ProductFilters, ProductSort } from '../types/product';
import { UI_CONSTANTS } from '../utils/constants';
import { cn } from '../utils';
import { useCart } from '../context/CartContext';
import { useCart as useBasalamCart } from '../hooks/basalam/useCart';
import { BasalamProduct } from '../types/basalam';
import { ArrowLeft, SlidersHorizontal, X, Search } from 'lucide-react';
import { toast } from '../utils/toast';

const SORT_OPTIONS = [
    { value: 'popularity-desc', label: 'محبوب‌ترین', field: 'popularity' as const, order: 'desc' as const },
    { value: 'price-asc', label: 'ارزان‌ترین', field: 'price' as const, order: 'asc' as const },
    { value: 'price-desc', label: 'گران‌ترین', field: 'price' as const, order: 'desc' as const },
    { value: 'rating-desc', label: 'بیشترین امتیاز', field: 'rating' as const, order: 'desc' as const },
    { value: 'name-asc', label: 'نام (الفبا)', field: 'name' as const, order: 'asc' as const },
    { value: 'createdAt-desc', label: 'جدیدترین', field: 'createdAt' as const, order: 'desc' as const },
];

export const ProductListingPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [filters, setFilters] = useState<ProductFilters>({
        categories: searchParams.get('category') ? [parseInt(searchParams.get('category')!)] : undefined,
        minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
        maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
        minRating: searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!) : undefined,
        inStock: searchParams.get('inStock') === 'true' ? true : undefined,
        onSale: searchParams.get('onSale') === 'true' ? true : undefined,
    });
    const [sort, setSort] = useState<ProductSort>(() => {
        const sortParam = searchParams.get('sort') || 'popularity-desc';
        const sortOption = SORT_OPTIONS.find(option => option.value === sortParam) || SORT_OPTIONS[0];
        return { field: sortOption.field, order: sortOption.order };
    });

    const updateUrlParams = useCallback((newFilters: ProductFilters, newSort: ProductSort, newSearch: string, page: number = 1) => {
        const params = new URLSearchParams();

        if (newSearch) params.set('search', newSearch);
        if (newFilters.categories && Array.isArray(newFilters.categories) && newFilters.categories.length > 0) {
            params.set('category', newFilters.categories[0].toString());
        }
        if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
        if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
        if (newFilters.minRating) params.set('minRating', newFilters.minRating.toString());
        if (newFilters.inStock) params.set('inStock', 'true');
        if (newFilters.onSale) params.set('onSale', 'true');
        if (page > 1) params.set('page', page.toString());

        const sortValue = `${newSort.field}-${newSort.order}`;
        if (sortValue !== 'popularity-desc') params.set('sort', sortValue);

        setSearchParams(params);
    }, [setSearchParams]);

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
            setError(err instanceof Error ? err.message : 'Failed to load products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters, sort]);

    const fetchCategories = useCallback(async () => {
        try {
            const categoriesData = await productService.getCategories();
            setCategories(categoriesData);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const page = parseInt(searchParams.get('page') || '1');
        setCurrentPage(page);
        fetchProducts(page);
    }, [fetchProducts, searchParams]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        updateUrlParams(filters, sort, query, 1);
    };

    const handleFiltersChange = (newFilters: ProductFilters) => {
        setFilters(newFilters);
        updateUrlParams(newFilters, sort, searchQuery, 1);
    };

    const handleSortChange = (sortValue: string) => {
        const sortOption = SORT_OPTIONS.find(option => option.value === sortValue) || SORT_OPTIONS[0];
        const newSort = { field: sortOption.field, order: sortOption.order };
        setSort(newSort);
        updateUrlParams(filters, newSort, searchQuery, 1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        updateUrlParams(filters, sort, searchQuery, page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearFilters = () => {
        const emptyFilters: ProductFilters = {};
        setFilters(emptyFilters);
        setSearchQuery('');
        updateUrlParams(emptyFilters, sort, '', 1);
    };

    const { addToCart } = useCart();
    const { addItem: addBasalamItem } = useBasalamCart();

    const handleAddToCart = async (product: Product) => {
        try {
            if (product.basalamProductId !== null && product.basalamProductId !== undefined) {
                const imageUrl = product.images?.[0]?.url || '';
                const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${imageUrl}`;

                const basalamProduct: BasalamProduct = {
                    id: product.basalamProductId,
                    title: product.name,
                    price: product.effectivePrice,
                    stock: product.stock,
                    image: fullImageUrl,
                    seller: {
                        id: 0,
                        name: 'فروشنده بسلام'
                    }
                };
                addBasalamItem(basalamProduct, 1);
                toast.success('محصول به سبد خرید بسلام اضافه شد');
            } else {
                await addToCart(product.id, 1);
                toast.success('محصول به سبد خرید اضافه شد');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error('خطا در افزودن به سبد خرید');
        }
    };

    const handleAddToWishlist = (product: Product) => {
        console.log('Add to wishlist:', product);
    };

    const hasActiveFilters = !!(
        (filters.categories?.length ?? 0) > 0 ||
        filters.minPrice ||
        filters.maxPrice ||
        filters.minRating ||
        filters.inStock !== undefined ||
        filters.onSale !== undefined ||
        searchQuery
    );

    return (
        <div className="min-h-screen bg-[#080B14]">
            {/* ==================== HEADER ==================== */}
            <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080B14]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        {/* Back + Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => navigate('/products?category=3')}
                                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-200"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-sm sm:text-base font-bold text-white truncate">محصولات</h1>
                                <p className="text-[10px] sm:text-[11px] text-white/40">
                                    {totalProducts > 0 ? `${totalProducts} محصول موجود` : 'محصولی موجود نیست'}
                                </p>
                            </div>
                        </div>

                        {/* Filter toggle (mobile) */}
                        <button
                            onClick={() => setFiltersOpen(true)}
                            className="lg:hidden flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[11px] sm:text-xs font-medium"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            فیلترها
                            {hasActiveFilters && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== SEARCH BAR ==================== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="جستجوی محصولات..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-white/25 focus:outline-none focus:border-accent-primary/40 focus:bg-white/[0.06] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => handleSearch('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Sort */}
                    <div className="w-full sm:w-48">
                        <DropdownSelect
                            value={`${sort.field}-${sort.order}`}
                            onChange={(v) => handleSortChange(v)}
                            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                            placeholder="مرتب‌سازی"
                        />
                    </div>
                </div>
            </div>

            {/* ==================== MAIN CONTENT ==================== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
                <div className="flex gap-6 lg:gap-8">

                    {/* Desktop Sidebar */}
                    <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
                        <div className="sticky top-24">
                            <FilterSidebar
                                categories={categories}
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                onClearFilters={handleClearFilters}
                                isOpen={true}
                                onToggle={() => { }}
                            />
                        </div>
                    </div>

                    {/* Mobile Sidebar Overlay */}
                    {filtersOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setFiltersOpen(false)}
                            />
                            <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#0A0F1C] border-l border-white/[0.08] overflow-y-auto">
                                <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                                    <span className="text-sm font-semibold text-white">فیلترها</span>
                                    <button
                                        onClick={() => setFiltersOpen(false)}
                                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <FilterSidebar
                                        categories={categories}
                                        filters={filters}
                                        onFiltersChange={handleFiltersChange}
                                        onClearFilters={handleClearFilters}
                                        isOpen={true}
                                        onToggle={() => setFiltersOpen(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Area */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            /* Loading Skeleton */
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-pulse">
                                        <div className="aspect-square bg-white/[0.04]" />
                                        <div className="p-3 sm:p-4 space-y-2.5">
                                            <div className="h-3 bg-white/[0.06] rounded-lg w-3/4" />
                                            <div className="h-4 bg-white/[0.06] rounded-lg w-1/2" />
                                            <div className="h-3 bg-white/[0.06] rounded-lg w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            /* Error State */
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                    <X className="w-7 h-7 text-red-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1.5">خطا در بارگذاری</h3>
                                <p className="text-xs text-white/40 mb-4 max-w-xs">{error}</p>
                                <button
                                    onClick={() => fetchProducts(currentPage)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    تلاش مجدد
                                </button>
                            </div>
                        ) : products.length === 0 ? (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                                    <Search className="w-7 h-7 text-white/20" />
                                </div>
                                <h3 className="text-sm font-semibold text-white mb-1.5">محصولی یافت نشد</h3>
                                <p className="text-xs text-white/40 mb-4 max-w-xs">
                                    فیلترها یا عبارت جستجو را تغییر دهید
                                </p>
                                <button
                                    onClick={handleClearFilters}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    پاک کردن فیلترها
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Products Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-8">
                                    {products.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAddToCart={handleAddToCart}
                                            onAddToWishlist={handleAddToWishlist}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <Pagination
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
