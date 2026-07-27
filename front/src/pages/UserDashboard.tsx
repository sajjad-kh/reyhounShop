import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { Menu } from 'lucide-react';

export const UserDashboard: React.FC = () => {
    const { state } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    if (!state.user) {
        return <LoadingSpinner fullScreen label="در حال بارگذاری..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="flex">
                <DashboardSidebar
                    isMobile={true}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    className="lg:relative lg:translate-x-0"
                />

                <div className="flex-1 lg:ml-6">
                    <main className="p-4 lg:p-6">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden mb-4 p-2 glass-card rounded-lg text-text-primary hover:text-accent-primary transition-colors inline-flex items-center"
                        >
                            <Menu className="w-6 h-6" />
                            <span className="mr-2 text-sm">منو</span>
                        </button>

                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};