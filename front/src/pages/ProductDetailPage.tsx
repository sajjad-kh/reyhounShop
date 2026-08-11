import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImageGallery } from '../components/ui/ImageGallery';
import { ReviewsSection } from '../components/ui/ReviewsSection';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { cn } from '../utils';
import { cartService } from '../services/cartService';
import { toast } from '../utils/toast';
import { ArrowLeft, ShoppingCart, Minus, Plus, Package, Truck, Shield, Star } from 'lucide-react';
import { WishlistButton } from '../components/wishlist/WishlistButton';

export const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

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

    const handleAddToCart = async () => {
        if (!product) return;
        try {
            await cartService.addToCart({
                productId: product.id,
                quantity: Number(quantity),
            });
            toast.success('محصول به سبد خرید اضافه شد');
        } catch (error) {
            console.error("Add to cart failed:", error);
            toast.error('خطا در افزودن به سبد خرید');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080B14]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-12">
                        {/* Image skeleton */}
                        <div className="aspect-square rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
                        {/* Info skeleton */}
                        <div className="space-y-5 animate-pulse">
                            <div className="h-3 bg-white/[0.05] rounded w-1/4" />
                            <div className="h-6 bg-white/[0.05] rounded w-3/4" />
                            <div className="h-4 bg-white/[0.05] rounded w-1/3" />
                            <div className="h-20 bg-white/[0.05] rounded" />
                            <div className="h-12 bg-white/[0.05] rounded w-1/2" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-[#080B14]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                            <Package className="w-7 h-7 text-red-400" />
                        </div>
                        <h1 className="text-lg font-bold text-white mb-1.5">محصول یافت نشد</h1>
                        <p className="text-xs text-white/40 mb-5">{error}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/products?category=3')}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            >
                                مشاهده محصولات
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                            >
                                بازگشت
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
        : 0;
    const averageRating = product.averageRating ?? 0;
    const reviewCount = product.reviewCount ?? 0;

    return (
        <div className="min-h-screen bg-[#080B14]">
            {/* Header */}
            <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080B14]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/products')}
                            className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-200"
                        >
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-bold text-white truncate">{product.name}</h1>
                            <p className="text-[10px] sm:text-[11px] text-white/40 truncate">
                                {product.category?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-10 lg:mb-16">
                    {/* Image Gallery */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <ImageGallery
                            images={product.images}
                            productName={product.name}
                        />
                    </div>

                    {/* Product Info */}
                    <div className="space-y-5 sm:space-y-6">
                        {/* Category */}
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-[10px] sm:text-[11px] font-semibold text-accent-primary">
                                {product.category?.name}
                            </span>
                            {hasDiscount && (
                                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] sm:text-[11px] font-semibold text-red-400">
                                    %{discountPercentage} تخفیف
                                </span>
                            )}
                        </div>

                        {/* Name */}
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                            {product.name}
                        </h2>

                        {/* Rating */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className={cn(
                                            'w-4 h-4',
                                            i < Math.floor(averageRating)
                                                ? 'text-amber-400 fill-current'
                                                : 'text-white/15'
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
                            <span className="text-sm font-medium text-white/70">
                                {averageRating.toFixed(1)}
                            </span>
                            <span className="text-xs text-white/30">
                                ({reviewCount} نظر)
                            </span>
                        </div>

                        {/* Price */}
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <span className="text-2xl sm:text-3xl font-bold text-white">
                                    {(product.effectivePrice || product.discountPrice || product.price).toLocaleString('fa-IR')}
                                </span>
                                <span className="text-sm text-white/30">ریال</span>
                                {hasDiscount && (
                                    <span className="text-sm text-white/20 line-through">
                                        {product.price.toLocaleString('fa-IR')} ریال
                                    </span>
                                )}
                            </div>
                            {hasDiscount && (
                                <p className="text-xs text-emerald-400 mt-2">
                                    شما {((product.price - (product.effectivePrice || product.discountPrice || product.price))).toLocaleString('fa-IR')} ریال صرفه‌جویی می‌کنید
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-white/60 mb-2">توضیحات</h3>
                                <p className="text-xs sm:text-sm text-white/40 leading-relaxed">
                                    {product.description}
                                </p>
                            </div>
                        )}

                        {/* Stock Status */}
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                'w-2 h-2 rounded-full',
                                product.stock > 0 ? 'bg-emerald-400' : 'bg-red-400'
                            )} />
                            <span className={cn(
                                'text-xs sm:text-sm font-medium',
                                product.stock > 0 ? 'text-emerald-400' : 'text-red-400'
                            )}>
                                {product.stock > 0
                                    ? `موجود (${product.stock} عدد)`
                                    : 'ناموجود'
                                }
                            </span>
                        </div>

                        {/* Quantity + Add to Cart */}
                        {product.stock > 0 && (
                            <div className="space-y-4 pt-2">
                                {/* Quantity */}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs sm:text-sm text-white/50">تعداد:</span>
                                    <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                        <button
                                            onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-10 sm:w-12 text-center text-sm font-semibold text-white">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(prev => prev < product.stock ? prev + 1 : prev)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Add to Cart Button */}
                                <button
                                    onClick={handleAddToCart}
                                    className="w-full flex items-center justify-center gap-2.5 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-accent-primary to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent-primary/20"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    افزودن به سبد خرید
                                </button>

                                {/* Wishlist Button */}
                                <div className="flex items-center justify-center">
                                    <WishlistButton
                                        productId={product.id}
                                        size="md"
                                        showLabel
                                    />
                                </div>
                            </div>
                        )}

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                <Truck className="w-4 h-4 text-white/30" />
                                <span className="text-[9px] sm:text-[10px] text-white/30 text-center">ارسال سریع</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                <Shield className="w-4 h-4 text-white/30" />
                                <span className="text-[9px] sm:text-[10px] text-white/30 text-center">ضمانت اصالت</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                <Package className="w-4 h-4 text-white/30" />
                                <span className="text-[9px] sm:text-[10px] text-white/30 text-center">بسته‌بندی ایمن</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <ReviewsSection
                    productId={product.id}
                    averageRating={product.averageRating}
                    reviewCount={product.reviewCount}
                    reviewsObj={product.reviews ?? []}
                />
            </div>
        </div>
    );
};
