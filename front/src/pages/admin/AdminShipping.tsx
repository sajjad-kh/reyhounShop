import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { shippingMethodService } from '../../services/shippingMethodService';
import { ShippingMethod } from '../../types/shipping';
import { ShippingMethodModal, ShippingMethodFormData } from '../../components/admin/ShippingMethodModal';
import { Plus, Edit2, Trash2, RefreshCw, Package, Truck } from 'lucide-react';

const ShippingMethodsManagement: React.FC = () => {
    const [basalamMethods, setBasalamMethods] = useState<ShippingMethod[]>([]);
    const [internalMethods, setInternalMethods] = useState<ShippingMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);

    // helper
    const isBasalam = (m: ShippingMethod) => m.basalamId != null;

    useEffect(() => {
        fetchShippingMethods();
    }, []);

    const fetchShippingMethods = async () => {
        try {
            setLoading(true);

            const allMethods = await shippingMethodService.getShippingMethods(false);

            setBasalamMethods(allMethods.filter(isBasalam));
            setInternalMethods(allMethods.filter(m => !isBasalam(m)));

        } catch (error) {
            console.error('Error fetching shipping methods:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const token = localStorage.getItem('basalam_token');

        if (!token?.trim()) {
            alert('لطفاً ابتدا توکن Basalam را وارد کنید');
            return;
        }

        try {
            setSyncing(true);

            await shippingMethodService.syncShippingMethods(token);
            await fetchShippingMethods();

            alert('همگام‌سازی با موفقیت انجام شد');
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'خطا در همگام‌سازی');
        } finally {
            setSyncing(false);
        }
    };

    const handleEdit = (method: ShippingMethod) => {
        setSelectedMethod(method);
        setShowEditModal(true);
    };

    const handleDelete = async (method: ShippingMethod) => {
        if (!confirm(`حذف "${method.name}" انجام شود؟`)) return;

        try {
            await shippingMethodService.deleteShippingMethod(method.id);
            await fetchShippingMethods();
            alert('حذف شد');
        } catch (error: any) {
            alert(error.message || 'خطا در حذف');
        }
    };

    const handleSave = async (data: ShippingMethodFormData) => {
        try {
            if (selectedMethod) {
                await shippingMethodService.updateShippingMethod(selectedMethod.id, data);
            } else {
                await shippingMethodService.createShippingMethod(data);
            }

            await fetchShippingMethods();
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedMethod(null);
    };

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('fa-IR').format(price) + ' تومان';

    const renderCard = (method: ShippingMethod) => {
        const basalam = isBasalam(method);

        return (
            <div
                key={method.id}
                className="p-4 bg-glass-light rounded-xl border border-glass-border hover:bg-glass-medium transition-all"
            >
                <div          
                    className="flex items-start justify-between">

                    {/* INFO */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">

                            {basalam ? (
                                <Package className="w-5 h-5 text-blue-500" />
                            ) : (
                                <Truck className="w-5 h-5 text-green-500" />
                            )}

                            <h3 className="text-lg font-semibold text-text-primary">
                                {method.name}
                            </h3>

                            {!method.isActive && (
                                <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded-full">
                                    غیرفعال
                                </span>
                            )}
                        </div>

                        {method.description && (
                            <p className="text-sm text-text-secondary mb-3">
                                {method.description}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-text-muted">هزینه:</span>
                                <span className="mr-2 text-text-primary">
                                    {formatPrice(method.baseCost)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2 mr-4">
                        <button
                            onClick={() => handleEdit(method)}
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-500"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>

                        {!basalam && (
                            <button
                                onClick={() => handleDelete(method)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-text-secondary">
                در حال بارگذاری...
            </div>
        );
    }

    return (
        <div className="p-6">

            {/* HEADER */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-text-primary">
                    مدیریت روش‌های ارسال
                </h1>
                <p className="text-text-secondary">
                    مدیریت ارسال‌های داخلی و Basalam
                </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 mb-6">

                <GlassButton
                    onClick={handleSync}
                    loading={syncing}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Sync Basalam
                </GlassButton>

                <GlassButton
                    onClick={() => setShowAddModal(true)}
                    variant="accent"
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    افزودن
                </GlassButton>

            </div>

            {/* CONTENT */}
            <GlassCard className="p-6 space-y-6">

                {/* BASALAM */}
                {basalamMethods.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-blue-500 mb-3">
                            <Package className="w-5 h-5" />
                            Basalam ({basalamMethods.length})
                        </div>
                        {basalamMethods.map(renderCard)}
                    </div>
                )}

                {/* INTERNAL */}
                <div>
                    <div className="flex items-center gap-2 text-green-500 mb-3">
                        <Truck className="w-5 h-5" />
                        Internal ({internalMethods.length})
                    </div>
                    {internalMethods.map(renderCard)}
                </div>

            </GlassCard>

            {/* MODALS */}
            <ShippingMethodModal
                isOpen={showAddModal}
                onClose={closeModal}
                onSave={handleSave}
                mode="add"
            />

            <ShippingMethodModal
                isOpen={showEditModal}
                onClose={closeModal}
                onSave={handleSave}
                method={selectedMethod}
                mode="edit"
            />

        </div>
    );
};

export default ShippingMethodsManagement;