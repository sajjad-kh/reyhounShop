import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useCart as useBasalamCart } from '../../hooks/basalam/useCart';
import { LogOut, ShoppingCart, Package, Home, Search, Heart, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '../notification/NotificationBell';

import { STORAGE_KEYS } from '../../utils/constants';
import { secureStorage } from '../../utils/security';
import { TourLauncher } from '../tour/TourLauncher';

export const UserLayout: React.FC = () => {
    const { state, logout } = useAuth();
    const { user } = state;
    const navigate = useNavigate();
    const location = useLocation();
    const [showCartDropdown, setShowCartDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // =========================
    // CARTS
    // =========================
    const { state: cartState } = useCart();
    const internalCartCount = cartState.cart?.items?.length || 0;

    const { itemCount: basalamCartCount } = useBasalamCart();

    const totalCartCount = internalCartCount + basalamCartCount;
    const hasBothCarts = internalCartCount > 0 && basalamCartCount > 0;

    // =========================
    // ORDERS SUMMARY
    // =========================

    const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    const {
        data,
        isLoading,
    } = useQuery({
        queryKey: ['user-orders-summary'],

        queryFn: async () => {
            const res = await fetch("/api/v1/orders", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error?.message || "Error fetching orders");
            }

            return json;
        },

        enabled: !!user && !!token,

        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });

    const ordersCount = (data?.data?.filter((o: { status: string }) => o.status !== 'DELIVERED') ?? []).length;

    const hasOrders = ordersCount > 0;

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showMobileMenu]);

    // =========================
    // OUTSIDE CLICK
    // =========================
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.cart-dropdown-container')) {
                setShowCartDropdown(false);
            }
            if (!target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleCartClick = () => {
        if (hasBothCarts) {
            setShowCartDropdown(!showCartDropdown);
        } else {
            navigate('/cart');
        }
    };

    const handleCartTypeSelect = (type: 'internal' | 'basalam') => {
        setShowCartDropdown(false);
        navigate(`/cart?type=${type}`);
    };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="min-h-screen bg-gradient-primary">

            {/* ===== TOP NAVBAR ===== */}
            <nav dir="rtl" className="glass-navbar fixed top-0 left-0 right-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">

                    {/* Right: Logo + Name */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center shadow-lg shadow-accent-primary/20">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                            فروشگاه من
                        </h1>
                    </div>

                    {/* Left: Actions */}
                    <div className="flex items-center gap-1 sm:gap-2">

                        {user && (
                            <>
                                {/* CART */}
                                <div className="relative cart-dropdown-container">
                                    <button
                                        onClick={handleCartClick}
                                        className="relative p-2 sm:p-2.5 rounded-xl text-text-primary hover:text-accent-primary hover:bg-white/10 transition-all duration-200"
                                    >
                                        <ShoppingCart className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                                        {totalCartCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 bg-accent-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-md shadow-accent-primary/30">
                                                {totalCartCount > 99 ? '99+' : totalCartCount}
                                            </span>
                                        )}
                                    </button>

                                    {hasBothCarts && showCartDropdown && (
                                        <div className="absolute left-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                                            <div className="p-2">
                                                <button
                                                    onClick={() => handleCartTypeSelect('internal')}
                                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                                                >
                                                    <span className="text-sm text-text-primary">سبد داخلی</span>
                                                    <span className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded-full font-medium">{internalCartCount}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleCartTypeSelect('basalam')}
                                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                                                >
                                                    <span className="text-sm text-text-primary">سبد باسلام</span>
                                                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">{basalamCartCount}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ORDERS */}
                                <button
                                    onClick={() => navigate('/dashboard/orders')}
                                    className="relative p-2 sm:p-2.5 rounded-xl text-text-primary hover:text-accent-primary hover:bg-white/10 transition-all duration-200"
                                    title="سفارشات"
                                >
                                    <Package className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                                    {!isLoading && hasOrders && (
                                        <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-md shadow-emerald-500/30">
                                            {ordersCount > 99 ? '99+' : ordersCount}
                                        </span>
                                    )}
                                </button>

                                {/* NOTIFICATION */}
                                <NotificationBell />

                                {/* USER AVATAR (desktop only) */}
                                <div className="relative user-menu-container hidden sm:block">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-accent-primary/20">
                                            {user.name?.charAt(0)}
                                        </div>
                                        <span className="text-xs text-text-secondary max-w-[80px] truncate hidden lg:block">{user.name}</span>
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute left-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                                            <div className="p-3 border-b border-white/10">
                                                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                                                <p className="text-[11px] text-text-secondary mt-0.5">{user.role === 'ADMIN' ? 'مدیر سیستم' : 'کاربر'}</p>
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => { setShowUserMenu(false); navigate('/dashboard/orders'); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-white/10 transition-colors"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    سفارشات من
                                                </button>
                                                <button
                                                    onClick={() => { setShowUserMenu(false); navigate('/dashboard/addresses'); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-white/10 transition-colors"
                                                >
                                                    <Home className="w-4 h-4" />
                                                    آدرس‌ها
                                                </button>
                                                <button
                                                    onClick={() => { setShowUserMenu(false); navigate('/dashboard/wishlist'); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-white/10 transition-colors"
                                                >
                                                    <Heart className="w-4 h-4" />
                                                    علاقه‌مندی‌ها
                                                </button>
                                            </div>
                                            <div className="p-2 border-t border-white/10">
                                                <button
                                                    onClick={() => { setShowUserMenu(false); logout(); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    خروج
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* LOGOUT (mobile only - small icon) */}
                                <button
                                    onClick={logout}
                                    className="sm:hidden p-2 rounded-xl text-text-primary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                    title="خروج"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {!user && (
                            <button
                                onClick={() => navigate('/login')}
                                className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors shadow-md shadow-accent-primary/20"
                            >
                                ورود
                            </button>
                        )}

                        {/* Hamburger (mobile only) */}
                        <button
                            onClick={() => setShowMobileMenu(true)}
                            className="sm:hidden p-2 rounded-xl text-text-primary hover:text-accent-primary hover:bg-white/10 transition-all duration-200"
                            aria-label="منو"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-16 sm:pt-20 pb-20 sm:pb-0">
                <Outlet />
            </main>

            {/* ===== MOBILE MENU DRAWER ===== */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowMobileMenu(false)}
                        aria-hidden="true"
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full bg-[#0A0F1C] border-l border-white/[0.08] overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                            <h2 className="text-base font-semibold text-white">منو</h2>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                aria-label="بستن منو"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-2">
                            <MobileNavItem
                                icon={<Home className="w-5 h-5" />}
                                label="خانه"
                                active={isActive('/') && !isActive('/dashboard')}
                                onClick={() => { setShowMobileMenu(false); navigate('/'); }}
                            />
                            <MobileNavItem
                                icon={<Search className="w-5 h-5" />}
                                label="جستجو"
                                active={isActive('/products')}
                                onClick={() => { setShowMobileMenu(false); navigate('/products'); }}
                            />
                            <MobileNavItem
                                icon={<ShoppingCart className="w-5 h-5" />}
                                label="سبد خرید"
                                active={isActive('/cart')}
                                onClick={() => { setShowMobileMenu(false); handleCartClick(); }}
                            />
                            <MobileNavItem
                                icon={<Package className="w-5 h-5" />}
                                label="سفارشات"
                                active={isActive('/dashboard/orders')}
                                onClick={() => { setShowMobileMenu(false); navigate('/dashboard/orders'); }}
                            />
                            <MobileNavItem
                                icon={<Heart className="w-5 h-5" />}
                                label="علاقه‌مندی‌ها"
                                active={isActive('/dashboard/wishlist')}
                                onClick={() => { setShowMobileMenu(false); navigate('/dashboard/wishlist'); }}
                            />
                            {user && user.role === 'ADMIN' && (
                                <MobileNavItem
                                    icon={<Package className="w-5 h-5" />}
                                    label="پنل مدیریت"
                                    active={isActive('/admin')}
                                    onClick={() => { setShowMobileMenu(false); navigate('/admin'); }}
                                />
                            )}
                            {user && (
                                <MobileNavItem
                                    icon={<User className="w-5 h-5" />}
                                    label="خروج"
                                    onClick={() => { setShowMobileMenu(false); logout(); }}
                                />
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* ===== BOTTOM NAVIGATION (Mobile Only) ===== */}
            {user && (
                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10">
                    <div className="flex items-center justify-around py-2 px-2">
                        <button
                            onClick={() => navigate('/')}
                            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive('/') && !isActive('/dashboard') ? 'text-accent-primary' : 'text-text-secondary'}`}
                        >
                            <Home className="w-5 h-5" />
                            <span className="text-[10px] font-medium">خانه</span>
                        </button>

                        <button
                            onClick={() => navigate('/products')}
                            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive('/products') ? 'text-accent-primary' : 'text-text-secondary'}`}
                        >
                            <Search className="w-5 h-5" />
                            <span className="text-[10px] font-medium">جستجو</span>
                        </button>

                        <button
                            onClick={() => navigate('/cart')}
                            className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive('/cart') ? 'text-accent-primary' : 'text-text-secondary'}`}
                        >
                            <div className="relative">
                                <ShoppingCart className="w-5 h-5" />
                                {totalCartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-2 bg-accent-primary text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                                        {totalCartCount > 99 ? '99+' : totalCartCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">سبد</span>
                        </button>

                        <button
                            onClick={() => navigate('/dashboard/orders')}
                            className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive('/dashboard/orders') ? 'text-accent-primary' : 'text-text-secondary'}`}
                        >
                            <div className="relative">
                                <Package className="w-5 h-5" />
                                {!isLoading && hasOrders && (
                                    <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                                        {ordersCount > 99 ? '99+' : ordersCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">سفارشات</span>
                        </button>

                        <button
                            onClick={() => navigate('/dashboard/wishlist')}
                            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${isActive('/dashboard/wishlist') ? 'text-accent-primary' : 'text-text-secondary'}`}
                        >
                            <Heart className="w-5 h-5" />
                            <span className="text-[10px] font-medium">علاقه‌ها</span>
                        </button>
                    </div>
                </nav>
            )}

            {/* Global tour / guide launcher for all user sections */}
            <TourLauncher />

        </div>
    );
};

interface MobileNavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3.5 px-4 py-3 text-sm transition-colors ${
            active
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
        }`}
    >
        <span className={active ? 'text-accent-primary' : 'text-white/50'}>{icon}</span>
        <span className="flex-1 text-right">{label}</span>
    </button>
);

export default UserLayout;
