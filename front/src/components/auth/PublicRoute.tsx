import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GlassCard } from '../ui/GlassCard';

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
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                <GlassCard className="p-8 text-center">
                    <div className="glass-spinner w-8 h-8 mx-auto mb-4" />
                    <p className="text-text-secondary">Loading...</p>
                </GlassCard>
            </div>
        );
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