// Admin related types
import { OrderStatus, PaymentStatus } from '../utils/constants';

export interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    basalamProducts: number;
    internalProducts: number;
    revenueGrowth: number;
    ordersGrowth: number;
    customersGrowth: number;
    productsGrowth: number;
}

export interface SalesData {
    date: string;
    revenue: number;
    orders: number;
}

export interface TopProduct {
    id: number;
    name: string;
    sales: number;
    revenue: number;
    image: string;
}

export interface RecentOrder {
    id: number;
    trackingCode: string;
    customerName: string;
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: string;
}

export interface AdminAnalytics {
    stats: DashboardStats;
    salesData: SalesData[];
    topProducts: TopProduct[];
    recentOrders: RecentOrder[];
}
