import { UserRole } from '../utils/constants';

export interface User {
    id: number;
    email: string;
    name: string;
    phone?: string;
    birthDate?: string;
    role: UserRole;
    loyaltyPoints: number;
    addresses: Address[];
    createdAt: string;
    updatedAt: string;
}

export interface Address {
    id: number;
    title: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
}

export interface BaleLoginResponse {
    loginId: string;
    url: string;
}

export interface BaleStatusResponse {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    token?: string;
    user?: User;
}

export interface AuthResponse {
    user: User;
    token: string;
    expiresIn?: string;
    requires2FA?: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    phone?: string;
    birthDate?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface Verify2FARequest {
    token: string;
}