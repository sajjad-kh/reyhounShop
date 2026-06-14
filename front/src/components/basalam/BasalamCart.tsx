import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { CartItem } from '../../types/basalam';
import { cn } from '../../utils';

export interface BasalamCartProps {
    items: CartItem[];
    onUpdateQuantity: (productId: number, quantity: number) => void;
    onRemove: (productId: number) => void;
    onCheckout: () => void;
    className?: string;
}

export const BasalamCart: React.FC<BasalamCartProps> = ({
    items,
    onUpdateQuantity,
    onRemove,
    onCheckout,
    className
}) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const isEmpty = items.length === 0;
    const [removingId, setRemovingId] = React.useState<number | null>(null);

    const handleRemove = async (productId: number) => {
        setRemovingId(productId);
        // Add a small delay for animation
        setTimeout(() => {
            onRemove(productId);
            setRemovingId(null);
        }, 200);
    };

    return (
        <GlassCard className={cn('space-y-4 fade-in-up', className)}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-glass-light pb-4">
                <h2 className="text-xl font-bold text-text-primary">سبد خرید</h2>
                <span className="text-sm text-text-muted">
                    {items.length} محصول
                </span>
            </div>

            {/* Cart Items */}
            {isEmpty ? (
                <div className="py-16 text-center scale-in">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-glass-light flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-text-muted"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                        </svg>
                    </div>
                    <p className="text-text-primary text-lg font-medium mb-2">سبد خرید شما خالی است</p>
                    <p className="text-text-muted text-sm">محصولات مورد نظر خود را به سبد اضافه کنید</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                        {items.map((item, index) => (
                            <div
                                key={item.productId}
                                className={cn(
                                    'glass-card bg-glass-light p-4 rounded-xl flex items-center space-x-4 space-x-reverse transition-all duration-300',
                                    'hover:bg-glass-medium hover-lift',
                                    removingId === item.productId && 'opacity-0 scale-95'
                                )}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Product Image */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-glass-medium">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-glass-medium flex items-center justify-center">
                                            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-text-primary truncate">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-text-muted mt-1">
                                        {item.price.toLocaleString('fa-IR')} تومان
                                    </p>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center space-x-2 space-x-reverse mt-2">
                                        <div className="flex items-center glass-card bg-glass-medium rounded-lg overflow-hidden hover-brightness">
                                            <button
                                                onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                                className="px-2.5 py-1.5 hover:bg-glass-heavy transition-all duration-200 text-sm active:scale-95"
                                                aria-label="کاهش تعداد"
                                                disabled={item.quantity <= 1}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                </svg>
                                            </button>
                                            <span className="px-3 py-1.5 text-sm min-w-[2.5rem] text-center font-medium">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                                className="px-2.5 py-1.5 hover:bg-glass-heavy transition-all duration-200 text-sm active:scale-95"
                                                aria-label="افزایش تعداد"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => handleRemove(item.productId)}
                                            className="text-accent-error hover:text-accent-error/80 hover:bg-red-500/10 transition-all duration-200 p-2 rounded-lg active:scale-95"
                                            aria-label="حذف از سبد"
                                            disabled={removingId === item.productId}
                                        >
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Subtotal */}
                                <div className="text-left">
                                    <p className="font-bold text-text-primary">
                                        {item.subtotal.toLocaleString('fa-IR')}
                                    </p>
                                    <p className="text-xs text-text-muted">تومان</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="border-t border-border-glass-light pt-4 space-y-4 fade-in-up">
                        <div className="glass-card bg-glass-light p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-text-muted text-sm">تعداد اقلام:</span>
                                <span className="text-text-primary font-medium">{items.length} محصول</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-text-primary font-medium">جمع کل:</span>
                                <div className="text-left">
                                    <span className="text-2xl font-bold text-accent-primary">
                                        {subtotal.toLocaleString('fa-IR')}
                                    </span>
                                    <span className="text-sm text-text-muted mr-1">تومان</span>
                                </div>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <GlassButton
                            variant="accent"
                            size="lg"
                            className="w-full hover-lift pulse-glow"
                            onClick={onCheckout}
                            ripple
                        >
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            ادامه خرید
                        </GlassButton>
                    </div>
                </>
            )}
        </GlassCard>
    );
};
