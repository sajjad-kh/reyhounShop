import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { shippingMethodService } from '../../services/shippingMethodService';
import { ShippingMethod } from '../../types/shipping';
import { ShippingMethodModal, ShippingMethodFormData } from '../../components/admin/ShippingMethodModal';
import { Plus, Edit2, Trash2, RefreshCw, Package, Truck } from 'lucide-react';

type TabType = 'basalam' | 'internal';

const ShippingMethodsManagement: React.FC = () => {
    const [methods, setMethods] = useState<ShippingMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const [activeTab, setActiveTab] = useState<TabType>('internal');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);

    const isBasalam = (m: ShippingMethod) => m.basalamId != null;

    useEffect(() => {
        fetchShippingMethods();
    }, []);

    const fetchShippingMethods = async () => {
        try {
            setLoading(true);
            const allMethods = await shippingMethodService.getShippingMethods(false);
            setMethods(Array.isArray(allMethods) ? allMethods : []);
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

            // 🔥 optimistic remove
            setMethods(prev => prev.filter(m => m.id !== method.id));

            alert('حذف شد');
        } catch (error: any) {
            alert(error.message || 'خطا در حذف');
        }
    };

    // 🔥 FIX اصلی اینجاست
    const handleSave = async (data: ShippingMethodFormData) => {
        try {
            if (selectedMethod) {
                const updated = await shippingMethodService.updateShippingMethod(
                    selectedMethod.id,
                    data
                );

                // update فوری UI
                setMethods(prev =>
                    prev.map(m => (m.id === updated.id ? updated : m))
                );

            } else {
                const created = await shippingMethodService.createShippingMethod(data);

                // add فوری بدون refresh
                setMethods(prev => [created, ...prev]);
            }

            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedMethod(null);

        } catch (error) {
            console.error(error);

            // fallback safe refresh
            await fetchShippingMethods();
            throw error;
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedMethod(null);
    };

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('fa-IR').format(price) + ' ریال';

    const filteredMethods =
        activeTab === 'basalam'
            ? methods.filter(isBasalam)
            : methods.filter(m => !isBasalam(m));

    const renderCard = (method: ShippingMethod) => {
        const basalam = isBasalam(method);

        return (
            <div
                key={method.id}
                className="p-4 bg-glass-light rounded-xl border border-glass-border hover:bg-glass-medium transition-all"
            >
                <div className="flex items-start justify-between">

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

                        <div className="text-sm">
                            <span className="text-text-muted">هزینه: </span>
                            <span className="text-text-primary">
                                {formatPrice(method.baseCost)}
                            </span>
                        </div>
                    </div>

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
        <div                    dir='rtl'
 className="p-6">

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

            {/* TABS */}
            <div className="flex gap-2 mb-4">

                <button
                    onClick={() => setActiveTab('internal')}
                    className={`px-4 py-2 rounded-lg transition ${
                        activeTab === 'internal'
                            ? 'bg-green-500 text-white'
                            : 'bg-glass-light text-text-secondary'
                    }`}
                >
                    Internal ({methods.filter(m => !isBasalam(m)).length})
                </button>

                <button
                    onClick={() => setActiveTab('basalam')}
                    className={`px-4 py-2 rounded-lg transition ${
                        activeTab === 'basalam'
                            ? 'bg-blue-500 text-white'
                            : 'bg-glass-light text-text-secondary'
                    }`}
                >
                    Basalam ({methods.filter(isBasalam).length})
                </button>

            </div>

            {/* CONTENT */}
            <GlassCard className="p-6 space-y-4">

                {filteredMethods.length > 0 ? (
                    filteredMethods.map(renderCard)
                ) : (
                    <p className="text-text-secondary text-center">
                        هیچ موردی وجود ندارد
                    </p>
                )}

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