import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useAuth } from '../hooks/useAuth';

// Icons
const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

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
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
                <div className="glass-card p-8 text-center">
                    <div className="glass-spinner w-8 h-8 mx-auto mb-4" />
                    <p className="text-text-secondary">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-primary">
            <div className="flex">
                {/* Sidebar */}
                <DashboardSidebar
                    isMobile={true}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    className="lg:relative lg:translate-x-0"
                />

                {/* Main Content */}
                <div className="flex-1 lg:ml-6">
                    {/* Page Content */}
                    <main className="p-4 lg:p-6">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden mb-4 p-2 glass-card rounded-lg text-text-primary hover:text-accent-primary transition-colors inline-flex items-center"
                        >
                            <MenuIcon />
                            <span className="ml-2 text-sm">Menu</span>
                        </button>

                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};