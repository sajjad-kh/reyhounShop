import { api } from '../utils/api';
import {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Verify2FARequest,
    User
} from '../types/auth';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';
import {
    validateJWTStructure,
    isTokenExpired,
    sanitizeObject,
    secureStorage
} from '../utils/security';

export class AuthService {
    private static instance: AuthService;
    private refreshPromise: Promise<string> | null = null;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Login user with email and password
     */
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        try {
            console.log('🔐 Login attempt:', { email: credentials.email });

            // Sanitize input credentials
            const sanitizedCredentials = sanitizeObject(credentials);
            console.log('📤 Sending request to:', API_ENDPOINTS.AUTH.LOGIN);

            const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, sanitizedCredentials);
            console.log('📥 Response received:', response);

            if (response.success && response.data) {
                await this.handleAuthSuccess(response.data);
            }

            return response.data;
        } catch (error) {
            console.error('❌ Login error:', error);
            throw this.handleAuthError(error);
        }
    }


    /**
     * Login with Bale token
     */
    public async loginWithBaleToken(token: string, user: User): Promise<void> {
        await this.handleAuthSuccess({ token, user, refreshToken: token });
    }


    /**
     * Register new user
     */
    async register(userData: RegisterRequest): Promise<AuthResponse> {
        try {
            // Sanitize input user data
            const sanitizedUserData = sanitizeObject(userData);

            const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, sanitizedUserData);

            if (response.success && response.data) {
                await this.handleAuthSuccess(response.data);
            }

            return response.data;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Verify 2FA code
     */
    async verify2FA(verificationData: Verify2FARequest): Promise<AuthResponse> {
        try {
            const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY_2FA, verificationData);

            if (response.success && response.data) {
                await this.handleAuthSuccess(response.data);
            }

            return response.data;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(): Promise<string> {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.performTokenRefresh();

        try {
            const newToken = await this.refreshPromise;
            return newToken;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async performTokenRefresh(): Promise<string> {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await api.post<{ token: string; refreshToken: string }>(
                API_ENDPOINTS.AUTH.REFRESH,
                { refreshToken }
            );

            if (response.success && response.data) {
                const { token, refreshToken: newRefreshToken } = response.data;

                // Update stored tokens
                this.setAuthToken(token);
                this.setRefreshToken(newRefreshToken);

                return token;
            }

            throw new Error('Token refresh failed');
        } catch (error) {
            // Clear invalid tokens
            this.clearAuthData();
            throw error;
        }
    }

    /**
     * Get current user profile
     */
    async getCurrentUser(): Promise<User> {
        try {
            const response = await api.get<User>(API_ENDPOINTS.AUTH.PROFILE);

            if (response.success && response.data) {
                // Update stored user data
                this.setUserData(response.data);
                return response.data;
            }

            throw new Error('Failed to fetch user profile');
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Change user password
     */
    async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
        try {
            const response = await api.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);

            if (!response.success) {
                throw new Error('Password change failed');
            }
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Request password reset
     */
    async forgotPassword(emailData: ForgotPasswordRequest): Promise<void> {
        try {
            const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, emailData);

            if (!response.success) {
                throw new Error('Password reset request failed');
            }
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
        try {
            const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, resetData);

            if (!response.success) {
                throw new Error('Password reset failed');
            }
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            // Call logout endpoint to invalidate server-side session
            await api.post(API_ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
            // Continue with logout even if server call fails
            console.warn('Logout API call failed:', error);
        } finally {
            // Always clear local auth data
            this.clearAuthData();
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const token = this.getAuthToken();
        const user = this.getUserData();

        if (!token || !user) {
            return false;
        }

        // Validate token structure and expiration
        if (!validateJWTStructure(token)) {
            this.clearAuthData();
            return false;
        }

        if (isTokenExpired(token)) {
            this.clearAuthData();
            return false;
        }

        return true;
    }

    /**
     * Get stored authentication token
     */
    getAuthToken(): string | null {
        const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        // Validate token before returning
        if (token && !validateJWTStructure(token)) {
            this.clearAuthData();
            return null;
        }

        return token;
    }

    /**
     * Get stored refresh token
     */
    getRefreshToken(): string | null {
        const token = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        // Validate token before returning
        if (token && !validateJWTStructure(token)) {
            this.clearAuthData();
            return null;
        }

        return token;
    }

    /**
     * Get stored user data
     */
    getUserData(): User | null {
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

        if (!userData) {
            return null;
        }

        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Failed to parse user data:', error);
            return null;
        }
    }

    /**
     * Set authentication token with validation
     */
    private setAuthToken(token: string): void {
        // Validate token structure before storing
        if (!validateJWTStructure(token)) {
            throw new Error('Invalid token structure');
        }

        // Use secure storage for sensitive tokens
        secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        // localStorage.setItem("auth_token",token)
    }

    /**
     * Set refresh token with validation
     */
    private setRefreshToken(refreshToken: string): void {
        // Validate token structure before storing
        if (!validateJWTStructure(refreshToken)) {
            throw new Error('Invalid refresh token structure');
        }

        // Use secure storage for sensitive tokens
        secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    /**
     * Set user data
     */
    private setUserData(user: User): void {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    }

    /**
     * Handle successful authentication
     */
    private async handleAuthSuccess(authData: AuthResponse): Promise<void> {
        const { user, token, refreshToken } = authData;

        // Store authentication data
        this.setAuthToken(token);
        this.setRefreshToken(refreshToken);
        this.setUserData(user);

        // Dispatch custom event for auth state change
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user, isAuthenticated: true }
        }));
    }

    /**
     * Clear all authentication data
     */
    private clearAuthData(): void {
        secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);

        // Dispatch custom event for auth state change
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user: null, isAuthenticated: false }
        }));
    }

    /**
     * Handle authentication errors
     */
    private handleAuthError(error: any): Error {
        if (error.response?.data?.error) {
            return new Error(error.response.data.error.message || 'Authentication failed');
        }

        if (error.message) {
            return new Error(error.message);
        }

        return new Error('An unexpected error occurred');
    }
}

// Export singleton instance
export const authService = AuthService.getInstance();