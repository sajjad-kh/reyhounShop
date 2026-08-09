// Order related types
import { Product } from './product';
import { Address } from './auth';
import { OrderStatus, PaymentStatus } from '../utils/constants';

export interface Order {
    id: number;
    orderCode?: string | null;
    trackingCode: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;

    totalPrice: number;
    shippingCost: number;
    discountAmount: number;
    loyaltyPointsUsed?: number;
    loyaltyDiscount?: number;

    finalAmount?: number; // frontend computed

    items: OrderItem[];

    user?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };

    reviewedProductIds?: number[];

    addressId: number; // ✅ مهم‌ترین fix

    paymentProofUrl?: string | null;
    paymentRejectionReason?: string | null;

    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    id: number;
    product: Product;
    quantity: number;
    price: number;

    subtotal?: number; // frontend calc
}

export interface CreateOrderItem {
    productId: number;
    quantity: number;
}

export interface CreateOrderRequest {
    addressId: number;
    shippingMethodId: number;
    discountCode?: string;
    items: CreateOrderItem[];
}

export interface OrderTrackingInfo {
    trackingCode: string;
    status: OrderStatus;
    statusHistory: OrderStatusHistory[];
    estimatedDelivery?: string;
}

export interface OrderStatusHistory {
    status: OrderStatus;
    timestamp: string;
    description: string;
}

export type { OrderStatus, PaymentStatus };
