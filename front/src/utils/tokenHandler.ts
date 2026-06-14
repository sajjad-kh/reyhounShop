/**
 * Secure Token Handler
 * Manages authentication tokens with enhanced security
 */

import {
    validateJWTStructure,
    isTokenExpired,
    getTokenExpirationTime,
    secureStorage,
} from './security';
import { STORAGE_KEYS } from './constants';
import { SecurityEventType, logSecurityEvent } from './securityConfig';

/**
 * Token Handler Class
 */
export class TokenHandler {
    private static instance: TokenHandler;
    private refreshTimer: NodeJS.Timeout | null = null;
    private readonly REFRESH_BUFFER = 5 * 60; // Refresh 5 minutes before expiry

    private constructor() {
        this.setupAutoRefresh();
    }

    public static getInstance(): TokenHandler {
        if (!TokenHandler.instance) {
            TokenHandler.instance = new TokenHandler();
        }
        return TokenHandler.instance;
    }

    /**
     * Store authentication token securely
     */
    public setToken(token: string): boolean {
        try {
            // Validate token structure
            if (!validateJWTStructure(token)) {
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Invalid JWT structure',
                    },
                    severity: 'high',
                });
                return false;
            }

            // Check if token is already expired
            if (isTokenExpired(token)) {
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Token already expired',
                    },
                    severity: 'medium',
                });
                return false;
            }

            // Store token securely
            secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

            // Setup auto-refresh
            this.setupAutoRefresh();

            return true;
        } catch (error) {
            console.error('Failed to set token:', error);
            return false;
        }
    }

    /**
     * Get authentication token
     */
    public getToken(): string | null {
        try {
            const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (!token) {
                return null;
            }

            // Validate token
            if (!validateJWTStructure(token)) {
                this.clearToken();
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Invalid token structure on retrieval',
                    },
                    severity: 'high',
                });
                return null;
            }

            // Check expiration
            if (isTokenExpired(token)) {
                this.clearToken();
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Token expired on retrieval',
                    },
                    severity: 'low',
                });
                return null;
            }

            return token;
        } catch (error) {
            console.error('Failed to get token:', error);
            return null;
        }
    }

    /**
     * Store refresh token securely
     */
    public setRefreshToken(refreshToken: string): boolean {
        try {
            // Validate token structure
            if (!validateJWTStructure(refreshToken)) {
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Invalid refresh token structure',
                    },
                    severity: 'high',
                });
                return false;
            }

            // Store refresh token securely
            secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

            return true;
        } catch (error) {
            console.error('Failed to set refresh token:', error);
            return false;
        }
    }

    /**
     * Get refresh token
     */
    public getRefreshToken(): string | null {
        try {
            const refreshToken = secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

            if (!refreshToken) {
                return null;
            }

            // Validate token
            if (!validateJWTStructure(refreshToken)) {
                this.clearRefreshToken();
                logSecurityEvent({
                    type: SecurityEventType.INVALID_TOKEN,
                    timestamp: Date.now(),
                    details: {
                        reason: 'Invalid refresh token structure on retrieval',
                    },
                    severity: 'high',
                });
                return null;
            }

            return refreshToken;
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    }

    /**
     * Clear authentication token
     */
    public clearToken(): void {
        secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        this.clearRefreshTimer();
    }

    /**
     * Clear refresh token
     */
    public clearRefreshToken(): void {
        secureStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    /**
     * Clear all tokens
     */
    public clearAllTokens(): void {
        this.clearToken();
        this.clearRefreshToken();
    }

    /**
     * Check if token is valid
     */
    public isTokenValid(): boolean {
        const token = this.getToken();
        return token !== null;
    }

    /**
     * Get time until token expiration (in seconds)
     */
    public getTimeUntilExpiration(): number | null {
        const token = this.getToken();
        if (!token) {
            return null;
        }

        return getTokenExpirationTime(token);
    }

    /**
     * Setup automatic token refresh
     */
    private setupAutoRefresh(): void {
        // Clear existing timer
        this.clearRefreshTimer();

        const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!token) {
            return;
        }

        const expirationTime = getTokenExpirationTime(token);
        if (!expirationTime) {
            return;
        }

        // Calculate when to refresh (5 minutes before expiry)
        const refreshTime = Math.max(0, (expirationTime - this.REFRESH_BUFFER) * 1000);

        // Set timer to trigger refresh
        this.refreshTimer = setTimeout(() => {
            this.triggerTokenRefresh();
        }, refreshTime);
    }

    /**
     * Trigger token refresh
     */
    private triggerTokenRefresh(): void {
        // Dispatch event for token refresh
        window.dispatchEvent(new CustomEvent('tokenRefreshNeeded'));
    }

    /**
     * Clear refresh timer
     */
    private clearRefreshTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Decode token payload (without verification)
     */
    public decodeToken(token?: string): any | null {
        const tokenToUse = token || this.getToken();
        if (!tokenToUse) {
            return null;
        }

        try {
            const payload = tokenToUse.split('.')[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }

    /**
     * Get user ID from token
     */
    public getUserIdFromToken(): string | null {
        const payload = this.decodeToken();
        return payload?.userId || payload?.sub || null;
    }

    /**
     * Get user role from token
     */
    public getUserRoleFromToken(): string | null {
        const payload = this.decodeToken();
        return payload?.role || null;
    }

    /**
     * Check if user has specific role
     */
    public hasRole(role: string): boolean {
        const userRole = this.getUserRoleFromToken();
        return userRole === role;
    }

    /**
     * Check if user is admin
     */
    public isAdmin(): boolean {
        return this.hasRole('ADMIN');
    }
}

// Export singleton instance
export const tokenHandler = TokenHandler.getInstance();

export default tokenHandler;
