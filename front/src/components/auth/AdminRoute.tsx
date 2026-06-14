import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { USER_ROLES } from '../../utils/constants';

interface AdminRouteProps {
    children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    return (
        <ProtectedRoute requiredRole={USER_ROLES.ADMIN}>
            {children}
        </ProtectedRoute>
    );
};