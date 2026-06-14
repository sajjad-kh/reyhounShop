// Cart related types
import { Product } from './product';

export interface CartItem {
    id: number;
    product: Product;
    quantity: number;
    subtotal: number;
    addedAt: string;
}

export interface CartState {
    items: CartItem[];
    totalItems: number;
    totalAmount: number;
    discountCode?: string;
    discountAmount: number;
    shippingCost: number;
    finalAmount: number;
}

export interface AddToCartRequest {
    productId: number;
    quantity: number;
}

export interface UpdateCartItemRequest {
    cartItemId: number;
    quantity: number;
}

export interface ApplyDiscountRequest {
    code: string;
}