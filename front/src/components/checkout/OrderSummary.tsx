import React from 'react';
import { CartState } from '../../types/cart';

interface OrderSummaryProps {
    cart: CartState;
    selectedAddressId: number | null;
    selectedShippingMethodId?: number | null;
    shippingCost?: number;
    paymentMethod: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
    cart,
    selectedAddressId,
    selectedShippingMethodId,
    shippingCost = 0,
    paymentMethod,
}) => {

    const finalAmount =
        (cart.totalAmount || 0) -
        (cart.discountAmount || 0) +
        (shippingCost || 0);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">خلاصه سفارش</h2>

            <div className="space-y-3">
                <div className="flex justify-between text-white/80">
                    <span>محصولات ({cart.totalItems || 0})</span>
                    <span>{(cart.totalAmount || 0).toLocaleString('fa-IR')} ریال</span>
                </div>

                {cart.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                        <span>تخفیف</span>
                        <span>-{(cart.discountAmount || 0).toLocaleString('fa-IR')} ریال</span>
                    </div>
                )}

                <div className="flex justify-between text-white/80">
                    <span>هزینه ارسال</span>
                    <span>
                        {shippingCost === 0 ? (
                            <span className="text-green-400">رایگان</span>
                        ) : (
                            `${shippingCost.toLocaleString('fa-IR')} ریال`
                        )}
                    </span>
                </div>
            </div>

            <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between text-2xl font-bold text-white">
                    <span>جمع کل</span>
                    <span>{finalAmount.toLocaleString('fa-IR')} ریال</span>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">

                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${selectedAddressId ? 'bg-green-500' : 'bg-white/10'}`} />
                    <span className="text-sm">آدرس ارسال انتخاب شد</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${selectedShippingMethodId ? 'bg-green-500' : 'bg-white/10'}`} />
                    <span className="text-sm">روش ارسال انتخاب شد</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${paymentMethod ? 'bg-green-500' : 'bg-white/10'}`} />
                    <span className="text-sm">روش پرداخت انتخاب شد</span>
                </div>

            </div>
        </div>
    );
};