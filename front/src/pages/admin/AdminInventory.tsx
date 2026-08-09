import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassPagination } from '../../components/ui/GlassPagination';
import { inventoryService, InventoryItem, InventoryStats, InventoryQuery } from '../../services/inventoryService';
import { Search, AlertTriangle, Package, TrendingUp, ArrowUpDown, Edit2, Check, X } from 'lucide-react';
import { toast } from '../../utils/toast';

const STATUS_CONFIG = {
    IN_STOCK: { label: 'موجود', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    LOW_STOCK: { label: 'کم موجود', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
    OUT_OF_STOCK: { label: 'ناموجود', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
};

const AdminInventory: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [stats, setStats] = useState<InventoryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'stock' | 'reservedStock' | 'price'>('stock');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editStock, setEditStock] = useState('');
    const [editAlert, setEditAlert] = useState('');

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const query: InventoryQuery = {
                page,
                limit: 20,
                sortBy,
                sortOrder,
                ...(search && { search }),
                ...(lowStockOnly && { lowStockOnly: true }),
            };

            const result = await inventoryService.getInventory(query);
            if (result.success && result.data) {
                setInventory(result.data.inventory);
                setTotalPages(result.data.pagination.pages);
            }
        } catch {
            toast.error('خطا در دریافت اطلاعات انبار');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const result = await inventoryService.getStats();
            if (result.success && result.data) {
                setStats(result.data);
            }
        } catch {}
    };

    useEffect(() => {
        fetchInventory();
    }, [page, search, lowStockOnly, sortBy, sortOrder]);

    useEffect(() => {
        fetchStats();
    }, []);

    const handleUpdateStock = async (productId: number) => {
        const stock = parseInt(editStock);
        const lowStockAlert = parseInt(editAlert);

        if (isNaN(stock) || stock < 0) {
            toast.error('موجودی باید عدد مثبت باشد');
            return;
        }

        try {
            const result = await inventoryService.updateStock(productId, {
                stock,
                ...(isNaN(lowStockAlert) ? {} : { lowStockAlert }),
            });

            if (result.success) {
                toast.success('موجودی با موفقیت بروزرسانی شد');
                setEditingId(null);
                fetchInventory();
                fetchStats();
            } else {
                toast.error(result.error || 'خطا در بروزرسانی موجودی');
            }
        } catch {
            toast.error('خطا در بروزرسانی موجودی');
        }
    };

    const startEditing = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditStock(String(item.stock));
        setEditAlert(String(item.lowStockAlert));
    };

    const toggleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text-primary">مدیریت انبار</h1>
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-text-muted" />
                    <span className="text-sm text-text-muted">
                        {inventory.length} محصول
                    </span>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard className="p-4">
                        <div className="text-sm text-text-muted">کل محصولات</div>
                        <div className="text-2xl font-bold text-text-primary">
                            {stats.totalProducts.toLocaleString('fa-IR')}
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <div className="text-sm text-text-muted">موجود</div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {stats.inStockProducts.toLocaleString('fa-IR')}
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <div className="text-sm text-text-muted">کم موجود</div>
                        <div className="text-2xl font-bold text-amber-400">
                            {stats.lowStockProducts.toLocaleString('fa-IR')}
                        </div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <div className="text-sm text-text-muted">ناموجود</div>
                        <div className="text-2xl font-bold text-red-400">
                            {stats.outOfStockProducts.toLocaleString('fa-IR')}
                        </div>
                    </GlassCard>
                </div>
            )}

            <GlassCard className="p-4">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <GlassInput
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="جستجوی محصول..."
                            className="pr-10"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    </div>
                    <GlassButton
                        variant={lowStockOnly ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
                    >
                        <AlertTriangle className="w-4 h-4 ml-2" />
                        فقط کم موجود
                    </GlassButton>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner />
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        محصولی یافت نشد
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-right py-3 px-4 text-text-muted font-medium">محصول</th>
                                    <th className="text-right py-3 px-4 text-text-muted font-medium">دسته‌بندی</th>
                                    <th
                                        className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary"
                                        onClick={() => toggleSort('stock')}
                                    >
                                        <span className="flex items-center gap-1">
                                            موجودی
                                            <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th
                                        className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary"
                                        onClick={() => toggleSort('reservedStock')}
                                    >
                                        <span className="flex items-center gap-1">
                                            رزرو شده
                                            <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th className="text-right py-3 px-4 text-text-muted font-medium">قابل فروش</th>
                                    <th
                                        className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary"
                                        onClick={() => toggleSort('price')}
                                    >
                                        <span className="flex items-center gap-1">
                                            هشدار کم موجودی
                                            <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th className="text-right py-3 px-4 text-text-muted font-medium">وضعیت</th>
                                    <th className="text-center py-3 px-4 text-text-muted font-medium">عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map((item) => {
                                    const status = STATUS_CONFIG[item.stockStatus];
                                    const isEditing = editingId === item.id;

                                    return (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    {item.mainImage && (
                                                        <img
                                                            src={item.mainImage}
                                                            alt={item.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    )}
                                                    <span className="text-text-primary font-medium">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-text-secondary">
                                                {item.category?.name || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editStock}
                                                        onChange={(e) => setEditStock(e.target.value)}
                                                        className="w-20 px-2 py-1 bg-glass-light border border-glass-border rounded text-text-primary text-sm"
                                                        min="0"
                                                    />
                                                ) : (
                                                    <span className="text-text-primary font-medium">
                                                        {item.stock.toLocaleString('fa-IR')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-text-secondary">
                                                {item.reservedStock.toLocaleString('fa-IR')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`font-medium ${item.availableStock <= 0 ? 'text-red-400' : item.availableStock <= item.lowStockAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {item.availableStock.toLocaleString('fa-IR')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editAlert}
                                                        onChange={(e) => setEditAlert(e.target.value)}
                                                        className="w-20 px-2 py-1 bg-glass-light border border-glass-border rounded text-text-primary text-sm"
                                                        min="0"
                                                    />
                                                ) : (
                                                    <span className="text-text-secondary">
                                                        {item.lowStockAlert.toLocaleString('fa-IR')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStock(item.id)}
                                                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEditing(item)}
                                                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <GlassPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    className="mt-4 pt-4 border-t border-white/10"
                />
            </GlassCard>
        </div>
    );
};

export default AdminInventory;
