import React, { useState } from 'react';
import { CartState } from '../../types/cart';
import { useCart } from '../../hooks/useCart';
import { GlassButton } from '../ui/GlassButton';

interface CartSummaryProps {
    cart: CartState;
    discountCode: string;
    onDiscountCodeChange: (code: string) => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
    cart,
    discountCode,
    onDiscountCodeChange,
}) => {
    const { applyDiscountCode } = useCart();
    const [isApplying, setIsApplying] = useState(false);
    const [discountError, setDiscountError] = useState<string | null>(null);
    const [discountSuccess, setDiscountSuccess] = useState(false);

    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) return;

        try {
            setIsApplying(true);
            setDiscountError(null);
            setDiscountSuccess(false);
            await applyDiscountCode(discountCode);
            setDiscountSuccess(true);
        } catch (error) {
            setDiscountError(error instanceof Error ? error.message : 'Invalid discount code');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Discount Code Input */}
            <div className="space-y-2">
                <label className="text-sm text-white/80 font-medium">Discount Code</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => {
                            onDiscountCodeChange(e.target.value.toUpperCase());
                            setDiscountError(null);
                            setDiscountSuccess(false);
                        }}
                        placeholder="Enter code"
                        className="flex-1 glass-input text-white placeholder-white/40"
                        disabled={isApplying}
                    />
                    <GlassButton
                        onClick={handleApplyDiscount}
                        disabled={!discountCode.trim() || isApplying}
                        size="sm"
                    >
                        {isApplying ? 'Applying...' : 'Apply'}
                    </GlassButton>
                </div>
                {discountError && (
                    <p className="text-xs text-red-400">{discountError}</p>
                )}
                {discountSuccess && (
                    <p className="text-xs text-green-400">Discount applied successfully!</p>
                )}
            </div>

            {/* Summary Details */}
            <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between text-white/80">
                    <span>Subtotal</span>
                    <span>${cart.totalAmount.toFixed(2)}</span>
                </div>

                {cart.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                        <span>Discount {cart.discountCode && `(${cart.discountCode})`}</span>
                        <span>-${cart.discountAmount.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex justify-between text-white/80">
                    <span>Shipping</span>
                    <span>
                        {cart.shippingCost === 0 ? 'FREE' : `$${cart.shippingCost.toFixed(2)}`}
                    </span>
                </div>

                <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-white/10">
                    <span>Total</span>
                    <span>${cart.finalAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
