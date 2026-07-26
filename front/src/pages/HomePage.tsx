import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { ProductCard } from '../components/ui/ProductCard';
import { SearchBar } from '../components/ui/SearchBar';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, Category } from '../types/product';
import { cn } from '../utils';
import { useCart } from '../context/CartContext';
import { useCart as useBasalamCart } from '../hooks/basalam/useCart';
import { BasalamProduct } from '../types/basalam';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { toast } from '../utils/toast';
import { Search, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, ArrowLeft } from 'lucide-react';

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { addToCart } = useCart();

    console.log('🏠 HomePage loaded');

    // State
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
    const [newArrivals, setNewArrivals] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Carousel state for featured products
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        fetchHomeData();
    }, []);

    // Auto-advance carousel
    useEffect(() => {
        if (featuredProducts.length > 0) {
            const interval = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % Math.ceil(featuredProducts.length / 4));
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [featuredProducts.length]);

    const fetchHomeData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all data in parallel
            const [featuredData, trendingData, newArrivalsData, categoriesData] = await Promise.all([
                productService.getProducts({ limit: 8, sort: { field: 'popularity', order: 'desc' } }),
                productService.getProducts({ limit: 6, sort: { field: 'popularity', order: 'desc' } }),
                productService.getProducts({ limit: 6, sort: { field: 'createdAt', order: 'desc' } }),
                categoryService.getCategories(),
            ]);

            setFeaturedProducts(featuredData.products || []);
            setTrendingProducts(trendingData.products || []);
            setNewArrivals(newArrivalsData.products || []);
            setCategories(Array.isArray(categoriesData) ? categoriesData.slice(0, 8) : []); // Limit to 8 categories
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در بارگذاری صفحه');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        if (query.trim()) {
            navigate(`/search?search=${encodeURIComponent(query)}`);
        }
    };

    const { addItem: addBasalamItem } = useBasalamCart();

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

    const handleCategoryClick = (categoryId: number) => {
        navigate(`/products?category=${categoryId}`);
    };



    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % Math.ceil(featuredProducts.length / 4));
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + Math.ceil(featuredProducts.length / 4)) % Math.ceil(featuredProducts.length / 4));
    };

    if (loading) {
        return <LoadingSpinner fullScreen label="در حال بارگذاری..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#080B14] flex items-center justify-center p-4">
                <div className="p-8 text-center max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <h2 className="text-xl font-semibold text-white mb-4">خطا در بارگذاری</h2>
                    <p className="text-white/50 mb-6">{error}</p>
                    <button onClick={fetchHomeData} className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
                        تلاش مجدد
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080B14]">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-transparent"></div>

                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                        محصولات ممتاز را کشف کنید
                    </h1>
                    <p className="text-lg md:text-xl text-white/50 mb-8 max-w-2xl mx-auto">
                        تجربه خرید با طراحی زیبای شیشه‌ای
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="text"
                                placeholder="جستجوی محصولات..."
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-base placeholder:text-white/25 focus:outline-none focus:border-accent-primary/40 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Products Carousel */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-accent-primary" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white">محصولات ویژه</h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={prevSlide}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Carousel */}
                    <div className="relative overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {Array.from({ length: Math.ceil(featuredProducts.length / 4) }).map((_, slideIndex) => (
                                <div key={slideIndex} className="min-w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-1 auto-rows-fr">
                                    {featuredProducts.slice(slideIndex * 4, (slideIndex + 1) * 4).map((product) => (
                                        <div key={product.id} className="flex">
                                            <ProductCard
                                                product={product}
                                                className="w-full"
                                                onAddToCart={handleAddToCart}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Carousel indicators */}
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: Math.ceil(featuredProducts.length / 4) }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={cn(
                                    'h-2 rounded-full transition-all',
                                    currentSlide === index
                                        ? 'bg-accent-primary w-8'
                                        : 'bg-white/15 hover:bg-white/25'
                                )}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Trending Products */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-orange-400" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white">پرطرفدارها</h2>
                        </div>
                        <button
                            onClick={() => navigate('/products?sort=popularity-desc')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            مشاهده همه
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                        {trendingProducts.map((product) => (
                            <div key={product.id} className="flex">
                                <ProductCard
                                    product={product}
                                    className="w-full"
                                    onAddToCart={handleAddToCart}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* New Arrivals */}
            <section className="py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white">جدیدترین‌ها</h2>
                        </div>
                        <button
                            onClick={() => navigate('/products?sort=createdAt-desc')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        >
                            مشاهده همه
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
                        {newArrivals.map((product) => (
                            <div key={product.id} className="flex">
                                <ProductCard
                                    product={product}
                                    className="w-full"
                                    onAddToCart={handleAddToCart}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="p-8 sm:p-12 rounded-3xl border border-white/[0.06] bg-white/[0.02]">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                            آماده شروع خرید هستید؟
                        </h2>
                        <p className="text-sm sm:text-base text-white/40 mb-6">
                            مجموعه کامل محصولات ممتاز ما را کاوش کنید
                        </p>
                        <button
                            onClick={() => navigate('/products')}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent-primary/20"
                        >
                            مشاهده همه محصولات
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
