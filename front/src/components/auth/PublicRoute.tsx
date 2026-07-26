import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface PublicRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
    restricted?: boolean; // If true, authenticated users will be redirected
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
    children,
    redirectTo = '/',
    restricted = false,
}) => {
    const { state } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (state.isLoading) {
        return <LoadingSpinner fullScreen size="md" label="در حال بارگذاری..." />;
    }

    // If route is restricted and user is authenticated, redirect
    if (restricted && state.isAuthenticated) {
        // Redirect admin to admin dashboard, regular users to their intended page
        if (state.user?.role === 'ADMIN') {
            return <Navigate to="/admin" replace />;
        }

        // Check if there's a redirect location from login attempt
        const from = location.state?.from?.pathname || redirectTo;
        return <Navigate to={from} replace />;
    }

    // Render public content
    return <>{children}</>;
};