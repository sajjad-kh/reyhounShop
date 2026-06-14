import React, { useEffect, useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { adminService } from '../../services/adminService';
import { ShippingMethodStats } from '../../types/shipping';
import { Package, TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ShippingStatsSkeleton } from '../../components/shipping/ShippingStatsSkeleton';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface ShippingStatsResponse {
    stats: ShippingMethodStats[];
    lastSyncTime: string | null;
    totalOrders: number;
}

const ShippingMethodStatsPage: React.FC = () => {
    const [statsData, setStatsData] = useState<ShippingStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async (dateRange?: { startDate?: string; endDate?: string }) => {
        try {
            setLoading(true);
            setError(null);
            const response = await adminService.getShippingMethodStats(dateRange);
            console.log('Shipping Stats Response:', response.data);
            setStatsData(response.data);
        } catch (err: any) {
            console.error('Failed to fetch shipping stats:', err);
            setError(err.message || 'خطا در بارگذاری آمار روش‌های ارسال');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await adminService.syncShippingMethods();
            addToast({ message: 'روش‌های ارسال با موفقیت همگام‌سازی شد', type: 'success' });
            // Refresh stats after sync
            await fetchStats();
        } catch (err: any) {
            console.error('Failed to sync shipping methods:', err);
            addToast({ message: err.message || 'خطا در همگام‌سازی روش‌های ارسال', type: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    const handleApplyDateFilter = () => {
        if (startDate && endDate) {
            fetchStats({ startDate, endDate });
        } else if (!startDate && !endDate) {
            fetchStats();
        } else {
            addToast({ message: 'لطفا هر دو تاریخ را انتخاب کنید', type: 'error' });
        }
    };

    const handleClearFilter = () => {
        setStartDate('');
        setEndDate('');
        fetchStats();
    };

    if (loading && !statsData) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6" dir="rtl">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div className="space-y-2 animate-pulse">
                            <div className="h-8 bg-white/10 rounded w-48" />
                            <div className="h-4 bg-white/10 rounded w-64" />
                        </div>
                        <div className="h-10 bg-white/10 rounded w-40 animate-pulse" />
                    </div>

                    {/* Stats Skeleton */}
                    <ShippingStatsSkeleton />
                </div>
            </div>
        );
    }

    if (error && !statsData) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6" dir="rtl">
                <div className="max-w-7xl mx-auto">
                    <GlassCard className="p-8 text-center">
                        <p className="text-error-color mb-4">{error}</p>
                        <GlassButton onClick={() => fetchStats()}>تلاش مجدد</GlassButton>
                    </GlassCard>
                </div>
            </div>
        );
    }

    const stats = statsData?.stats || [];
    const lastSyncTime = statsData?.lastSyncTime;
    const totalOrders = statsData?.totalOrders || 0;

    // Chart data
    const usageChartData = {
        labels: stats.length > 0 ? stats.map((s) => s.shippingMethodName) : ['بدون داده'],
        datasets: [
            {
                label: 'درصد استفاده',
                data: stats.length > 0 ? stats.map((s) => s.usagePercentage) : [0],
                backgroundColor: [
                    'rgba(110, 142, 251, 0.8)',
                    'rgba(167, 119, 224, 0.8)',
                    'rgba(0, 212, 160, 0.8)',
                    'rgba(255, 180, 0, 0.8)',
                    'rgba(255, 107, 107, 0.8)',
                    'rgba(52, 211, 153, 0.8)',
                ],
                borderWidth: 0,
            },
        ],
    };

    const revenueChartData = {
        labels: stats.length > 0 ? stats.map((s) => s.shippingMethodName) : ['بدون داده'],
        datasets: [
            {
                label: 'درآمد (ریال)',
                data: stats.length > 0 ? stats.map((s) => s.totalRevenue) : [0],
                backgroundColor: 'rgba(110, 142, 251, 0.8)',
                borderColor: 'rgba(110, 142, 251, 1)',
                borderWidth: 1,
            },
        ],
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
                    font: {
                        family: 'Vazirmatn, sans-serif',
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return `${context.label}: ${context.parsed.toFixed(1)}%`;
                    },
                },
            },
        },
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    font: {
                        family: 'Vazirmatn, sans-serif',
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    font: {
                        family: 'Vazirmatn, sans-serif',
                    },
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

    return (
        <div className="min-h-screen bg-gradient-primary p-6" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
                            آمار روش‌های ارسال
                        </h1>
                        <p className="text-text-secondary text-sm md:text-base">
                            مشاهده و تحلیل استفاده از روش‌های ارسال
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <GlassButton
                            variant="accent"
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                            <span>{syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی'}</span>
                        </GlassButton>
                    </div>
                </div>

                {/* Last Sync Info */}
                {lastSyncTime && (
                    <GlassCard className="p-4">
                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>آخرین همگام‌سازی:</span>
                            <span className="text-text-primary font-medium">
                                {new Date(lastSyncTime).toLocaleString('fa-IR')}
                            </span>
                        </div>
                    </GlassCard>
                )}

                {/* Date Range Filter */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                        فیلتر بازه زمانی
                    </h3>
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-text-secondary text-sm mb-2">
                                از تاریخ
                            </label>
                            <GlassInput
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-text-secondary text-sm mb-2">
                                تا تاریخ
                            </label>
                            <GlassInput
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex gap-2">
                            <GlassButton
                                variant="primary"
                                onClick={handleApplyDateFilter}
                                disabled={loading}
                            >
                                اعمال فیلتر
                            </GlassButton>
                            <GlassButton
                                variant="secondary"
                                onClick={handleClearFilter}
                                disabled={loading}
                            >
                                پاک کردن
                            </GlassButton>
                        </div>
                    </div>
                </GlassCard>

                {/* Summary Card */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-glass-medium">
                            <Package className="w-8 h-8 text-accent-primary" />
                        </div>
                        <div>
                            <h3 className="text-text-secondary text-sm mb-1">
                                تعداد کل سفارشات
                            </h3>
                            <p className="text-3xl font-bold text-text-primary">
                                {totalOrders.toLocaleString('fa-IR')}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Charts */}
                {stats.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Usage Percentage Chart */}
                            <GlassCard className="p-6">
                                <h3 className="text-xl font-semibold text-text-primary mb-4">
                                    توزیع استفاده از روش‌های ارسال
                                </h3>
                                <div className="h-80">
                                    <Doughnut data={usageChartData} options={doughnutOptions} />
                                </div>
                            </GlassCard>

                            {/* Revenue Chart */}
                            <GlassCard className="p-6">
                                <h3 className="text-xl font-semibold text-text-primary mb-4">
                                    درآمد به تفکیک روش ارسال
                                </h3>
                                <div className="h-80">
                                    <Bar data={revenueChartData} options={barOptions} />
                                </div>
                            </GlassCard>
                        </div>

                        {/* Detailed Stats Table */}
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-semibold text-text-primary mb-4">
                                جزئیات آماری
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border-glass-light">
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                رتبه
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                روش ارسال
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                تعداد استفاده
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                درصد استفاده
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                درآمد (ریال)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.map((stat, index) => (
                                            <tr
                                                key={stat.shippingMethodId}
                                                className="border-b border-border-glass-light hover:bg-glass-light transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {index === 0 && (
                                                            <TrendingUp className="w-4 h-4 text-success-color" />
                                                        )}
                                                        <span className="text-text-primary font-semibold">
                                                            #{index + 1}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-text-primary font-medium">
                                                    {stat.shippingMethodName}
                                                </td>
                                                <td className="py-3 px-4 text-center text-text-primary">
                                                    {stat.usageCount.toLocaleString('fa-IR')}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-primary/20 text-accent-primary font-medium">
                                                        {stat.usagePercentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-success-color font-semibold">
                                                    {stat.totalRevenue.toLocaleString('fa-IR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </>
                ) : (
                    <GlassCard className="p-8 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-text-muted" />
                        <p className="text-text-secondary text-lg">
                            هنوز داده‌ای برای نمایش وجود ندارد
                        </p>
                        <p className="text-text-muted text-sm mt-2">
                            پس از ثبت سفارشات، آمار روش‌های ارسال در اینجا نمایش داده می‌شود
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};

export default ShippingMethodStatsPage;
