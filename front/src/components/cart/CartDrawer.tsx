import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { GlassButton } from '../ui/GlassButton';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { state } = useCart();
    const { cart, isLoading } = state;
    const [discountCode, setDiscountCode] = useState('');

    const handleCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    const handleContinueShopping = () => {
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[480px] glass-card rounded-l-2xl z-50 transform transition-transform duration-400 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Shopping Cart</h2>
                            <p className="text-sm text-white/60 mt-1">
                                {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close cart"
                        >
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                            </div>
                        ) : cart.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <svg
                                    className="w-24 h-24 text-white/20 mb-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                    />
                                </svg>
                                <h3 className="text-xl font-semibold text-white mb-2">Your cart is empty</h3>
                                <p className="text-white/60 mb-6">Add some items to get started</p>
                                <GlassButton onClick={handleContinueShopping}>
                                    Continue Shopping
                                </GlassButton>
                            </div>
                        ) : (
                            <>
                                {cart.items.map((item) => (
                                    <CartItem key={item.id} item={item} />
                                ))}
                            </>
                        )}
                    </div>

                    {/* Footer with Summary */}
                    {cart.items.length > 0 && (
                        <div className="border-t border-white/10 p-6 space-y-4">
                            <CartSummary
                                cart={cart}
                                discountCode={discountCode}
                                onDiscountCodeChange={setDiscountCode}
                            />

                            <div className="space-y-3">
                                <GlassButton
                                    variant="primary"
                                    className="w-full"
                                    onClick={handleCheckout}
                                    ripple
                                >
                                    Proceed to Checkout
                                </GlassButton>
                                <GlassButton
                                    variant="secondary"
                                    className="w-full"
                                    onClick={handleContinueShopping}
                                >
                                    Continue Shopping
                                </GlassButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
