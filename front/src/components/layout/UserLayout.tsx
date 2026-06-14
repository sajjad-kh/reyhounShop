import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useCart as useBasalamCart } from '../../hooks/basalam/useCart';
import { LogOut, ShoppingCart, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { STORAGE_KEYS } from '../../utils/constants';
import { secureStorage } from '../../utils/security';

export const UserLayout: React.FC = () => {
    const { state, logout } = useAuth();
    const { user } = state;
    const navigate = useNavigate();
    const [showCartDropdown, setShowCartDropdown] = useState(false);

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
        isError
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

    const ordersCount = data?.data?.length ?? 0;

    const hasOrders = ordersCount > 0;

    // =========================
    // OUTSIDE CLICK
    // =========================
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.cart-dropdown-container')) {
                setShowCartDropdown(false);
            }
        };

        if (showCartDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showCartDropdown]);

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

    return (
        <div className="min-h-screen bg-gradient-primary">

            {/* NAVBAR */}
            <nav  dir="rtl" className="glass-navbar fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="flex items-center justify-between">

                    <h1 className="text-xl font-bold text-text-primary">
                        فروشگاه من
                    </h1>

                    <div className="flex items-center space-x-4">

                        {user && (
                            <>
                                {/* ================= CART ================= */}
                                <div className="relative cart-dropdown-container">

                                    <button
                                        onClick={handleCartClick}
                                        className="relative p-2 text-text-primary hover:text-accent-primary"
                                    >
                                        <ShoppingCart className="w-6 h-6" />

                                        {totalCartCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-accent-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {totalCartCount > 99 ? '99+' : totalCartCount}
                                            </span>
                                        )}
                                    </button>

                                    {hasBothCarts && showCartDropdown && (
                                        <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg z-50">

                                            <button
                                                onClick={() => handleCartTypeSelect('internal')}
                                                className="w-full flex justify-between px-4 py-3 hover:bg-gray-100"
                                            >
                                                <span>📦 داخلی</span>
                                                <span>{internalCartCount}</span>
                                            </button>

                                            <button
                                                onClick={() => handleCartTypeSelect('basalam')}
                                                className="w-full flex justify-between px-4 py-3 hover:bg-gray-100"
                                            >
                                                <span>🏪 باسلام</span>
                                                <span>{basalamCartCount}</span>
                                            </button>

                                        </div>
                                    )}
                                </div>

                                {/* ================= ORDERS ICON ================= */}
                                <button
                                    onClick={() => navigate('/dashboard/orders')}
                                    className="relative p-2 text-text-primary hover:text-accent-primary"
                                    title="Orders"
                                >
                                    <Package className="w-6 h-6" />

                                    {isLoading ? null : (
                                        hasOrders && (
                                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {ordersCount > 99 ? '99+' : ordersCount}
                                            </span>
                                        )
                                    )}
                                </button>
                            </>
                        )}

                        {/* USER */}
                        {user ? (
                            <>
                                <div className="hidden md:flex items-center space-x-2">
                                    <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-white">
                                        {user.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.role}</p>
                                    </div>
                                </div>

                                <button onClick={logout}>
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => navigate('/login')}>
                                Login
                            </button>
                        )}

                    </div>
                </div>
            </nav>

            <main className="pt-20">
                <Outlet />
            </main>

        </div>
    );
};