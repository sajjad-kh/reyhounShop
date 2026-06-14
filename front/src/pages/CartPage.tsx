import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useCart as useBasalamCart } from '../hooks/basalam/useCart';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { getImageUrl } from '../utils/constants';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();

  const { state, updateCartItem, removeFromCart } = useCart();
  const { cart, isLoading } = state;

  const {
    cart: basalamCartRaw,
    removeItem: removeBasalamItem,
    updateQuantity: updateBasalamQuantity,
  } = useBasalamCart();

  // ✅ Safe fallbacks (فقط لاجیک – بدون تغییر UI)
  const internalItems = cart?.items ?? [];
  console.log("nterdfsdgdfgdfhgdfg",cart?.items)
  const basalamCart = basalamCartRaw ?? [];

  const safeCart = cart ?? {
    totalItems: 0,
    totalAmount: 0,
    discountAmount: 0,
    shippingCost: 0,
    finalAmount: 0,
  };

  const hasInternalItems = internalItems.length > 0;
  const hasBasalamItems = basalamCart.length > 0;

  const internalTotalToman = (safeCart.finalAmount || 0) * 10;

  const basalamTotalToman = basalamCart.reduce(
    (sum, item) => sum + (item?.subtotal || 0),
    0
  );

  const combinedTotal = internalTotalToman + basalamTotalToman;

  const combinedItemCount =
    (safeCart.totalItems || 0) +
    basalamCart.reduce(
      (sum, item) => sum + (item?.quantity || 0),
      0
    );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" dir="rtl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-8">

          {hasInternalItems && (
            <>
              {internalItems.map((item) => (
                <GlassCard key={`internal-${item.id}`} className="p-6">
                  <div className="flex gap-6">

                    <img
                      src={getImageUrl(item.product?.images?.[0]?.url)}
                      alt={item.product?.name}
                      className="w-28 h-28 rounded-xl object-cover"
                    />

                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">
                        {item.product?.name}
                      </h3>

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateCartItem(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>

                          <span>{item.quantity.toLocaleString('fa-IR')}</span>

                          <button
                            onClick={() =>
                              updateCartItem(item.id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>

                        <div>
                          {((item.subtotal || 0)).toLocaleString('fa-IR')} ریال
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 mt-3 text-sm"
                      >
                       سفارش حذف
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

        </div>

        <div>
          <GlassCard className="p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">
              خلاصه سفارش
            </h2>

            <div className="flex justify-between mb-4">
              <span>تعداد کل محصولات</span>
              <span>{combinedItemCount.toLocaleString('fa-IR')}</span>
            </div>

            <div className="flex justify-between text-xl font-bold">
              <span>جمع کل</span>
              <span>{(combinedTotal/10).toLocaleString('fa-IR')} ریال</span>
            </div>

            <GlassButton className="w-full mt-6"
              onClick={() => navigate('/products')}>
             بازگشت به فروشگاه
            </GlassButton>

            <GlassButton
              className="w-full mt-4"
              onClick={() => navigate('/checkout')}
            >
              تکمیل سفارش
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};