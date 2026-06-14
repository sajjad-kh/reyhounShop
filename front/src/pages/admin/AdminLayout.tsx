import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Menu,
    X,
    LogOut,
    Store,
    Truck ,Star,CreditCard 
} from 'lucide-react';


// const PaymentIcon = () => (
//     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
//     </svg>
// );


const AdminLayout: React.FC = () => {
    const { state, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Check if user is admin
    if (!state.user || state.user.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    const user = state.user;

    const navItems = [
        {
            path: '/admin',
            label: 'Dashboard',
            icon: LayoutDashboard,
        },
        {
            path: '/admin/products',
            label: 'Products',
            icon: Package,
        },
        {
            path: '/admin/orders',
            label: 'Orders',
            icon: ShoppingCart,
        },
        {
            path: '/admin/users',
            label: 'Users',
            icon: Users,
        },
        {
            path: '/admin/basalam',
            label: 'Basalam',
            icon: Store,
        },
        {
            path: '/admin/shipping',
            label: 'Shipping Methods',
            icon: Truck,
        },
        {
            path: '/admin/reviews',
            label: 'Review',
            icon: Star,
        },
        {
            path: '/admin/payment-accounts',
            label: 'Payment Accounts',
            icon: CreditCard,
        },
    ];

    const isActive = (path: string) => {
        if (path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gradient-primary">
            {/* Top Navigation Bar */}
            <nav className="glass-navbar fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                        >
                            {sidebarOpen ? (
                                <X className="w-6 h-6 text-text-primary" />
                            ) : (
                                <Menu className="w-6 h-6 text-text-primary" />
                            )}
                        </button>
                        <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-text-primary text-sm font-medium">
                                    {user.name}
                                </p>
                                <p className="text-text-muted text-xs">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-text-primary" />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="flex pt-20">
                {/* Sidebar */}
                <aside
                    className={`fixed lg:sticky top-20 left-0 h-[calc(100vh-5rem)] w-64 transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                        }`}
                >
                    <div className="h-full p-6">
                        <GlassCard className="h-full p-4">
                            <nav className="space-y-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active
                                                ? 'bg-gradient-accent text-white shadow-glass'
                                                : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-4 pt-8 border-t border-border-glass-light">
                                <Link
                                    to="/"
                                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-glass-light hover:text-text-primary transition-all"
                                >
                                    <span className="font-medium">← Back to Store</span>
                                </Link>
                            </div>
                        </GlassCard>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 min-h-[calc(100vh-5rem)] w-full overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
