import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../types/auth';
import { authService } from '../services/authService';
import { api } from '../utils/api';
import { secureStorage } from '../utils/security';
import { STORAGE_KEYS } from '../utils/constants';

// Auth State Interface
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Auth Actions
type AuthAction =
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: User }
    | { type: 'AUTH_ERROR'; payload: string }
    | { type: 'AUTH_LOGOUT' }
    | { type: 'CLEAR_ERROR' };

// Auth Context Interface
interface AuthContextType {
    state: AuthState;
    login: (email: string, password: string) => Promise<void>;
    loginWithBale: (token: string, user: any) => Promise<void>;
    register: (userData: { email: string; password: string; name: string; phone?: string; birthDate?: string; ref?: string }) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

// Initial State
const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};


// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'AUTH_START':
            return {
                ...state,
                isLoading: true,
                error: null,
            };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };
        case 'AUTH_ERROR':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'AUTH_LOGOUT':
            return {
                ...state,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// const loginWithToken = (token: string, user: any): void => {
//     authService.setToken(token);
//     dispatch({ type: 'AUTH_SUCCESS', payload: user });
// };

// Auth Provider Props
interface AuthProviderProps {
    children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const queryClient = useQueryClient();


    const loginWithBale = async (token: string, user: any): Promise<void> => {
        await authService.loginWithBaleToken(token, user);
        window.location.replace('/');
    };

    // Initialize auth state on mount
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    // Get user data from localStorage first
                    const userData = authService.getUserData();
                    if (userData) {
                        // Use cached user data immediately
                        dispatch({ type: 'AUTH_SUCCESS', payload: userData });

                        // Optionally refresh user data in background
                        try {
                            const freshUser = await authService.getCurrentUser();
                            dispatch({ type: 'AUTH_SUCCESS', payload: freshUser });
                        } catch (refreshError) {
                            // If refresh fails, keep using cached data
                            console.warn('Failed to refresh user data, using cached data');
                        }
                    } else {
                        // No cached data, try to fetch
                        const user = await authService.getCurrentUser();
                        dispatch({ type: 'AUTH_SUCCESS', payload: user });
                    }
                } else {
                    dispatch({ type: 'AUTH_LOGOUT' });
                }
            } catch (error) {
                // Only logout if we're sure there's no valid session
                console.error('Auth initialization error:', error);
                dispatch({ type: 'AUTH_LOGOUT' });
            }
        };

        initializeAuth();
    }, []);

    // Listen for auth state changes from authService
    useEffect(() => {
        const handleAuthStateChange = (event: CustomEvent) => {
            const { user, isAuthenticated } = event.detail;

            if (isAuthenticated && user) {
                api.clearCache();
                dispatch({ type: 'AUTH_SUCCESS', payload: user });
            } else {
                api.clearCache();
                queryClient.clear();
                dispatch({ type: 'AUTH_LOGOUT' });
            }
        };

        window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);

        return () => {
            window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
        };
    }, []);

    // Login function — after storing token, force full reload for clean state
    const login = async (email: string, password: string): Promise<void> => {
        try {
            const authResponse = await authService.login({ email, password });

            if (authResponse.requires2FA) {
                throw new Error('2FA_REQUIRED');
            }

            // Redirect admins to the admin panel; everyone else to home
            const user = authService.getUserData();
            const redirectPath = user?.role === 'ADMIN' ? '/admin' : '/';

            // Force full page reload — guarantees no stale React/Query state
            window.location.replace(redirectPath);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            throw error;
        }
    };

    // Register function
    const register = async (userData: {
        email: string;
        password: string;
        name: string;
        phone?: string;
        birthDate?: string;
        ref?: string;
    }): Promise<void> => {
        try {
            await authService.register(userData);
            // Force full page reload — guarantees no stale React/Query state
            window.location.replace('/');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            throw error;
        }
    };

    // Logout function — synchronous cleanup, then full page reload
    const logout = (): void => {
        // 1. Clear ALL storage synchronously (before anything else)
        try {
            secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            localStorage.clear();
        } catch (_) {}

        // 2. Clear in-memory caches
        api.clearCache();
        queryClient.clear();

        // 3. Try server-side logout in background (fire-and-forget)
        authService.logout().catch(() => {});

        // 4. Force full page reload with cache-bust to wipe ALL state
        window.location.replace('/login?_=' + Date.now());
    };

    // Clear error function
    const clearError = (): void => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    const contextValue: AuthContextType = {
        state,
        login,
        loginWithBale,
        register,
        logout,
        clearError,
        
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export default AuthContext;