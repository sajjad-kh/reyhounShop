import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/notification/NotificationBell';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Menu,
    X,
    LogOut,
    Store,
    Truck,
    Star,
    CreditCard,
    MousePointerClick,
    Tag,
    ChevronDown,
    Gift,
    FileText,
    Warehouse,
} from 'lucide-react';

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: 'داشبورد',
        items: [
            { path: '/admin', label: 'داشبورد', icon: LayoutDashboard },
        ],
    },
    {
        title: 'مدیریت محصولات',
        items: [
            { path: '/admin/products', label: 'محصولات', icon: Package },
            { path: '/admin/inventory', label: 'انبار', icon: Warehouse },
            { path: '/admin/basalam', label: 'باسلام', icon: Store },
        ],
    },
    {
        title: 'مدیریت سفارشات',
        items: [
            { path: '/admin/orders', label: 'سفارش‌ها', icon: ShoppingCart },
            { path: '/admin/shipping', label: 'روش ارسال', icon: Truck },
        ],
    },
    {
        title: 'مدیریت کاربران',
        items: [
            { path: '/admin/users', label: 'کاربران', icon: Users },
            { path: '/admin/reviews', label: 'نظرات', icon: Star },
        ],
    },
    {
        title: 'مالی',
        items: [
            { path: '/admin/payment-accounts', label: 'حساب‌های پرداخت', icon: CreditCard },
            { path: '/admin/discounts', label: 'تخفیف‌ها', icon: Tag },
        ],
    },
    {
        title: 'وفاداری و ابزارها',
        items: [
            { path: '/admin/loyalty', label: 'وفاداری', icon: Gift },
            { path: '/admin/tours', label: 'راهنمای تور', icon: MousePointerClick },
            { path: '/admin/logs', label: 'لاگ‌ها', icon: FileText },
        ],
    },
];

const AdminLayout: React.FC = () => {
    const { state, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const getInitialCollapsed = (): Record<string, boolean> => {
        const state: Record<string, boolean> = {};
        for (const g of NAV_GROUPS) {
            const hasActive = g.items.some((item) => {
                if (item.path === '/admin') return location.pathname === '/admin';
                return location.pathname.startsWith(item.path);
            });
            state[g.title] = !hasActive;
        }
        return state;
    };

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(getInitialCollapsed);

    if (!state.user || state.user.role !== 'ADMIN') {
        return <Navigate to="/login" replace />;
    }

    const user = state.user;

    const isActive = (path: string) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    const toggleGroup = (title: string) => {
        setCollapsedGroups(() => {
            const next: Record<string, boolean> = {};
            for (const g of NAV_GROUPS) {
                next[g.title] = true;
            }
            next[title] = false;
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-gradient-primary">
            {/* Top Navigation Bar */}
            <nav dir="ltr" className="glass-navbar px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                            aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
                        >
                            {sidebarOpen ? (
                                <X className="w-6 h-6 text-text-primary" />
                            ) : (
                                <Menu className="w-6 h-6 text-text-primary" />
                            )}
                        </button>
                        <h1 className="text-xl font-bold text-text-primary">پنل مدیریت</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <NotificationBell isAdmin />
                        <div className="hidden md:flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-text-primary text-sm font-medium">{user.name}</p>
                                <p className="text-text-muted text-xs">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                            title="خروج"
                        >
                            <LogOut className="w-5 h-5 text-text-primary" />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="flex pt-20">
                {/* Sidebar */}
                <aside
                    className={`fixed lg:sticky top-20 right-0 h-[calc(100vh-5rem)] w-full lg:w-64 transition-transform duration-300 ease-out z-40 ${
                        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                    }`}
                >
                    <div className="h-full flex flex-col">
                        {/* Mobile Header */}
                        <div className="lg:hidden flex items-center justify-between px-4 py-3 mb-4">
                            <h2 className="text-base font-semibold text-white">منوی مدیریت</h2>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                aria-label="بستن منو"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 lg:p-4">
                            <GlassCard className="h-full p-0 lg:p-4 rounded-none lg:rounded-2xl border-0 lg:border">
                                <nav className="space-y-4">
                                    {NAV_GROUPS.map((group) => {
                                        const isCollapsed = collapsedGroups[group.title] ?? false;
                                        const hasActive = group.items.some((item) => isActive(item.path));

                                        return (
                                            <div key={group.title}>
                                                <button
                                                    onClick={() => toggleGroup(group.title)}
                                                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                                                        hasActive
                                                            ? 'text-accent-primary'
                                                            : 'text-text-muted hover:text-text-secondary'
                                                    }`}
                                                >
                                                    <span>{group.title}</span>
                                                    <ChevronDown
                                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                                            isCollapsed ? '' : 'rotate-180'
                                                        }`}
                                                    />
                                                </button>

                                                {!isCollapsed && (
                                                    <div className="mt-1 space-y-1">
                                                        {group.items.map((item) => {
                                                            const Icon = item.icon;
                                                            const active = isActive(item.path);

                                                            return (
                                                                <Link
                                                                    key={item.path}
                                                                    to={item.path}
                                                                    onClick={() => setSidebarOpen(false)}
                                                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                                                                        active
                                                                            ? 'bg-gradient-accent text-white shadow-glass'
                                                                            : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
                                                                    }`}
                                                                >
                                                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                                                    <span className="flex-1 text-right">{item.label}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </nav>

                                <div className="mt-4 pt-4 border-t border-border-glass-light">
                                    <Link
                                        to="/"
                                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary transition-all whitespace-nowrap"
                                    >
                                        <LogOut className="w-4 h-4 rotate-180" />
                                        <span className="flex-1 text-right">بازگشت به فروشگاه</span>
                                    </Link>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 min-h-[calc(100vh-5rem)] w-full overflow-x-hidden p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
