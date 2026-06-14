import React, { useEffect, useState } from 'react';
import { ShippingMethod } from '../../types/shipping';
import { ShippingMethodCard } from './ShippingMethodCard';
import { ShippingMethodListSkeleton } from './ShippingMethodSkeleton';
import { shippingMethodService } from '../../services/shippingMethodService';

export interface ShippingMethodSelectorProps {
    selectedIds?: number[];
    onChange: (selectedIds: number[]) => void;
    onCostChange?: (cost: number) => void;
    onMethodsLoaded?: (methods: ShippingMethod[]) => void; // ✅ اضافه شد
    multiple?: boolean;
    productId?: number;
    showCost?: boolean;
    disabled?: boolean;
    required?: boolean;
    errorMessage?: string;
}

export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
    selectedIds = [],
    onChange,
    onCostChange,
    onMethodsLoaded,
    multiple = false,
    showCost = true,
    disabled = false,
    required = false,
    errorMessage,
}) => {
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        fetchShippingMethods();
    }, []);

    // ✅ ارسال لیست به parent
    useEffect(() => {
        if (onMethodsLoaded) {
            onMethodsLoaded(shippingMethods);
        }
    }, [shippingMethods, onMethodsLoaded]);

    useEffect(() => {
        if (required && selectedIds.length === 0) {
            setValidationError('لطفاً حداقل یک روش ارسال انتخاب کنید');
        } else {
            setValidationError(null);
        }
    }, [selectedIds, required]);

    const fetchShippingMethods = async () => {
        try {
            setLoading(true);
            setError(null);

            let methods: ShippingMethod[] =
                await shippingMethodService.getShippingMethods(false);

            methods = methods.filter(m => m.basalamId == null);

            setShippingMethods(methods);
        } catch (err: any) {
            console.error(err);
            setError('خطا در دریافت روش‌های ارسال');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (methodId: number) => {
        if (disabled) return;

        let newSelected: number[] = [];

        if (multiple) {
            if (selectedIds.includes(methodId)) {
                newSelected = selectedIds.filter(id => id !== methodId);
            } else {
                newSelected = [...selectedIds, methodId];
            }
        } else {
            newSelected = [methodId];
        }

        onChange(newSelected);

        const selectedMethod = shippingMethods.find(m => m.id === methodId);

        if (selectedMethod && onCostChange) {
            onCostChange(selectedMethod.baseCost || 0);
        }
    };

    const handleRetry = () => {
        fetchShippingMethods();
    };

    const filteredMethods = React.useMemo(() => {
        if (!searchQuery.trim()) return shippingMethods;

        const q = searchQuery.toLowerCase();

        return (shippingMethods || []).filter(method =>
            method.name.toLowerCase().includes(q) ||
            (method.description && method.description.toLowerCase().includes(q))
        );
    }, [shippingMethods, searchQuery]);

    if (loading) return <ShippingMethodListSkeleton />;

    if (error) {
        return (
            <div className="glass-card p-6 border border-red-500/30">
                <p className="text-red-400 mb-3">{error}</p>
                <button onClick={handleRetry} className="glass-button px-4 py-2">
                    تلاش مجدد
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">
                    {multiple ? 'انتخاب روش‌های ارسال' : 'انتخاب روش ارسال'}
                </h3>

                <span className="text-white/60 text-sm">
                    {filteredMethods.length} روش
                </span>
            </div>

            <p className="text-white/60 text-sm">
                {multiple
                    ? 'می‌توانید چند روش انتخاب کنید'
                    : 'یک روش ارسال انتخاب کنید'}
                {required && <span className="text-red-400 mr-1">*</span>}
            </p>

            {shippingMethods.length > 3 && (
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو..."
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    disabled={disabled}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMethods.map(method => (
                    <ShippingMethodCard
                        key={method.id}
                        shippingMethod={method}
                        selected={selectedIds.includes(method.id)}
                        onSelect={() => handleSelect(method.id)}
                        showCost={showCost}
                        disabled={disabled}
                        selectionMode={multiple ? 'checkbox' : 'radio'}
                    />
                ))}
            </div>

            {(validationError || errorMessage) && (
                <div className="text-red-400 text-sm">
                    {errorMessage || validationError}
                </div>
            )}
        </div>
    );
};