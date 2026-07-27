import React from 'react';
import { NavLink } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils';
import { User, ShoppingBag, MapPin, Star, Settings, Heart } from 'lucide-react';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
}

const sidebarItems: SidebarItem[] = [
    {
        id: 'profile',
        label: 'پروفایل',
        icon: <User className="w-5 h-5" />,
        path: '/dashboard/profile',
    },
    {
        id: 'orders',
        label: 'سفارش‌ها',
        icon: <ShoppingBag className="w-5 h-5" />,
        path: '/dashboard/orders',
    },
    {
        id: 'addresses',
        label: 'آدرس‌ها',
        icon: <MapPin className="w-5 h-5" />,
        path: '/dashboard/addresses',
    },
    {
        id: 'loyalty',
        label: 'وفاداری',
        icon: <Star className="w-5 h-5" />,
        path: '/dashboard/loyalty',
    },
    {
        id: 'reviews',
        label: 'نظرات',
        icon: <Heart className="w-5 h-5" />,
        path: '/dashboard/reviews',
    },
];

interface DashboardSidebarProps {
    className?: string;
    isMobile?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    className,
    isMobile = false,
    isOpen = true,
    onClose,
}) => {
    const handleItemClick = () => {
        if (isMobile && onClose) {
            onClose();
        }
    };

    return (
        <>
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed lg:sticky top-0 left-0 h-screen lg:h-auto z-50 lg:z-auto',
                    'transform transition-transform duration-300 ease-in-out',
                    isMobile
                        ? isOpen
                            ? 'translate-x-0'
                            : '-translate-x-full'
                        : 'translate-x-0',
                    'lg:translate-x-0',
                    className
                )}
            >
                <GlassCard className="h-full w-80 lg:w-64 p-6 rounded-none lg:rounded-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-semibold text-text-primary">حساب کاربری</h2>
                        {isMobile && (
                            <button
                                onClick={onClose}
                                className="p-2 text-text-muted hover:text-text-primary transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <nav className="space-y-2">
                        {sidebarItems.map((item) => (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                onClick={handleItemClick}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center px-4 py-3 rounded-xl transition-all duration-200',
                                        'text-text-secondary hover:text-text-primary',
                                        'hover:bg-glass-light hover:backdrop-blur-md',
                                        isActive && 'bg-gradient-accent text-white shadow-glass'
                                    )
                                }
                            >
                                <span className="ml-3">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="mt-8 pt-6 border-t border-border-glass-light">
                        <NavLink
                            to="/"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-glass-light hover:text-text-primary transition-all whitespace-nowrap"
                        >
                            <Settings className="w-4 h-4 rotate-180" />
                            <span className="font-medium">بازگشت به فروشگاه</span>
                        </NavLink>
                    </div>
                </GlassCard>
            </aside>
        </>
    );
};
