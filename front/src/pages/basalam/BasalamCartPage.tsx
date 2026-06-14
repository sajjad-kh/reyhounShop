import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/basalam/useCart';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';

export const BasalamCartPage: React.FC = () => {
    const navigate = useNavigate();
    const { cart, totalAmount, itemCount, removeItem, updateQuantity, clearCart } = useCart();

    if (cart.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 page-enter">
                <GlassCard className="text-center py-16 scale-in">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                        <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <p className="text-text-primary text-lg font-medium mb-2">سبد خرید بسلام شما خالی است</p>
                    <p className="text-text-muted text-sm mb-6">برای ادامه خرید، محصولات بسلام را به سبد اضافه کنید</p>
                    <GlassButton onClick={() => navigate('/products')} className="hover-lift">
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        بازگشت به محصولات
                    </GlassButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 page-enter">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-8 fade-in-up">
                سبد خرید بسلام ({itemCount} محصول)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.map((item) => (
                        <GlassCard key={item.productId} className="p-4 fade-in-up">
                            <div className="flex items-center space-x-4 space-x-reverse">
                                {/* Product Image */}
                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.image ? (
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-glass-light" />
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-text-primary font-medium mb-1 truncate">{item.title}</h3>
                                    <p className="text-text-muted text-sm">
                                        قیمت واحد: {item.price.toLocaleString('fa-IR')} تومان
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors flex items-center justify-center"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="w-12 text-center font-medium text-text-primary">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors flex items-center justify-center"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Subtotal */}
                                <div className="text-left">
                                    <p className="text-text-primary font-bold">
                                        {item.subtotal.toLocaleString('fa-IR')} تومان
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeItem(item.productId)}
                                    className="text-accent-error hover:text-accent-error/80 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <GlassCard className="sticky top-4 p-6 fade-in-up">
                        <h2 className="text-xl font-bold text-text-primary mb-4">خلاصه سفارش</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between text-text-muted">
                                <span>تعداد محصولات:</span>
                                <span>{itemCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-text-primary font-bold text-lg">
                                <span>جمع کل:</span>
                                <span>{totalAmount.toLocaleString('fa-IR')} تومان</span>
                            </div>
                        </div>

                        <GlassButton
                            variant="accent"
                            size="lg"
                            className="w-full mb-3"
                            onClick={() => navigate('/basalam/checkout')}
                        >
                            ادامه خرید
                        </GlassButton>

                        <GlassButton
                            variant="secondary"
                            size="lg"
                            className="w-full"
                            onClick={clearCart}
                        >
                            پاک کردن سبد
                        </GlassButton>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
