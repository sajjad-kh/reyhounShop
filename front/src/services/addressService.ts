import { api } from '../utils/api';
import { API_ENDPOINTS } from '../utils/constants';
import { Address } from '../types/auth';

export interface CreateAddressRequest {
    title: string;
    fullName?: string;
    phone?: string;
    address: string;
    city: string;
    state?: string;
    province?: string;
    postalCode: string;
    isDefault: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> { }

export class AddressService {
    private static instance: AddressService;

    private constructor() { }

    public static getInstance(): AddressService {
        if (!AddressService.instance) {
            AddressService.instance = new AddressService();
        }
        return AddressService.instance;
    }

    /**
     * Get all user addresses
     */
    async getAddresses(): Promise<Address[]> {
        try {
            const response = await api.get<any[]>(API_ENDPOINTS.USER.ADDRESSES);

            if (response.success && response.data) {
                // Map province to state for frontend compatibility
                return response.data.map((address: any) => ({
                    id: address.id,
                    title: address.title,
                    fullName: address.fullName || address.title,
                    phone: address.phone || '',
                    address: address.address,
                    city: address.city,
                    state: address.province,
                    postalCode: address.postalCode,
                    isDefault: address.isDefault
                }));
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
            throw error;
        }
    }

    /**
     * Get a specific address by ID
     */
    async getAddress(id: number): Promise<Address> {
        try {
            const response = await api.get<Address>(`${API_ENDPOINTS.USER.ADDRESSES}/${id}`);

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Address not found');
        } catch (error) {
            console.error('Failed to fetch address:', error);
            throw error;
        }
    }

    /**
     * Create a new address
     */
    async createAddress(data: CreateAddressRequest): Promise<Address> {
        try {
            // Map state to province for backend compatibility
            const requestData = {
                title: data.title,
                fullName: data.fullName,
                phone: data.phone,
                address: data.address,
                city: data.city,
                province: data.state || data.province,
                postalCode: data.postalCode,
                isDefault: data.isDefault
            };

            const response = await api.post<any>(API_ENDPOINTS.USER.ADDRESSES, requestData);

            if (response.success && response.data) {
                // Backend now returns all addresses array after creating new one
                if (Array.isArray(response.data)) {
                    // Map all addresses
                    return response.data.map((address: any) => ({
                        id: address.id,
                        title: address.title,
                        fullName: address.fullName || address.title,
                        phone: address.phone || '',
                        address: address.address,
                        city: address.city,
                        state: address.province,
                        postalCode: address.postalCode,
                        isDefault: address.isDefault
                    }))[0]; // Return first address (the newly created one)
                } else {
                    // Single address response (fallback)
                    return {
                        id: response.data.id,
                        title: response.data.title,
                        fullName: response.data.fullName || response.data.title,
                        phone: response.data.phone || '',
                        address: response.data.address,
                        city: response.data.city,
                        state: response.data.province,
                        postalCode: response.data.postalCode,
                        isDefault: response.data.isDefault
                    };
                }
            }

            throw new Error('Failed to create address');
        } catch (error) {
            console.error('Failed to create address:', error);
            throw error;
        }
    }

    /**
     * Update an existing address
     */
    async updateAddress(id: number, data: UpdateAddressRequest): Promise<Address> {
        try {
            const response = await api.put<Address>(
                `${API_ENDPOINTS.USER.ADDRESSES}/${id}`,
                data
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to update address');
        } catch (error) {
            console.error('Failed to update address:', error);
            throw error;
        }
    }

    /**
     * Delete an address
     */
    async deleteAddress(id: number): Promise<void> {
        try {
            const response = await api.delete(`${API_ENDPOINTS.USER.ADDRESSES}/${id}`);

            if (!response.success) {
                throw new Error('Failed to delete address');
            }
        } catch (error) {
            console.error('Failed to delete address:', error);
            throw error;
        }
    }

    /**
     * Set an address as default
     */
    async setDefaultAddress(id: number): Promise<Address> {
        try {
            const response = await api.put<Address>(
                `${API_ENDPOINTS.USER.ADDRESSES}/${id}/default`,
                {}
            );

            if (response.success && response.data) {
                return response.data;
            }

            throw new Error('Failed to set default address');
        } catch (error) {
            console.error('Failed to set default address:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const addressService = AddressService.getInstance();
