import { useState, useEffect, forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils';
import { GlassInput } from './GlassInput';
import { GlassButton } from './GlassButton';
import { MobileMenu } from './MobileMenu';

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
}

export interface GlassNavbarProps extends HTMLAttributes<HTMLElement> {
    user?: User | null;
    cartItemCount?: number;
    onSearch?: (query: string) => void;
    onCartClick?: () => void;
    onProfileClick?: () => void;
    onLoginClick?: () => void;
    onLogoClick?: () => void;
    scrollBlur?: boolean;
    className?: string;
}

const GlassNavbar = forwardRef<HTMLElement, GlassNavbarProps>(
    ({
        user,
        cartItemCount = 0,
        onSearch,
        onCartClick,
        onProfileClick,
        onLoginClick,
        onLogoClick,
        scrollBlur = true,
        className,
        ...props
    }, ref) => {
        const [isScrolled, setIsScrolled] = useState(false);
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
        const [searchQuery, setSearchQuery] = useState('');

        useEffect(() => {
            if (!scrollBlur) return;

            const handleScroll = () => {
                setIsScrolled(window.scrollY > 10);
            };

            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }, [scrollBlur]);

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
                                    placeholder="Search products..."
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
                        <div className="hidden md:flex items-center space-x-4">
                            {/* Cart Button */}
                            <button
                                onClick={onCartClick}
                                className="relative p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                aria-label={`Shopping cart with ${cartItemCount} items`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                </svg>
                                {cartItemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-accent-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                        {cartItemCount > 99 ? '99+' : cartItemCount}
                                    </span>
                                )}
                            </button>

                            {/* User Menu */}
                            {user ? (
                                <button
                                    onClick={onProfileClick}
                                    className="flex items-center space-x-2 p-2 rounded-xl hover:bg-glass-light transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                    aria-label="User profile menu"
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
                                </button>
                            ) : (
                                <GlassButton
                                    onClick={onLoginClick}
                                    variant="accent"
                                    size="sm"
                                >
                                    Sign In
                                </GlassButton>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={toggleMobileMenu}
                                className="p-2 text-text-primary hover:text-accent-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                aria-label="Toggle mobile menu"
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
                                    placeholder="Search products..."
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

                            {/* Mobile Cart */}
                            <button
                                onClick={() => {
                                    onCartClick?.();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="flex items-center justify-between w-full p-4 text-text-primary hover:bg-glass-light rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                            >
                                <div className="flex items-center space-x-3">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                                    </svg>
                                    <span className="text-lg">Shopping Cart</span>
                                </div>
                                {cartItemCount > 0 && (
                                    <span className="bg-accent-primary text-white text-sm rounded-full px-3 py-1 font-medium">
                                        {cartItemCount}
                                    </span>
                                )}
                            </button>

                            {/* Mobile User Menu */}
                            {user ? (
                                <button
                                    onClick={() => {
                                        onProfileClick?.();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center space-x-3 w-full p-4 text-text-primary hover:bg-glass-light rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                >
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-medium">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-lg font-medium">{user.name}</span>
                                </button>
                            ) : (
                                <div className="pt-2">
                                    <GlassButton
                                        onClick={() => {
                                            onLoginClick?.();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        variant="accent"
                                        className="w-full text-lg py-4"
                                    >
                                        Sign In
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

GlassNavbar.displayName = 'GlassNavbar';

export { GlassNavbar };