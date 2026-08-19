import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils';
import { User, ShoppingBag, MapPin, Star, X, LogOut, Heart, Bookmark, Gift } from 'lucide-react';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
}

const baseItems: SidebarItem[] = [
    {
        id: 'profile',
        label: 'پروفایل',
        icon: User,
        path: '/dashboard/profile',
    },
    {
        id: 'orders',
        label: 'سفارش‌ها',
        icon: ShoppingBag,
        path: '/dashboard/orders',
    },
    {
        id: 'addresses',
        label: 'آدرس‌ها',
        icon: MapPin,
        path: '/dashboard/addresses',
    },
];

const extraItems: SidebarItem[] = [
    {
        id: 'wishlist',
        label: 'علاقه‌مندی‌ها',
        icon: Bookmark,
        path: '/dashboard/wishlist',
    },
    {
        id: 'loyalty',
        label: 'وفاداری',
        icon: Gift,
        path: '/dashboard/loyalty',
    },
];

const adminExtraItems: SidebarItem[] = [
    {
        id: 'reviews',
        label: 'نظرات',
        icon: Heart,
        path: '/dashboard/reviews',
    },
];

interface DashboardSidebarProps {
    className?: string;
    isMobile?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
    isAdmin?: boolean;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    className,
    isMobile = false,
    isOpen = false,
    onClose,
    isAdmin = false,
}) => {
    const location = useLocation();

    const sidebarItems = isAdmin
        ? [...baseItems, ...extraItems, ...adminExtraItems]
        : [...baseItems, ...extraItems];

    const isActive = (path: string) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(path);
    };

    return (
        <>
            <aside
                className={cn(
                    'fixed lg:sticky top-20 right-0 h-[calc(100vh-5rem)] w-full lg:w-64 transition-transform duration-300 ease-out z-40 bg-[#0A0F1C]/75 backdrop-blur-sm',
                    isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
                    className
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between px-4 py-3 mb-4">
                        <h2 className="text-base font-semibold text-white">
                            {isAdmin ? 'منوی مدیریت' : 'حساب کاربری'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            aria-label="بستن منو"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 lg:p-4">
                        <GlassCard className="h-full p-0 lg:p-4 rounded-none lg:rounded-2xl border-0 lg:border">
                            <nav className="space-y-1">
                                {sidebarItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);

                                    return (
                                        <NavLink
                                            key={item.id}
                                            to={item.path}
                                            onClick={onClose}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all',
                                                active
                                                    ? 'bg-gradient-accent text-white shadow-glass'
                                                    : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
                                            )}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                            <span className="flex-1 text-right">{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </nav>

                            <div className="mt-4 pt-4 border-t border-border-glass-light">
                                <NavLink
                                    to="/"
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary transition-all whitespace-nowrap"
                                >
                                    <LogOut className="w-4 h-4 rotate-180" />
                                    <span className="flex-1 text-right">بازگشت به فروشگاه</span>
                                </NavLink>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
        </>
    );
};
