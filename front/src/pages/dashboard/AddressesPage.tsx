import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { useAuth } from '../../hooks/useAuth';
import { Address } from '../../types/auth';
import { addressService } from '../../services/addressService';

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const LocationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const StarIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const PhoneIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

interface AddressFormData {
    title: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
}

interface FormErrors {
    [key: string]: string | undefined;
}

const initialFormData: AddressFormData = {
    title: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
};

export const AddressesPage: React.FC = () => {
    const { state } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [formData, setFormData] = useState<AddressFormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load addresses from API
    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            setIsLoading(true);
            const data = await addressService.getAddresses();
            setAddresses(data);
        } catch (error) {
            console.error('Failed to load addresses:', error);
            // Fallback to user data if API fails
            if (state.user?.addresses) {
                setAddresses(state.user.addresses);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (address?: Address) => {
        if (address) {
            setEditingAddress(address);
            setFormData({
                title: address.title,
                fullName: address.fullName,
                phone: address.phone,
                address: address.address,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                isDefault: address.isDefault,
            });
        } else {
            setEditingAddress(null);
            setFormData(initialFormData);
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
        setFormData(initialFormData);
        setErrors({});
    };

    const handleInputChange = (field: keyof AddressFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear field error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Address title is required';
        }

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required';
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required';
        }

        if (!formData.postalCode.trim()) {
            newErrors.postalCode = 'Postal code is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (editingAddress) {
                const updated = await addressService.updateAddress(editingAddress.id, formData);
                setAddresses(prev =>
                    prev.map(a =>
                        a.id === updated.id ? updated : a
                    )
                );
            } else {

                const newAddress = await addressService.createAddress(formData);

                setAddresses(prev => {
                    if (newAddress.isDefault) {
                        // اگر default بود، بقیه رو unset کن
                        return [
                            newAddress,
                            ...prev.map(a => ({ ...a, isDefault: false }))
                        ];
                    }

                    return [...prev, newAddress];
                });

            }

            // Reload addresses from API
            await loadAddresses();

            closeModal();
        } catch (error) {
            setErrors({
                general: error instanceof Error ? error.message : 'Failed to save address'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (addressId: number) => {
        if (!confirm('Are you sure you want to delete this address?')) {
            return;
        }

        setIsDeleting(addressId);

        try {
            
            await addressService.deleteAddress(addressId);

            setAddresses(prev =>
                prev.filter(a => a.id !== addressId)
            );
        } catch (error) {
            console.error('Failed to delete address:', error);
            alert('Failed to delete address. Please try again.');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleSetDefault = async (addressId: number) => {
        try {
            setAddresses(prev =>
                prev.map(a => ({
                    ...a,
                    isDefault: a.id === addressId
                }))
            );
        } catch (error) {
            console.error('Failed to set default address:', error);
            alert('Failed to set default address. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-text-primary">Delivery Addresses</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <GlassCard key={i} className="animate-pulse">
                            <div className="h-40 bg-glass-medium rounded" />
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">
                        Delivery Addresses
                    </h1>
                    <p className="text-text-secondary">
                        Manage your delivery addresses for faster checkout
                    </p>
                </div>

                <GlassButton
                    variant="accent"
                    onClick={() => openModal()}
                    ripple
                >
                    <PlusIcon />
                    <span className="ml-2">Add Address</span>
                </GlassButton>
            </div>

            {/* Addresses Grid */}
            {addresses.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <LocationIcon />
                    <h3 className="text-lg font-semibold text-text-primary mt-4 mb-2">
                        No addresses yet
                    </h3>
                    <p className="text-text-secondary mb-6">
                        Add your first delivery address to get started
                    </p>
                    <GlassButton
                        variant="accent"
                        onClick={() => openModal()}
                        ripple
                    >
                        <PlusIcon />
                        <span className="ml-2">Add Address</span>
                    </GlassButton>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                        <GlassCard key={address.id} className="p-6 relative">
                            {/* Default Badge */}
                            {address.isDefault && (
                                <div className="absolute top-4 right-4 flex items-center px-2 py-1 bg-accent-primary text-white text-xs rounded-full">
                                    <StarIcon />
                                    <span className="ml-1">Default</span>
                                </div>
                            )}

                            {/* Address Info */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-text-primary">
                                    {address.title}
                                </h3>

                                <div className="space-y-2 text-sm text-text-secondary">
                                    <p className="font-medium text-text-primary">{address.fullName}</p>
                                    <p>{address.phone}</p>
                                    <p>{address.address}</p>
                                    <p>{address.city}, {address.state} {address.postalCode}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-glass-light">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => openModal(address)}
                                        className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                                        title="Edit address"
                                    >
                                        <EditIcon />
                                    </button>

                                    <button
                                        onClick={() => handleDelete(address.id)}
                                        disabled={isDeleting === address.id}
                                        className="p-2 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Delete address"
                                    >
                                        {isDeleting === address.id ? (
                                            <div className="w-4 h-4 glass-spinner" />
                                        ) : (
                                            <DeleteIcon />
                                        )}
                                    </button>
                                </div>

                                {!address.isDefault && (
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleSetDefault(address.id)}
                                    >
                                        Set as Default
                                    </GlassButton>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Address Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <GlassCard className="p-8">
                            <h2 className="text-xl font-semibold text-text-primary mb-6">
                                {editingAddress ? 'Edit Address' : 'Add New Address'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* General Error */}
                                {errors.general && (
                                    <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm rounded-xl">
                                        {errors.general}
                                    </div>
                                )}

                                {/* Address Title */}
                                <GlassInput
                                    type="text"
                                    label="Address Title"
                                    value={formData.title}
                                    onChange={(value) =>setFormData(prev => ({ ...prev, title: value }))}
                                    error={errors.title}
                                    placeholder="e.g., Home, Office, etc."
                                    required
                                />

                                {/* Full Name */}
                                <GlassInput
                                    type="text"
                                    label="Full Name"
                                    value={formData.fullName}
                                    onChange={(value) =>setFormData(prev => ({ ...prev, fullName: value }))}                                    
                                    error={errors.fullName}
                                    icon={<UserIcon />}
                                    iconPosition="left"
                                    required
                                />

                                {/* Phone */}
                                <GlassInput
                                    type="tel"
                                    label="Phone Number"
                                    value={formData.phone}
                                    onChange={(value) =>setFormData(prev => ({ ...prev, phone: value }))}                                    
                                    error={errors.phone}
                                    icon={<PhoneIcon />}
                                    iconPosition="left"
                                    required
                                />

                                {/* Address */}
                                <GlassInput
                                    type="text"
                                    label="Street Address"
                                    value={formData.address}
                                    onChange={(value) =>setFormData(prev => ({ ...prev, address: value }))}                                    
                                    error={errors.address}
                                    icon={<LocationIcon />}
                                    iconPosition="left"
                                    required
                                />

                                {/* City and State */}
                                <div className="grid grid-cols-2 gap-4">
                                    <GlassInput
                                        type="text"
                                        label="City"
                                        value={formData.city}
                                        onChange={(value) =>setFormData(prev => ({ ...prev, city: value }))}                                    
                                        error={errors.city}
                                        required
                                    />

                                    <GlassInput
                                        type="text"
                                        label="State"
                                        value={formData.state}
                                        onChange={(value) =>setFormData(prev => ({ ...prev, state: value }))}                                    
                                        error={errors.state}
                                        required
                                    />
                                </div>

                                {/* Postal Code */}
                                <GlassInput
                                    type="text"
                                    label="Postal Code"
                                    value={formData.postalCode}
                                    onChange={(value) =>setFormData(prev => ({ ...prev, postalCode: value }))}                                    
                                    error={errors.postalCode}
                                    required
                                />

                                {/* Default Address Checkbox */}
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formData.isDefault}
                                        onChange={handleInputChange('isDefault')}
                                        className="w-4 h-4 text-accent-primary bg-glass-light border-border-glass-light rounded focus:ring-accent-primary focus:ring-2"
                                    />
                                    <label htmlFor="isDefault" className="text-sm text-text-secondary">
                                        Set as default address
                                    </label>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-4 pt-4">
                                    <GlassButton
                                        type="button"
                                        variant="secondary"
                                        onClick={closeModal}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </GlassButton>

                                    <GlassButton
                                        type="submit"
                                        variant="accent"
                                        loading={isSubmitting}
                                        className="flex-1"
                                        ripple
                                    >
                                        {isSubmitting
                                            ? (editingAddress ? 'Updating...' : 'Adding...')
                                            : (editingAddress ? 'Update Address' : 'Add Address')
                                        }
                                    </GlassButton>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
};