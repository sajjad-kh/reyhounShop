import React, { useState, useEffect } from 'react';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { ShippingMethod } from '../../types/shipping';
import { X } from 'lucide-react';

interface ShippingMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ShippingMethodFormData) => Promise<void>;
    method?: ShippingMethod | null;
    mode: 'add' | 'edit';
}

export interface ShippingMethodFormData {
    name: string;
    description: string;
    baseCost: number;
    additionalCost: number;
    additionalDimensionsCost?: number;
    isActive: boolean;
}

export const ShippingMethodModal: React.FC<ShippingMethodModalProps> = ({
    isOpen,
    onClose,
    onSave,
    method,
    mode,
}) => {
    const [formData, setFormData] = useState<ShippingMethodFormData>({
        name: '',
        description: '',
        baseCost: 0,
        additionalCost: 0,
        additionalDimensionsCost: 0,
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (method && mode === 'edit') {
            setFormData({
                name: method.name,
                description: method.description || '',
                baseCost: method.baseCost,
                additionalCost: method.additionalCost,
                additionalDimensionsCost: method.additionalDimensionsCost || 0,
                isActive: method.isActive,
            });
        } else {
            setFormData({
                name: '',
                description: '',
                baseCost: 0,
                additionalCost: 0,
                additionalDimensionsCost: 0,
                isActive: true,
            });
        }
        setErrors({});
    }, [method, mode, isOpen]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'نام روش ارسال الزامی است';
        } else if (formData.name.length < 3) {
            newErrors.name = 'نام باید حداقل 3 کاراکتر باشد';
        }

        if (formData.baseCost < 0) {
            newErrors.baseCost = 'هزینه پایه نمی‌تواند منفی باشد';
        }

        if (formData.additionalCost < 0) {
            newErrors.additionalCost = 'هزینه اضافی نمی‌تواند منفی باشد';
        }

        if (formData.additionalDimensionsCost && formData.additionalDimensionsCost < 0) {
            newErrors.additionalDimensionsCost = 'هزینه ابعاد نمی‌تواند منفی باشد';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setLoading(true);
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving shipping method:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof ShippingMethodFormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const value = e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;

        setFormData(prev => ({
            ...prev,
            [field]: e.target.type === 'number' ? Number(value) : value,
        }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">
                        {mode === 'add' ? 'افزودن روش ارسال جدید' : 'ویرایش روش ارسال'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-glass-light transition-colors"
                    >
                        <X className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            نام روش ارسال *
                        </label>
                        <GlassInput
                            type="text"
                            value={formData.name}
                            onChange={handleChange('name')}
                            placeholder="مثال: پست پیشتاز"
                            error={errors.name}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            توضیحات
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={handleChange('description')}
                            placeholder="توضیحات روش ارسال..."
                            rows={3}
                            className="w-full px-4 py-3 bg-glass-light border border-glass-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all"
                        />
                    </div>

                    {/* Base Cost */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            هزینه پایه (ریال) *
                        </label>
                        <GlassInput
                            type="number"
                            value={formData.baseCost}
                            onChange={handleChange('baseCost')}
                            placeholder="50000"
                            error={errors.baseCost}
                            min={0}
                            required
                        />
                    </div>

                    {/* Additional Cost */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            هزینه اضافی (ریال) *
                        </label>
                        <GlassInput
                            type="number"
                            value={formData.additionalCost}
                            onChange={handleChange('additionalCost')}
                            placeholder="10000"
                            error={errors.additionalCost}
                            min={0}
                            required
                        />
                        <p className="text-xs text-text-muted mt-1">
                            هزینه اضافی برای هر محصول بیشتر از یک عدد
                        </p>
                    </div>

                    {/* Additional Dimensions Cost */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            هزینه ابعاد اضافی (ریال)
                        </label>
                        <GlassInput
                            type="number"
                            value={formData.additionalDimensionsCost || 0}
                            onChange={handleChange('additionalDimensionsCost')}
                            placeholder="5000"
                            error={errors.additionalDimensionsCost}
                            min={0}
                        />
                        <p className="text-xs text-text-muted mt-1">
                            هزینه اضافی برای محصولات با ابعاد بزرگ
                        </p>
                    </div>

                    {/* Is Active */}
                    <div className="flex items-center gap-3 p-4 bg-glass-light rounded-xl">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={handleChange('isActive')}
                            className="w-5 h-5 rounded border-glass-border text-accent-primary focus:ring-2 focus:ring-accent-primary/50"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-text-primary cursor-pointer">
                            فعال
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <GlassButton
                            type="submit"
                            variant="accent"
                            loading={loading}
                            className="flex-1"
                        >
                            {mode === 'add' ? 'افزودن' : 'ذخیره تغییرات'}
                        </GlassButton>
                        <GlassButton
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            انصراف
                        </GlassButton>
                    </div>
                </form>
            </div>
        </div>
    );
};
