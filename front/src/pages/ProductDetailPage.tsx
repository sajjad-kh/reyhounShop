import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { ImageGallery } from '../components/ui/ImageGallery';
import { ReviewsSection } from '../components/ui/ReviewsSection';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { cn } from '../utils';
import { useCart } from '../context/CartContext';
import { useCart as useBasalamCart } from '../hooks/basalam/useCart';

import { cartService } from '../services/cartService';

export const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

    const fetchProduct = async (productId: number) => {
        try {
            setLoading(true);
            setError(null);

            const productData = await productService.getProduct(productId);
            setProduct(productData);

            const relatedData = await productService.getProducts({
                category: productData.category?.id,
                limit: 4
            });

            const filtered = relatedData.products.filter(p => p.id !== productData.id);
            setRelatedProducts(filtered.slice(0, 4));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Product not found');
            setProduct(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            const productId = parseInt(id);
            if (isNaN(productId)) {
                setError('Invalid product ID');
                setLoading(false);
                return;
            }
            fetchProduct(productId);
        }
    }, [id]);

    const { addToCart } = useCart();
    const { addItem: addBasalamItem } = useBasalamCart();

    const handleAddToCart = async () => {
        if (!product) return;

        try {
            await cartService.addToCart({
                productId: product.id,
                quantity: Number(quantity),
            });

            console.log("✅ Added to cart");
        } catch (error) {
            console.error("❌ Add to cart failed:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-primary">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <GlassCard className="aspect-square animate-pulse">
                            <div className="w-full h-full bg-glass-medium rounded-xl"></div>
                        </GlassCard>
                        <GlassCard className="space-y-6 animate-pulse">
                            <div className="space-y-4">
                                <div className="h-4 bg-glass-medium rounded w-1/4"></div>
                                <div className="h-8 bg-glass-medium rounded w-3/4"></div>
                                <div className="h-6 bg-glass-medium rounded w-1/2"></div>
                                <div className="h-20 bg-glass-medium rounded"></div>
                                <div className="h-12 bg-glass-medium rounded w-1/3"></div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-gradient-primary">
                <div className="container mx-auto px-4 py-8">
                    <GlassCard className="text-center py-12">
                        <div className="text-accent-error mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">Product Not Found</h1>
                        <p className="text-text-secondary mb-6">{error}</p>
                        <div className="space-x-4">
                            <GlassButton onClick={() => navigate('/products')}>
                                Browse Products
                            </GlassButton>
                            <GlassButton variant="secondary" onClick={() => navigate(-1)}>
                                Go Back
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
            </div>
        );
    }

    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center space-x-2 text-sm text-text-muted mb-8">
                    <button onClick={() => navigate('/')} className="hover:text-text-secondary transition-colors">
                        Home
                    </button>
                    <span>/</span>
                    <button onClick={() => navigate('/products')} className="hover:text-text-secondary transition-colors">
                        Products
                    </button>
                    <span>/</span>
                    <button
                        onClick={() => navigate(`/products?category=${product.category.id}`)}
                        className="hover:text-text-secondary transition-colors"
                    >
                        {product.category.name}
                    </button>
                    <span>/</span>
                    <span className="text-text-secondary">{product.name}</span>
                </nav>

                {/* Product Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <ImageGallery
                        images={product.images}
                        productName={product.name}
                    />

                    <GlassCard className="space-y-6">
                        <div className="text-sm text-accent-primary uppercase tracking-wide font-medium">
                            {product.category.name}
                        </div>

                        <h1 className="text-3xl font-bold text-text-primary leading-tight">
                            {product.name}
                        </h1>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className={cn(
                                            'w-5 h-5',
                                            i < Math.floor(product.averageRating)
                                                ? 'text-yellow-400 fill-current'
                                                : 'text-text-muted'
                                        )}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                        />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-text-primary font-medium">
                                {(product.averageRating || 0).toFixed(1)}
                            </span>
                            <span className="text-text-muted">
                                ({product.reviewCount} reviews)
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center space-x-4 space-x-reverse">
                                <span className="text-3xl font-bold text-text-primary">
                                    {(product.effectivePrice || product.discountPrice || product.price).toLocaleString('fa-IR')} ریال
                                </span>
                                {hasDiscount && (
                                    <>
                                        <span className="text-xl text-text-muted line-through">
                                            {product.price.toLocaleString('fa-IR')} ریال
                                        </span>
                                        <span className="glass-card bg-accent-error/20 border-accent-error/30 px-3 py-1 rounded-lg text-accent-error font-semibold">
                                            {discountPercentage}% تخفیف
                                        </span>
                                    </>
                                )}
                            </div>
                            {hasDiscount && (
                                <p className="text-sm text-accent-success">
                                    شما {((product.price - (product.effectivePrice || product.discountPrice || product.price))).toLocaleString('fa-IR')} ریال صرفه‌جویی می‌کنید
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-text-primary">Description</h3>
                            <p className="text-text-secondary leading-relaxed">
                                {product.description}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div className={cn(
                                'w-3 h-3 rounded-full',
                                product.stock > 0 ? 'bg-accent-success' : 'bg-accent-error'
                            )}></div>
                            <span className={cn(
                                'font-medium',
                                product.stock > 0 ? 'text-accent-success' : 'text-accent-error'
                            )}>
                                {product.stock > 0
                                    ? `In Stock (${product.stock} available)`
                                    : 'Out of Stock'
                                }
                            </span>
                        </div>

                        {/* Quantity Selector */}
                        {product.stock > 0 && (
                            <div className="flex items-center space-x-4">
                                <span className="text-text-primary font-medium">تعداد:</span>
                                <div className="flex items-center border border-border-glass-light rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        className="px-3 py-2 hover:bg-glass-medium transition"
                                    >
                                        -
                                    </button>
                                    <span className="px-4 py-2">{quantity}</span>
                                    <button
                                        onClick={() =>
                                            setQuantity(prev =>
                                                prev < product.stock ? prev + 1 : prev
                                            )
                                        }
                                        className="px-3 py-2 hover:bg-glass-medium transition"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add To Cart Button */}
                        {product.stock > 0 && (
                            <GlassButton
                                className="w-full mt-4"
                                onClick={handleAddToCart}
                            >
                                افزودن به سبد خرید
                            </GlassButton>
                        )}
                    </GlassCard>
                </div>

                <div className="mb-12">
                    <ReviewsSection
                        productId={product.id}
                        averageRating={product.averageRating}
                        reviewCount={product.reviewCount}
                        reviewsObj={product.reviews ?? []}
                    />
                </div>
            </div>
        </div>
    );
};
