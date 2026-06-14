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
            setError(err instanceof Error ? err.message : 'Failed to load homepage data');
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
            alert('خطا در افزودن به سبد خرید');
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
        return (
            <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
                <div className="glass-card p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
                <GlassCard className="p-8 text-center max-w-md">
                    <h2 className="texbuyt-xl font-semibold text-text-primary mb-4">Error Loading Page</h2>
                    <p className="text-text-secondary mb-6">{error}</p>
                    <GlassButton onClick={fetchHomeData}>Try Again</GlassButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-primary">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-secondary opacity-30"></div>

                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6 animate-fade-in-up">
                        Discover Premium Products
                    </h1>
                    <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Experience shopping with stunning glassmorphism design
                    </p>

                    {/* Glass Search Bar */}
                    <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <SearchBar
                            onSearch={handleSearch}
                            placeholder="Search for products..."
                            className="w-full"
                        />
                    </div>
                </div>
            </section>

            {/* Featured Products Carousel */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold text-text-primary">Featured Products</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={prevSlide}
                                className="glass-button p-3 rounded-full hover:brightness-110 transition-all"
                                aria-label="Previous slide"
                            >
                                <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextSlide}
                                className="glass-button p-3 rounded-full hover:brightness-110 transition-all"
                                aria-label="Next slide"
                            >
                                <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
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
                                <div key={slideIndex} className="min-w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-1 auto-rows-fr">
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
                                    'w-2 h-2 rounded-full transition-all',
                                    currentSlide === index
                                        ? 'bg-text-primary w-8'
                                        : 'bg-text-secondary/50 hover:bg-text-secondary'
                                )}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Trending Products */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold text-text-primary">Trending Now</h2>
                        <GlassButton
                            variant="secondary"
                            onClick={() => navigate('/products?sort=popularity-desc')}
                        >
                            View All
                        </GlassButton>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
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
            <section className="py-16 px-4 bg-gradient-to-b from-transparent to-black/20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold text-text-primary">New Arrivals</h2>
                        <GlassButton
                            variant="secondary"
                            onClick={() => navigate('/products?sort=createdAt-desc')}
                        >
                            View All
                        </GlassButton>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
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
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <GlassCard className="p-12">
                        <h2 className="text-4xl font-bold text-text-primary mb-4">
                        آماده شروع خرید هستید؟                             
                        </h2>
                        <p className="text-xl text-text-secondary mb-8">
                            مجموعه کامل محصولات ممتاز ما را کاوش کنید
                        </p>
                        <GlassButton
                            size="lg"
                            onClick={() => navigate('/products')}
                            className="px-8 py-4 text-lg"
                        >
                            Browse All Products
                        </GlassButton>
                    </GlassCard>
                </div>
            </section>
        </div>
    );
};
