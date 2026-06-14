import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { GlassCard } from '../../components/ui/GlassCard';
import { adminService } from '../../services/adminService';
import { AdminAnalytics } from '../../types/admin';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { getImageUrl } from '../../utils/constants';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AdminDashboard: React.FC = () => {
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await adminService.getDashboardAnalytics();
            console.log('Dashboard Analytics Response:', response.data);
            console.log('Stats:', response.data?.stats);
            setAnalytics(response.data);
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err);
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6">
                <div className="max-w-7xl mx-auto">
                    <GlassCard className="p-8 text-center">
                        <div className="glass-spinner w-12 h-12 mx-auto mb-4" />
                        <p className="text-text-secondary">Loading analytics...</p>
                    </GlassCard>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6">
                <div className="max-w-7xl mx-auto">
                    <GlassCard className="p-8 text-center">
                        <p className="text-error-color mb-4">{error || 'Failed to load analytics'}</p>
                        <button
                            onClick={fetchAnalytics}
                            className="glass-button px-6 py-2"
                        >
                            Retry
                        </button>
                    </GlassCard>
                </div>
            </div>
        );
    }

    // Safe data extraction with defaults and comprehensive null checks
    const stats = analytics?.stats ?? {
        totalRevenue: 0,
        revenueGrowth: 0,
        totalOrders: 0,
        ordersGrowth: 0,
        totalCustomers: 0,
        customersGrowth: 0,
        totalProducts: 0,
        basalamProducts: 0,
        internalProducts: 0,
        productsGrowth: 0,
    };

    // Ensure arrays are always arrays with safe fallbacks
    const salesData = Array.isArray(analytics?.salesData) ? analytics.salesData.filter(d => d != null) : [];
    const topProducts = Array.isArray(analytics?.topProducts) ? analytics.topProducts.filter(p => p != null) : [];
    const recentOrders = Array.isArray(analytics?.recentOrders) ? analytics.recentOrders.filter(o => o != null) : [];

    // Chart configurations with safe data handling and empty state support
    const salesChartData = {
        labels: salesData.length > 0 ? salesData.map((d) => d?.date ?? 'N/A') : ['No Data'],
        datasets: [
            {
                label: 'Revenue',
                data: salesData.length > 0 ? salesData.map((d) => Number(d?.revenue) || 0) : [0],
                borderColor: 'rgba(110, 142, 251, 1)',
                backgroundColor: 'rgba(110, 142, 251, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const ordersChartData = {
        labels: salesData.length > 0 ? salesData.map((d) => d?.date ?? 'N/A') : ['No Data'],
        datasets: [
            {
                label: 'Orders',
                data: salesData.length > 0 ? salesData.map((d) => Number(d?.orders) || 0) : [0],
                backgroundColor: 'rgba(167, 119, 224, 0.8)',
                borderColor: 'rgba(167, 119, 224, 1)',
                borderWidth: 1,
            },
        ],
    };

    const topProductsChartData = {
        labels: topProducts.length > 0 ? topProducts.map((p) => p?.name ?? 'Unknown') : ['No Data'],
        datasets: [
            {
                label: 'Revenue',
                data: topProducts.length > 0 ? topProducts.map((p) => Number(p?.revenue) || 0) : [0],
                backgroundColor: [
                    'rgba(110, 142, 251, 0.8)',
                    'rgba(167, 119, 224, 0.8)',
                    'rgba(0, 212, 160, 0.8)',
                    'rgba(255, 180, 0, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },
            y: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: 15,
                },
            },
        },
    };

    return (
        <div dir='rtl' className="min-h-screen bg-gradient-primary p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
                    <p className="text-text-secondary">Overview of your e-commerce platform</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <DollarSign className="w-6 h-6 text-success-color" />
                            </div>
                            <div className={`flex items-center text-sm ${(Number(stats?.revenueGrowth) || 0) >= 0 ? 'text-success-color' : 'text-error-color'}`}>
                                {(Number(stats?.revenueGrowth) || 0) >= 0 ? (
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 mr-1" />
                                )}
                                {Math.abs(Number(stats?.revenueGrowth) || 0).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-text-secondary text-sm mb-1">Total Revenue</h3>
                        <p className="text-2xl font-bold text-text-primary">
                            {(Number(stats?.totalRevenue) || 0).toLocaleString("fa-IR")}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <ShoppingCart className="w-6 h-6 text-accent-primary" />
                            </div>
                            <div className={`flex items-center text-sm ${(Number(stats?.ordersGrowth) || 0) >= 0 ? 'text-success-color' : 'text-error-color'}`}>
                                {(Number(stats?.ordersGrowth) || 0) >= 0 ? (
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 mr-1" />
                                )}
                                {Math.abs(Number(stats?.ordersGrowth) || 0).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-text-secondary text-sm mb-1">Total Orders</h3>
                        <p className="text-2xl font-bold text-text-primary">
                            {(Number(stats?.totalOrders) || 0).toLocaleString("fa-IR")}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <Users className="w-6 h-6 text-warning-color" />
                            </div>
                            <div className={`flex items-center text-sm ${(Number(stats?.customersGrowth) || 0) >= 0 ? 'text-success-color' : 'text-error-color'}`}>
                                {(Number(stats?.customersGrowth) || 0) >= 0 ? (
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 mr-1" />
                                )}
                                {Math.abs(Number(stats?.customersGrowth) || 0).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-text-secondary text-sm mb-1">Total Customers</h3>
                        <p className="text-2xl font-bold text-text-primary">
                            {(Number(stats?.totalCustomers) || 0).toLocaleString("fa-IR")}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <Package className="w-6 h-6 text-accent-secondary" />
                            </div>
                            <div className={`flex items-center text-sm ${(Number(stats?.productsGrowth) || 0) >= 0 ? 'text-success-color' : 'text-error-color'}`}>
                                {(Number(stats?.productsGrowth) || 0) >= 0 ? (
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 mr-1" />
                                )}
                                {Math.abs(Number(stats?.productsGrowth) || 0).toFixed(1)}%
                            </div>
                        </div>
                        <h3 className="text-text-secondary text-sm mb-1">Total Products</h3>
                        <p className="text-2xl font-bold text-text-primary">
                            {(Number(stats?.totalProducts) || 0).toLocaleString("fa-IR")}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                باسلام: {(Number((stats as any)?.basalamProducts) || 0).toLocaleString("fa-IR")}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                داخلی: {(Number((stats as any)?.internalProducts) || 0).toLocaleString("fa-IR")}
                            </span>
                        </div>
                    </GlassCard>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Chart */}
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-semibold text-text-primary mb-4">
                            Sales Overview
                        </h3>
                        <div className="h-64">
                            <Line data={salesChartData} options={chartOptions} />
                        </div>
                    </GlassCard>

                    {/* Orders Chart */}
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-semibold text-text-primary mb-4">
                            Orders Trend
                        </h3>
                        <div className="h-64">
                            <Bar data={ordersChartData} options={chartOptions} />
                        </div>
                    </GlassCard>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Products */}
                    <GlassCard className="p-6 lg:col-span-2">
                        <h3 className="text-xl font-semibold text-text-primary mb-4">
                            محصولات پرفروش
                        </h3>
                        {topProducts.length > 0 ? (
                            <div className="space-y-4">
                                {topProducts.map((product, index) => (
                                    <div
                                        key={product?.id ?? `product-${index}`}
                                        className="flex items-center justify-between p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition-all"
                                    >
                                        <div className="flex items-center space-x-4">
                                            {/* <span className="text-2xl font-bold text-text-muted">
                                                {index + 1 +" "} 
                                            </span> */}
                                            <img
                                                src={getImageUrl(product?.image)}
                                                alt={product?.name ?? 'Product'}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                            <div className='p-2'>
                                                <p className="text-text-primary font-medium">
                                                    {product?.name ?? 'Unknown Product'}
                                                </p>
                                                <p className="text-text-secondary text-sm">
                                                    {(Number(product?.sales) .toLocaleString('fa-IR'))|| 0} فروش
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-success-color font-semibold">
                                            {(Number(product?.revenue) || 0).toLocaleString('fa-IR')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-secondary">
                                No product data available
                            </div>
                        )}
                    </GlassCard>

                    {/* Top Products Doughnut */}
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-semibold text-text-primary mb-4">
                            Revenue Distribution
                        </h3>
                        <div className="h-64">
                            <Doughnut data={topProductsChartData} options={doughnutOptions} />
                        </div>
                    </GlassCard>
                </div>

                {/* Recent Orders */}
                <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold text-text-primary mb-4">
                        سفارشات اخیر
                    </h3>
                    {recentOrders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border-glass-light text-right">
                                        <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                            Order ID
                                        </th>
                                        <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                            Customer
                                        </th>
                                        <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                            Amount
                                        </th>
                                        <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                            Status
                                        </th>
                                        <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order, index) => (
                                        <tr
                                            key={order?.id ?? `order-${index}`}
                                            className="border-b border-border-glass-light hover:bg-glass-light transition-colors"
                                        >
                                            <td className="py-3 px-4 text-text-primary font-mono">
                                                {order?.trackingCode ?? 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-text-primary">
                                                {order?.customerName ?? 'Unknown'}
                                            </td>
                                            <td className="py-3 px-4 text-text-primary font-semibold">
                                                {(Number(order?.totalAmount) || 0).toLocaleString("fa-IR")}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${order?.status === 'DELIVERED'
                                                        ? 'bg-success-color/20 text-success-color'
                                                        : order?.status === 'CANCELLED'
                                                            ? 'bg-error-color/20 text-error-color'
                                                            : 'bg-warning-color/20 text-warning-color'
                                                        }`}
                                                >
                                                    {order?.status ?? 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-text-secondary text-sm">
                                                {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("fa-IR") : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-text-secondary">
                            No recent orders available
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
};

export default AdminDashboard;
