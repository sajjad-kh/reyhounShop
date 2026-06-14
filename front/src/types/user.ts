// User related types
export interface User {
    id: number;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: 'CUSTOMER' | 'ADMIN';
    loyaltyPoints: number;
    addresses: Address[];
    createdAt: string;
    updatedAt: string;
}

export interface Address {
    id: number;
    userId: number;
    type: 'HOME' | 'WORK' | 'OTHER';
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}