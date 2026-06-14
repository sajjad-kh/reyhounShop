import { RouteObject } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, AdminRoute } from '../components/auth';
import {
    HomePage,
    LoginPage,
    RegisterPage,
    UserDashboard,
    ProductListingPage,
    ProductDetailPage,
    SearchResultsPage,
    ForgetPasswordPage,
} from '../pages';
import { ProfilePage, AddressesPage, WishlistPage, LoyaltyPage,PaymentAccountsPage} from '../pages/dashboard';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CartPage } from '../pages/CartPage';
import { PaymentVerifyPage } from '../pages/PaymentVerifyPage';
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { ReviewsPage } from '../pages/ReviewPage';
import AdminLayout from '../pages/admin/AdminLayout';
import {
    AdminDashboard,
    ProductManagement,
    OrderManagement,
    UserManagement,
} from '../pages/admin';
import BasalamPage from '../pages/admin/BasalamPage';
import { BasalamCheckoutPage } from '../pages/basalam/BasalamCheckoutPage';
import { BasalamPaymentCallbackPage } from '../pages/basalam/BasalamPaymentCallbackPage';
import { BasalamOrderListPage } from '../pages/basalam/BasalamOrderListPage';
import { BasalamOrderDetailsPage } from '../pages/basalam/BasalamOrderDetailsPage';
import { BasalamCartPage } from '../pages/basalam/BasalamCartPage';
import UserNavbarExample from '../pages/UserNavbarExample';
import { UserLayout } from '../components/layout';
import ReviewsManagement from  '@/pages/admin/AdminReview'
import ShippingMethodsManagement from '@/pages/admin/ShippingMethodStats';

import { BaleCallbackPage } from '../pages/BaleCallbackPage'; 


// Public routes (accessible to everyone) - wrapped in UserLayout for navbar
export const publicRoutes: RouteObject[] = [
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <UserLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'products',
                element: <ProductListingPage />,
            },
            {
                path: 'products/:id',
                element: <ProductDetailPage />,
            },
            {
                path: 'search',
                element: <SearchResultsPage />,
            },
            {
                path: 'navbar-example',
                element: <UserNavbarExample />,
            },
        ],
    },
];

// Auth routes (redirect authenticated users)
export const authRoutes: RouteObject[] = [
    {
        path: '/login',
        element: (
            <PublicRoute restricted>
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: '/register',
        element: (
            <PublicRoute restricted>
                <RegisterPage />
            </PublicRoute>
        ),
    },
    {
        path: '/forgetPasswordPage',
        element: (
            <PublicRoute restricted>
                <ForgetPasswordPage/>
            </PublicRoute>
        ),
    },
    {
        path: '/reset-password',
        element: (
            <PublicRoute restricted>
                <div>Reset Password Page (TODO)</div>
            </PublicRoute>
        ),
    },
    {
        path: '/bale-callback',  // ✅ اضافه کنید
        element: <BaleCallbackPage />,
    },
];

// Protected routes (require authentication) - wrapped in UserLayout for navbar
export const protectedRoutes: RouteObject[] = [
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <UserLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: 'dashboard',
                element: <UserDashboard />,
                children: [
                    {
                        index: true,
                        element: <ProfilePage />,
                    },
                    {
                        path: 'profile',
                        element: <ProfilePage />,
                    },
                    {
                        path: 'orders',
                        element: <OrderHistoryPage />,
                    },
                    {
                        path: 'wishlist',
                        element: <WishlistPage />,
                    },
                    {
                        path: 'addresses',
                        element: <AddressesPage />,
                    },
                    {
                        path: 'loyalty',
                        element: <LoyaltyPage />,
                    },

                    {
                        path: 'reviews',
                        element: <ReviewsPage />,
                    },
                    {
                        path: 'settings',
                        element: <div>Settings Page (TODO)</div>,
                    },
                ],
            },
            {
                path: 'cart',
                element: <CartPage />,
            },
            {
                path: 'checkout',
                element: <CheckoutPage />,
            },
            {
                path: 'payment/verify',
                element: <PaymentVerifyPage />,
            },
            {
                path: 'orders/:orderId',
                element: <OrderConfirmationPage />,
            },
            {
                path: 'basalam/cart',
                element: <BasalamCartPage />,
            },
            {
                path: 'basalam/checkout',
                element: <BasalamCheckoutPage />,
            },
            {
                path: 'basalam/orders',
                element: <BasalamOrderListPage />,
            },
            {
                path: 'basalam/orders/:orderId',
                element: <BasalamOrderDetailsPage />,
            },
            {
                path: 'basalam/payment/callback',
                element: <BasalamPaymentCallbackPage />,
            },
        ],
    },
];

// Admin routes (require admin role)
export const adminRoutes: RouteObject[] = [
    {
        path: '/admin',
        element: (
            <AdminRoute>
                <AdminLayout />
            </AdminRoute>
        ),
        children: [
            {
                index: true,
                element: <AdminDashboard />,
            },
            {
                path: 'products',
                element: <ProductManagement />,
            },
            {
                path: 'orders',
                element: <OrderManagement />,
            },
            {
                path: 'users',
                element: <UserManagement />,
            },
            {
                path: 'basalam',
                element: <BasalamPage />,
            },
            {
                path: 'shipping',
                element: <ShippingMethodsManagement />,
            },
            {
                path: 'reviews',
                element: <ReviewsManagement />,
            },
            {
                path: 'payment-accounts',
                element: <PaymentAccountsPage />,
            }
        ],
    },
];

// Combine all routes
export const allRoutes: RouteObject[] = [
    ...publicRoutes,
    ...authRoutes,
    ...protectedRoutes,
    ...adminRoutes,
    // Catch-all route for 404
    {
        path: '*',
        element: (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                <div className="glass-card p-8 text-center">
                    <h1 className="text-2xl font-bold text-text-primary mb-2">404</h1>
                    <p className="text-text-secondary mb-4">Page not found</p>
                    <a
                        href="/"
                        className="glass-button px-6 py-2 text-accent-primary hover:text-accent-primary/80 transition-colors"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        ),
    },
];