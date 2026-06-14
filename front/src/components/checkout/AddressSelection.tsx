import React, { useState } from 'react';
import { Address } from '../../types/auth';
import { GlassButton } from '../ui/GlassButton';
import { GlassCard } from '../ui/GlassCard';
import { addressService } from '../../services/addressService';

interface AddressSelectionProps {
    addresses: Address[];
    selectedAddressId: number | null;
    onSelectAddress: (addressId: number) => void;
    onAddressAdded?: () => void;
    onDeleteAddress?: (addressId: number) => void;
}

export const AddressSelection: React.FC<AddressSelectionProps> = ({
    addresses,
    selectedAddressId,
    onSelectAddress,
    onAddressAdded,
    onDeleteAddress,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Create address - backend returns all addresses
            await addressService.createAddress(formData);

            // Reset form
            setFormData({
                title: '',
                fullName: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                postalCode: '',
                isDefault: false,
            });

            // Force refresh addresses from server
            if (onAddressAdded) {
                onAddressAdded();
            }

            setShowAddForm(false);
        } catch (error) {
            console.error('Failed to add address:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (addressId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the address when clicking delete
        e.preventDefault(); // Prevent any default behavior
        if (onDeleteAddress) {
            onDeleteAddress(addressId);
        }
    };

    if (!addresses || addresses.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-white/60 mb-4">آدرسی ذخیره نشده است</p>
                <GlassButton onClick={() => setShowAddForm(true)}>
                    افزودن آدرس جدید
                </GlassButton>

                {showAddForm && (
                    <GlassCard className="mt-6 p-6 text-right">
                        <h3 className="text-xl font-bold text-white mb-4">افزودن آدرس جدید</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-white/80 mb-2">عنوان آدرس</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="مثال: خانه، محل کار"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2">نام و نام خانوادگی</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2">شماره تماس</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2">آدرس کامل</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/80 mb-2">شهر</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/80 mb-2">استان</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2">کد پستی</label>
                                <input
                                    type="text"
                                    name="postalCode"
                                    value={formData.postalCode}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="isDefault"
                                    checked={formData.isDefault}
                                    onChange={handleInputChange}
                                    className="w-4 h-4"
                                />
                                <label className="text-white/80">تنظیم به عنوان آدرس پیش‌فرض</label>
                            </div>

                            <div className="flex gap-3">
                                <GlassButton
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'در حال ذخیره...' : 'ذخیره آدرس'}
                                </GlassButton>
                                <GlassButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    انصراف
                                </GlassButton>
                            </div>
                        </form>
                    </GlassCard>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {addresses.map((address) => (
                <div
                    key={address.id}
                    onClick={() => onSelectAddress(address.id)}
                    className={`glass-card p-4 cursor-pointer transition-all duration-300 ${selectedAddressId === address.id
                        ? 'ring-2 ring-purple-500 bg-white/20'
                        : 'hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-white font-semibold">{address.title}</h3>
                                {address.isDefault && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                        Default
                                    </span>
                                )}
                            </div>
                            <p className="text-white/60 text-sm mt-1">{address.city}, {address.state}, {address.address}</p>
                            <p className="text-white/60 text-sm mt-1">کد پستی :{address.postalCode}</p>
                            <p className="text-white/60 text-sm">{address.phone}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => handleDeleteClick(address.id, e)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                                title="حذف آدرس"
                            >
                                <svg
                                    className="w-5 h-5 text-white/60 group-hover:text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                </svg>
                            </button>
                            <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedAddressId === address.id
                                    ? 'border-purple-500 bg-purple-500'
                                    : 'border-white/30'
                                    }`}
                            >
                                {selectedAddressId === address.id && (
                                    <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {!showAddForm && (
                <GlassButton
                    variant="secondary"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                >
                    + افزودن آدرس جدید
                </GlassButton>
            )}

            {showAddForm && (
                <GlassCard className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">افزودن آدرس جدید</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-white/80 mb-2">عنوان آدرس</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="مثال: خانه، محل کار"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2">نام و نام خانوادگی</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2">شماره تماس</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2">آدرس کامل</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/80 mb-2">شهر</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-white/80 mb-2">استان</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2">کد پستی</label>
                            <input
                                type="text"
                                name="postalCode"
                                value={formData.postalCode}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="isDefault"
                                checked={formData.isDefault}
                                onChange={handleInputChange}
                                className="w-4 h-4"
                            />
                            <label className="text-white/80">تنظیم به عنوان آدرس پیش‌فرض</label>
                        </div>

                        <div className="flex gap-3">
                            <GlassButton
                                type="submit"
                                variant="primary"
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'در حال ذخیره...' : 'ذخیره آدرس'}
                            </GlassButton>
                            <GlassButton
                                type="button"
                                variant="secondary"
                                onClick={() => setShowAddForm(false)}
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                انصراف
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            )}
        </div>
    );
};
