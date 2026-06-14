import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../utils/constants';
import { GlassCard } from '../ui/GlassCard';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
    redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    redirectTo = '/login',
}) => {
    const { state } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (state.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                <GlassCard className="p-8 text-center">
                    <div className="glass-spinner w-8 h-8 mx-auto mb-4" />
                    <p className="text-text-secondary">Checking authentication...</p>
                </GlassCard>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!state.isAuthenticated || !state.user) {
        return (
            <Navigate
                to={redirectTo}
                state={{ from: location }}
                replace
            />
        );
    }

    // Check role-based access if required
    if (requiredRole && state.user.role !== requiredRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                <GlassCard className="p-8 text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary mb-2">
                        Access Denied
                    </h2>
                    <p className="text-text-secondary mb-6">
                        You don't have permission to access this page.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="glass-button px-6 py-2 text-accent-primary hover:text-accent-primary/80 transition-colors"
                    >
                        Go Back
                    </button>
                </GlassCard>
            </div>
        );
    }

    // Render protected content
    return <>{children}</>;
};