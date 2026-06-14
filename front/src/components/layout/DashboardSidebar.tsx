import React from 'react';
import { NavLink } from 'react-router-dom';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils';

// Icons
import { CreditCard } from "lucide-react";
const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const OrdersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6h8v-6M8 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-2" />
    </svg>
);

const HeartIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const LocationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const StarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const SettingsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);



interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
    badge?: string;
}

const sidebarItems: SidebarItem[] = [
    {
        id: 'profile',
        label: 'Profile',
        icon: <UserIcon />,
        path: '/dashboard/profile',
    },
    {
        id: 'orders',
        label: 'Orders',
        icon: <OrdersIcon />,
        path: '/dashboard/orders',
    },
    {
        id: 'addresses',
        label: 'Addresses',
        icon: <LocationIcon />,
        path: '/dashboard/addresses',
    },

    // // 🔥 FIXED ONLY THIS PART
    // {
    //     id: 'payments',
    //     label: 'Payment Accounts',
    //     icon: <CreditCard />,
    //     // path: '/dashboard/payment-accounts',
    //     path: '/dashboard/payment-accounts',
    // },
    
    {
        id: 'reviews',
        label: 'Review',
        icon: <StarIcon />,
        path: '/dashboard/reviews',
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: <SettingsIcon />,
        path: '/dashboard/settings',
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
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
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

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-semibold text-text-primary">
                            Dashboard
                        </h2>
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

                    {/* Navigation */}
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
                                        isActive && 'bg-glass-medium text-text-primary'
                                    )
                                }
                            >
                                <span className="mr-3">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-border-glass-light text-center text-xs text-text-muted">
                        <p>ReyhoonChap Store</p>
                        <p className="mt-1">v1.0.0</p>
                    </div>

                </GlassCard>
            </aside>
        </>
    );
};