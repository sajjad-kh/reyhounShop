/**
 * Basalam Order Integration Types
 * TypeScript interfaces and types for Basalam order management
 */

// ============================================================================
// Product Types
// ============================================================================

export interface BasalamProduct {
    id: number;
    title: string;
    price: number;
    image: string;
    stock: number;
    seller: {
        id: number;
        name: string;
    };
}

// ============================================================================
// Cart Types
// ============================================================================

export interface CartItem {
    productId: number;
    title: string;
    price: number;
    quantity: number;
    image: string;
    subtotal: number;
}

export interface CartStorage {
    items: Array<{
        productId: number;
        title: string;
        price: number;
        quantity: number;
        image: string;
    }>;
    updatedAt: string;
}

// ============================================================================
// Address and Contact Types
// ============================================================================

export interface Address {
    province: string;
    city: string;
    address: string;
    postalCode: string;
}

export interface ContactInfo {
    fullName: string;
    phone: string;
    email?: string;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus =
    | 'pending_payment'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export interface Order {
    id: number;
    orderNumber: string;
    date: string;
    totalAmount: number;
    status: OrderStatus;
    itemsCount: number;
}

export interface OrderItem {
    productId: number;
    title: string;
    price: number;
    quantity: number;
    image: string;
    seller: string;
}

export interface StatusChange {
    status: OrderStatus;
    timestamp: string;
    note?: string;
}

export interface PaymentInfo {
    amount: number;
    method: string;
    transactionId?: string;
    paidAt?: string;
}

export interface OrderDetails extends Order {
    items: OrderItem[];
    shippingAddress: Address;
    trackingCode?: string;
    statusHistory: StatusChange[];
    paymentInfo: PaymentInfo;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface OrderData {
    items: Array<{
        productId: number;
        quantity: number;
    }>;
    shippingAddress: Address;
    contactInfo: ContactInfo;
    callbackUrl: string;
}

export interface CreateOrderResponse {
    orderId: number;
    paymentUrl: string;
    expiresAt: string;
}

export interface OrderFilters {
    page?: number;
    limit?: number;
    status?: OrderStatus;
}

export interface OrderListResponse {
    orders: Order[];
    pagination: {
        total: number;
        page: number;
        limit: number;
    };
}

export interface VerifyPaymentRequest {
    transactionId: string;
    status: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    order: OrderDetails;
}

export interface SyncOrderResponse {
    order: OrderDetails;
    updated: boolean;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface PendingOrderStorage {
    orderId: number;
    orderNumber: string;
    createdAt: string;
    expiresAt: string;
}

// ============================================================================
// Error Types
// ============================================================================

export enum BasalamErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTH_ERROR = 'AUTH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
    ORDER_CREATION_FAILED = 'ORDER_CREATION_FAILED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
}

export class BasalamError extends Error {
    constructor(
        public type: BasalamErrorType,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'BasalamError';
    }
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ProductListProps {
    products: BasalamProduct[];
    onAddToCart: (productId: number, quantity: number) => void;
    isLoading: boolean;
}

export interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (itemId: number, quantity: number) => void;
    onRemove: (itemId: number) => void;
    onCheckout: () => void;
}

export interface CheckoutProps {
    cartItems: CartItem[];
    onSubmitOrder: (orderData: OrderData) => Promise<void>;
}

export interface OrderListProps {
    orders: Order[];
    onSelectOrder: (orderId: number) => void;
    onRefresh: () => void;
}

export interface OrderDetailsProps {
    orderId: number;
}
