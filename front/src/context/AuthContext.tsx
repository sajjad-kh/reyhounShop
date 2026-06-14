import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { authService } from '../services/authService';

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
    register: (userData: { email: string; password: string; name: string; phone?: string; birthDate?: string }) => Promise<void>;
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


    const loginWithBale = async (token: string, user: any): Promise<void> => {
        dispatch({ type: 'AUTH_START' });
        await authService.loginWithBaleToken(token, user);
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
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
                dispatch({ type: 'AUTH_SUCCESS', payload: user });
            } else {
                dispatch({ type: 'AUTH_LOGOUT' });
            }
        };

        window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);

        return () => {
            window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
        };
    }, []);

    // Login function
    const login = async (email: string, password: string): Promise<void> => {
        try {
            dispatch({ type: 'AUTH_START' });
            const authResponse = await authService.login({ email, password });

            if (authResponse.requires2FA) {
                // Handle 2FA flow - for now, we'll throw an error to be handled by the component
                throw new Error('2FA_REQUIRED');
            }

            dispatch({ type: 'AUTH_SUCCESS', payload: authResponse.user });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Register function
    const register = async (userData: {
        email: string;
        password: string;
        name: string;
        phone?: string;
        birthDate?: string
    }): Promise<void> => {
        try {
            dispatch({ type: 'AUTH_START' });
            const authResponse = await authService.register(userData);
            dispatch({ type: 'AUTH_SUCCESS', payload: authResponse.user });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
            throw error;
        }
    };

    // Logout function
    const logout = async (): Promise<void> => {
        try {
            await authService.logout();
            dispatch({ type: 'AUTH_LOGOUT' });
        } catch (error) {
            // Even if logout fails on server, clear local state
            dispatch({ type: 'AUTH_LOGOUT' });
        }
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