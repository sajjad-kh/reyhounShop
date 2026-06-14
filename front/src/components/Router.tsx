import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import ToastContainer from './ui/ToastContainer';
import { allRoutes } from '../utils/routes';

// Create the router with all routes
const router = createBrowserRouter(allRoutes);

export const Router: React.FC = () => {
    return (
        <AuthProvider>
            <ToastProvider>
                <RouterProvider router={router} />
                <ToastContainer />
            </ToastProvider>
        </AuthProvider>
    );
};