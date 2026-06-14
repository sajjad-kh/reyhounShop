import { useState, useEffect, forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils';
import { GlassInput } from './GlassInput';
import { GlassButton } from './GlassButton';
import { MobileMenu } from './MobileMenu';
import { useCart } from '../../hooks/useCart';
import { useCart as useBasalamCart } from '../../hooks/basalam/useCart';
import { useOrderStats } from '../../hooks/useOrderStats';
import { useNavigate } from 'react-router-dom';

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

export interface UserNavbarProps extends HTMLAttributes<HTMLElement> {
    user?: User | null;
    onSearch?: (query: string) => void;
    onCartClick?: () => void;
    onOrdersClick?: () => void;
    onProfileClick?: () => void;
    onLoginClick?: () => void;
    onLogoutClick?: () => void;
    onLogoClick?: () => void;
    scrollBlur?: boolean;
    className?: string;
}

const UserNavbar = forwardRef<HTMLElement, UserNavbarProps>(
    ({
        user,
        onSearch,
        onCartClick,
        onOrdersClick,
        onProfileClick,
        onLoginClick,
        onLogoutClick,
        onLogoClick,
        scrollBlur = true,
        className,
        ...props
    }, ref) => {
        const [isScrolled, setIsScrolled] = useState(false);
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
        const [searchQuery, setSearchQuery] = useState('');
        const [showUserMenu, setShowUserMenu] = useState(false);
        const [showCartDropdown, setShowCartDropdown] = useState(false);
        const navigate = useNavigate();

        // Get cart items count
        const { state: cartState } = useCart();
        const internalCartCount = cartState.cart?.items?.length || 0;

        // Get Basalam cart items count
        const { itemCount: basalamCartCount } = useBasalamCart();

        const totalCartCount = internalCartCount + basalamCartCount;
        const hasBothCarts = internalCartCount > 0 && basalamCartCount > 0;

        // Get order statistics
        const { totalOrders, pendingOrders, loading: statsLoading } = useOrderStats(user?.id);

        useEffect(() => {
            if (!scrollBlur) return;

            const handleScroll = () => {
                setIsScrolled(window.scrollY > 10);
            };

            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }, [scrollBlur]);

        // Close user menu when clicking outside
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                if (!target.closest('.user-menu-container')) {
                    setShowUserMenu(false);
                }
                if (!target.closest('.cart-dropdown-container')) {
                    setShowCartDropdown(false);
                }
            };

            if (showUserMenu || showCartDropdown) {
                document.addEventListener('click', handleClickOutside);
                return () => document.removeEventListener('click', handleClickOutside);
            }
        }, [showUserMenu, showCartDropdown]);

        const handleSearchSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (onSearch && searchQuery.trim()) {
                onSearch(searchQuery.trim());
            }
        };

        const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
        };

        const toggleMobileMenu = () => {
            setIsMobileMenuOpen(!isMobileMenuOpen);
        };

        const toggleUserMenu = () => {
            setShowUserMenu(!showUserMenu);
        };

        const handleCartClick = () => {
            if (hasBothCarts) {
                setShowCartDropdown(!showCartDropdown);
            } else if (onCartClick) {
                onCartClick();
            }
        };

        const handleCartTypeSelect = (type: 'internal' | 'basalam') => {
            setShowCartDropdown(false);
            navigate(`/cart?type=${type}`);
        };

        return (
            <nav
                ref={ref}
                className={cn(
                    'glass-navbar fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                    scrollBlur && isScrolled && 'backdrop-blur-[20px] bg-glass-heavy shadow-glass-hover',
                    !scrollBlur && 'backdrop-blur-[12px] bg-glass-medium',
                    className
                )}
                role="navigation"
                aria-label="Main navigation"
                {...props}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                        </div>

                        {/* Desktop Search */}
                        <div className="hidden md:flex flex-1 max-w-lg mx-8">
                            <form onSubmit={handleSearchSubmit} className="w-full">
                                <GlassInput
                                    type="search"
                                    placeholder="جستجوی محصولات..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    }
                                    iconPosition="left"
                                    className="w-full"
                                />
                            </form>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4 space-x-reverse">
                            {user && (
                                <>
                                    {/* Orders Button with Stats */}
                                    <button
                                        onClick={onOrdersClick}
                                        className="relative p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent group"
                                        aria-label={`سفارش‌ها - ${totalOrders} سفارش کل`}
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        {totalOrders > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                                {totalOrders > 99 ? '99+' : totalOrders}
                                            </span>
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                            <div className="text-center">
                                                <div className="font-semibold">{totalOrders} سفارش کل</div>
                                                {pendingOrders > 0 && (
                                                    <div className="text-xs text-gray-300 mt-1">
                                                        {pendingOrders} در انتظار
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                        </div>
                                    </button>

                                    {/* Cart Button with Dropdown */}
                                    <div className="relative cart-dropdown-container">
                                        <button
                                            onClick={handleCartClick}
                                            className="relative p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent group"
                                            aria-label={`سبد خرید با ${totalCartCount} محصول`}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                            </svg>
                                            11
                                            {totalCartCount > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-accent-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
                                                    {totalCartCount > 99 ? '99+' : totalCartCount}
                                                </span>
                                            )}

                                            {/* Tooltip - only show if not both carts */}
                                            {!hasBothCarts && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                    {totalCartCount > 0 ? `${totalCartCount} محصول در سبد` : 'سبد خرید خالی است'}
                                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                                </div>
                                            )}
                                        </button>

                                        {/* Cart Type Dropdown */}
                                        {hasBothCarts && showCartDropdown && (
                                            <div className="absolute left-0 mt-2 w-64 glass-card bg-glass-heavy border border-border-glass-light rounded-xl shadow-glass-hover overflow-hidden z-50 animate-fade-in">
                                                <div className="p-2">
                                                    <button
                                                        onClick={() => handleCartTypeSelect('internal')}
                                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-glass-light transition-colors text-right"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">📦</span>
                                                            <div>
                                                                <div className="text-text-primary font-medium">محصولات داخلی</div>
                                                                <div className="text-text-muted text-sm">{internalCartCount} محصول</div>
                                                            </div>
                                                        </div>
                                                        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={() => handleCartTypeSelect('basalam')}
                                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-glass-light transition-colors text-right mt-1"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">🏪</span>
                                                            <div>
                                                                <div className="text-text-primary font-medium">محصولات بسلام</div>
                                                                <div className="text-text-muted text-sm">{basalamCartCount} محصول</div>
                                                            </div>
                                                        </div>
                                                        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* User Menu */}
                            {user ? (
                                <div className="relative user-menu-container">
                                    <button
                                        onClick={toggleUserMenu}
                                        className="flex items-center space-x-2 space-x-reverse p-2 rounded-xl hover:bg-glass-light transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                        aria-label="منوی کاربری"
                                        aria-expanded={showUserMenu}
                                    >
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-white font-medium text-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-text-primary font-medium">{user.name}</span>
                                        <svg
                                            className={cn(
                                                "w-4 h-4 text-text-secondary transition-transform duration-200",
                                                showUserMenu && "rotate-180"
                                            )}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showUserMenu && (
                                        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-glass-hover backdrop-blur-xl border border-glass-border overflow-hidden z-50">
                                            {/* User Info */}
                                            <div className="px-4 py-3 border-b border-glass-border bg-glass-light">
                                                <p className="text-sm font-medium text-text-primary">{user.name}</p>
                                                <p className="text-xs text-text-secondary mt-1">{user.email}</p>
                                            </div>

                                            {/* Stats */}
                                            {!statsLoading && (
                                                <div className="px-4 py-3 border-b border-glass-border">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-accent-primary">{totalOrders}</div>
                                                            <div className="text-xs text-text-secondary mt-1">کل سفارش‌ها</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-blue-500">{totalCartCount}</div>
                                                            <div className="text-xs text-text-secondary mt-1">در سبد خرید</div>
                                                        </div>
                                                    </div>
                                                    {pendingOrders > 0 && (
                                                        <div className="mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                                            <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                                                                {pendingOrders} سفارش در انتظار پرداخت
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Menu Items */}
                                            <div className="py-2">
                                                <button
                                                    onClick={() => {
                                                        onProfileClick?.();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-right text-sm text-text-primary hover:bg-glass-light transition-colors duration-200 flex items-center space-x-3 space-x-reverse"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>پروفایل من</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onOrdersClick?.();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-right text-sm text-text-primary hover:bg-glass-light transition-colors duration-200 flex items-center space-x-3 space-x-reverse"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    <span>سفارش‌های من</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onCartClick?.();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-right text-sm text-text-primary hover:bg-glass-light transition-colors duration-200 flex items-center space-x-3 space-x-reverse"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                                    </svg>
                                                    <span>سبد خرید</span>
                                                </button>
                                                <div className="border-t border-glass-border my-2"></div>
                                                <button
                                                    onClick={() => {
                                                        onLogoutClick?.();
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 flex items-center space-x-3 space-x-reverse"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    <span>خروج</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <GlassButton
                                    onClick={onLoginClick}
                                    variant="accent"
                                    size="sm"
                                >
                                    ورود / ثبت‌نام
                                </GlassButton>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={toggleMobileMenu}
                                className="p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                aria-label="منوی موبایل"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    <MobileMenu
                        isOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                        position="right"
                    >
                        <div className="px-4 space-y-4">
                            {/* Mobile Search */}
                            <form onSubmit={handleSearchSubmit}>
                                <GlassInput
                                    type="search"
                                    placeholder="جستجوی محصولات..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    icon={
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    }
                                    iconPosition="left"
                                    size="sm"
                                />
                            </form>

                            {user && (
                                <>
                                    {/* Mobile User Info */}
                                    <div className="p-4 bg-glass-light rounded-xl">
                                        <div className="flex items-center space-x-3 space-x-reverse mb-3">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center text-white font-medium text-lg">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-text-primary">{user.name}</p>
                                                <p className="text-sm text-text-secondary">{user.email}</p>
                                            </div>
                                        </div>

                                        {/* Mobile Stats */}
                                        {!statsLoading && (
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                                                    <div className="text-xl font-bold text-accent-primary">{totalOrders}</div>
                                                    <div className="text-xs text-text-secondary">سفارش‌ها</div>
                                                </div>
                                                <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                                                    <div className="text-xl font-bold text-blue-500">{totalCartCount}</div>
                                                    <div className="text-xs text-text-secondary">سبد خرید</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Orders */}
                                    <button
                                        onClick={() => {
                                            onOrdersClick?.();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full p-4 text-text-primary hover:bg-glass-light rounded-xl transition-all duration-200 active:scale-95"
                                    >
                                        <div className="flex items-center space-x-3 space-x-reverse">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <span className="text-lg">سفارش‌های من</span>
                                        </div>
                                        {totalOrders > 0 && (
                                            <span className="bg-blue-500 text-white text-sm rounded-full px-3 py-1 font-medium">
                                                {totalOrders}
                                            </span>
                                        )}
                                    </button>

                                    {/* Mobile Cart */}
                                    <button
                                        onClick={() => {
                                            onCartClick?.();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full p-4 text-text-primary hover:bg-glass-light rounded-xl transition-all duration-200 active:scale-95"
                                    >
                                        <div className="flex items-center space-x-3 space-x-reverse">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                            </svg>
                                            <span className="text-lg">سبد خرید</span>
                                        </div>
                                        {totalCartCount > 0 && (
                                            <span className="bg-accent-primary text-white text-sm rounded-full px-3 py-1 font-medium">
                                                {totalCartCount}
                                            </span>
                                        )}
                                    </button>
                                </>
                            )}

                            {/* Mobile Login/Profile */}
                            {!user && (
                                <div className="pt-2">
                                    <GlassButton
                                        onClick={() => {
                                            onLoginClick?.();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        variant="accent"
                                        className="w-full text-lg py-4"
                                    >
                                        ورود / ثبت‌نام
                                    </GlassButton>
                                </div>
                            )}
                        </div>
                    </MobileMenu>
                </div>
            </nav>
        );
    }
);

UserNavbar.displayName = 'UserNavbar';

export { UserNavbar };
