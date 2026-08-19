import React from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export const UserDashboard: React.FC = () => {
    const { state } = useAuth();

    if (!state.user) {
        return <LoadingSpinner fullScreen label="در حال بارگذاری..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="flex">
                <div className="flex-1">
                    <main className="p-4 lg:p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};
