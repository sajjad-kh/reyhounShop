import React, { useState } from 'react';
import { CartItem as CartItemType } from '../../types/cart';
import { useCart } from '../../hooks/useCart';
import { getImageUrl } from '../../utils/constants';

interface CartItemProps {
    item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
    const { updateCartItem, removeFromCart } = useCart();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleQuantityChange = async (newQuantity: number) => {
        if (newQuantity < 1 || newQuantity > item.product.stock) return;

        try {
            setIsUpdating(true);
            await updateCartItem(item.id, newQuantity);
        } catch (error) {
            console.error('Failed to update quantity:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemove = async () => {
        try {
            setIsRemoving(true);
            await removeFromCart(item.id);
        } catch (error) {
            console.error('Failed to remove item:', error);
            setIsRemoving(false);
        }
    };

    return (
        <div
            className={`glass-card p-4 flex gap-4 transition-all duration-300 ${isRemoving ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                }`}
        >
            {/* Product Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                <img
                    src={getImageUrl(item.product.images?.[0]?.url)}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate mb-1">
                    {item.product.name}
                </h3>
                <p className="text-white/60 text-sm mb-2">
                    {item.product.effectivePrice.toLocaleString('fa-IR')} ریال هر عدد
                </p>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleQuantityChange(item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1}
                        className="w-8 h-8 rounded-lg glass-button flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>

                    <span className="w-12 text-center text-white font-medium">
                        {isUpdating ? '...' : item.quantity}
                    </span>

                    <button
                        onClick={() => handleQuantityChange(item.quantity + 1)}
                        disabled={isUpdating || item.quantity >= item.product.stock}
                        className="w-8 h-8 rounded-lg glass-button flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {item.quantity >= item.product.stock && (
                    <p className="text-xs text-yellow-400 mt-1">Max stock reached</p>
                )}
            </div>

            {/* Price and Remove */}
            <div className="flex flex-col items-end justify-between">
                <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Remove item"
                >
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                </button>

                <div className="text-right">
                    <p className="text-white font-bold text-lg">
                        ${item.subtotal.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );
};
