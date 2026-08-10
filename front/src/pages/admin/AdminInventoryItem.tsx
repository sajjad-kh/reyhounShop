import React, { useEffect, useState, useRef } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassPagination } from '../../components/ui/GlassPagination';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import GlowCircle from '../../components/ui/GlowCircle';
import {
  inventoryItemService,
  InventoryItemData,
  InventoryItemStats,
  InventoryMovement,
  CreateInventoryItem,
  AdjustStock,
} from '../../services/inventoryItemService';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  X,
  Check,
  History,
  Upload,
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { ImportPreviewModal } from './ImportPreviewModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { formatNumber, toPersianDigits } from '../../utils/format';
import { GlassModal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/GlassModal';

const STATUS_CONFIG = {
  IN_STOCK: { label: 'موجود', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  LOW_STOCK: { label: 'کم موجود', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  OUT_OF_STOCK: { label: 'ناموجود', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
};

const emptyForm: CreateInventoryItem = {
  name: '',
  sku: '',
  description: '',
  quantity: 0,
  lowStockAlert: 5,
  unit: 'عدد',
  costPrice: undefined,
  sellPrice: undefined,
  location: '',
  supplier: '',
  minOrderQty: 1,
};

const AdminInventoryItem: React.FC = () => {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [stats, setStats] = useState<InventoryItemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'costPrice' | 'sellPrice' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateInventoryItem>({ ...emptyForm });

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItemData | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustStock>({ type: 'IN', quantity: 1, note: '' });

  const [showHistory, setShowHistory] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItemData | null>(null);
  const [historyMovements, setHistoryMovements] = useState<InventoryMovement[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<{
    file: File;
    items: any[];
    parseErrors: any[];
    totalRows: number;
    validRows: number;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const result = await inventoryItemService.getAll({
        page,
        limit: 20,
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(lowStockOnly && { lowStockOnly: true }),
      });
      if (result.success && result.data) {
        setItems(result.data.items);
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
      const result = await inventoryItemService.getStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchItems();
  }, [page, search, lowStockOnly, sortBy, sortOrder, refreshKey]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (showHistory && historyItem) {
      fetchMovements(historyItem.id, historyPage);
    }
  }, [historyPage]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('نام کالا الزامی است');
      return;
    }
    try {
      const result = editingId
        ? await inventoryItemService.update(editingId, form)
        : await inventoryItemService.create(form);
      if (result.success) {
        toast.success(editingId ? 'کالا بروزرسانی شد' : 'کالا اضافه شد');
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        setRefreshKey((k) => k + 1);
        fetchStats();
      } else {
        toast.error(result.error || 'خطا');
      }
    } catch {
      toast.error('خطا در ذخیره');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    try {
      const result = await inventoryItemService.delete(id);
      if (result.success) {
        toast.success('کالا حذف شد');
        setRefreshKey((k) => k + 1);
        fetchStats();
      } else {
        toast.error(result.error || 'خطا در حذف');
      }
    } catch {
      toast.error('خطا در حذف');
    }
  };

  const handleAdjust = async () => {
    if (!adjustItem || adjustForm.quantity <= 0) return;
    try {
      const result = await inventoryItemService.adjustStock(adjustItem.id, adjustForm);
      if (result.success) {
        toast.success('موجودی بروزرسانی شد');
        setShowAdjust(false);
        setAdjustItem(null);
        setRefreshKey((k) => k + 1);
        fetchStats();
      } else {
        toast.error(result.error || 'خطا');
      }
    } catch {
      toast.error('خطا در بروزرسانی موجودی');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await inventoryItemService.importFromExcel(file);
      if (result.success && result.data) {
        const { items, parseErrors, totalRows, validRows } = result.data;
        if (items.length === 0 && parseErrors.length === 0) {
          toast.error('فایل خالی است');
          return;
        }
        setPreviewData({ file, items, parseErrors, totalRows, validRows });
      } else {
        toast.error(result.error || 'خطا در خواندن فایل');
      }
    } catch {
      toast.error('خطا در آپلود فایل');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSampleTemplate = () => {
    const headers = ['نام', 'کد', 'تعداد', 'واحد', 'قیمت خرید', 'قیمت فروش', 'حد هشدار', 'محل', 'تامین کننده', 'توضیحات'];
    const sampleRows = [
      ['کلاه آبی', 'KL-001', 50, 'عدد', 15000, 25000, 10, 'انبار اصلی', 'تامین کننده الف', 'نمونه'],
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('فایل نمونه دانلود شد');
  };

  const openEdit = (item: InventoryItemData) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku || '',
      description: item.description || '',
      quantity: item.quantity,
      lowStockAlert: item.lowStockAlert,
      unit: item.unit || 'عدد',
      costPrice: item.costPrice || undefined,
      sellPrice: item.sellPrice || undefined,
      location: item.location || '',
      supplier: item.supplier || '',
      minOrderQty: item.minOrderQty,
    });
    setShowForm(true);
  };

  const openAdjust = (item: InventoryItemData) => {
    setAdjustItem(item);
    setAdjustForm({ type: 'IN', quantity: 1, note: '' });
    setShowAdjust(true);
  };

  const openHistory = async (item: InventoryItemData) => {
    setHistoryItem(item);
    setHistoryPage(1);
    setShowHistory(true);
    await fetchMovements(item.id, 1);
  };

  const fetchMovements = async (itemId: number, pg: number) => {
    try {
      setHistoryLoading(true);
      const result = await inventoryItemService.getMovements(itemId, pg, 8);
      if (result.success && result.data) {
        setHistoryMovements(result.data.movements);
        setHistoryTotalPages(result.data.pagination.pages);
      }
    } catch {} finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">مدیریت انبار (مستقل)</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <GlassButton variant="secondary" onClick={downloadSampleTemplate} className="flex-1 sm:flex-none w-full sm:w-auto justify-center">
            <span>دانلود فایل نمونه</span>
          </GlassButton>
          <GlassButton variant="secondary" loading={importing} onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none w-full sm:w-auto justify-center">
            <Upload className="w-4 h-4 ml-2 shrink-0" />
            <span>ورود از اکسل</span>
          </GlassButton>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          <GlassButton onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); }} className="flex-1 sm:flex-none w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 ml-2 shrink-0" />
            <span>افزودن کالا</span>
          </GlassButton>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="relative overflow-hidden p-3 sm:p-4">
            <GlowCircle size="md" color="accent" position="top-right" opacity={0.5} />
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-xs sm:text-sm text-white">کل اقلام</p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-text-primary" dir="ltr">
                {formatNumber(stats.totalItems)}
              </div>
            </div>
          </GlassCard>
          <GlassCard className="relative overflow-hidden p-3 sm:p-4">
            <GlowCircle size="md" color="success" position="top-right" opacity={0.5} />
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-xs sm:text-sm text-white">موجود</p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400" dir="ltr">
                {formatNumber(stats.totalItems - stats.lowStockItems)}
              </div>
            </div>
          </GlassCard>
          <GlassCard className="relative overflow-hidden p-3 sm:p-4">
            <GlowCircle size="md" color="warning" position="top-right" opacity={0.5} />
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-xs sm:text-sm text-text-muted">کم موجود</p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-amber-400" dir="ltr">
                {formatNumber(stats.lowStockItems)}
              </div>
            </div>
          </GlassCard>
          <GlassCard className="relative overflow-hidden p-3 sm:p-4">
            <GlowCircle size="md" color="error" position="top-right" opacity={0.5} />
            <div className="flex items-center justify-between">
              <div>
                 <p className="text-xs sm:text-sm text-white">ناموجود</p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-red-400" dir="ltr">
                {formatNumber(stats.outOfStockItems)}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <GlassInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="جستجوی نام یا کد کالا..."
              className="pr-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          </div>
          <div className={`relative ${lowStockOnly ? 'after:absolute after:-top-1 after:-left-1 after:w-3 after:h-3 after:rounded-full after:bg-amber-400 after:shadow-lg after:shadow-amber-400/50 after:animate-pulse' : ''}`}>
            <GlassButton
              variant={lowStockOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
              className={lowStockOnly ? 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20' : ''}
            >
              <AlertTriangle className={`w-4 h-4 ml-2 ${lowStockOnly ? 'text-amber-400' : ''}`} />
              فقط کم موجود
              {lowStockOnly && stats && <span className="mr-1.5 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-400 text-xs font-bold">{formatNumber(stats.lowStockItems)}</span>}
            </GlassButton>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-muted">کالایی یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">نام کالا <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">کد (SKU)</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary" onClick={() => toggleSort('quantity')}>
                    <span className="flex items-center gap-1">تعداد <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">واحد</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">هشدار</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary" onClick={() => toggleSort('costPrice')}>
                    <span className="flex items-center gap-1">قیمت تمام شده <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium cursor-pointer hover:text-text-primary" onClick={() => toggleSort('sellPrice')}>
                    <span className="flex items-center gap-1">قیمت فروش <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">وضعیت</th>
                  <th className="text-center py-3 px-4 text-text-muted font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = item.stockStatus || 'IN_STOCK';
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-text-primary font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-text-secondary font-mono text-xs">{item.sku || '-'}</td>
                      <td className="py-3 px-4 font-medium text-text-primary">{formatNumber(item.quantity)}</td>
                      <td className="py-3 px-4 text-text-secondary">{item.unit || '-'}</td>
                      <td className="py-3 px-4 text-text-secondary">{formatNumber(item.lowStockAlert)}</td>
                      <td className="py-3 px-4 text-text-secondary">{formatNumber(item.costPrice)}</td>
                      <td className="py-3 px-4 text-text-secondary">{formatNumber(item.sellPrice)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openAdjust(item)} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10" title="تعدیل موجودی">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => openHistory(item)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10" title="تاریخچه">
                            <History className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10" title="ویرایش">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id, name: item.name })} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      <GlassModal isOpen={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} size="lg">
        <ModalHeader
          icon={editingId ? <Edit2 className="w-5 h-5 text-accent-primary" /> : <Package className="w-5 h-5 text-accent-primary" />}
          title={editingId ? 'ویرایش کالا' : 'افزودن کالای جدید'}
          subtitle={editingId ? 'اطلاعات کالا را ویرایش کنید' : 'اطلاعات کالای جدید را وارد کنید'}
          onClose={() => { setShowForm(false); setEditingId(null); }}
        />

        <ModalBody className="!space-y-6">
          {/* بخش اطلاعات پایه */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-accent-primary" />
              <h3 className="text-sm font-semibold text-text-primary">اطلاعات پایه</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">نام کالا <span className="text-red-400">*</span></label>
                <GlassInput value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="مثال: جوهر چاپ CMYK" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">کد کالا (SKU)</label>
                  <GlassInput value={form.sku || ''} onChange={(value) => setForm({ ...form, sku: value })} placeholder="اختیاری" className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">واحد</label>
                  <DropdownSelect
                    options={[
                      { value: 'عدد', label: 'عدد' },
                      { value: 'کیلوگرم', label: 'کیلوگرم' },
                      { value: 'گرم', label: 'گرم' },
                      { value: 'متر', label: 'متر' },
                      { value: 'سانتی‌متر', label: 'سانتی‌متر' },
                      { value: 'لیتر', label: 'لیتر' },
                      { value: 'بسته', label: 'بسته' },
                      { value: 'رول', label: 'رول' },
                      { value: 'ورق', label: 'ورق' },
                    ]}
                    value={form.unit || 'عدد'}
                    onChange={(v) => setForm({ ...form, unit: v })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">حداقل سفارش</label>
                  <input type="number" min={1} value={form.minOrderQty || 1} onChange={(e) => setForm({ ...form, minOrderQty: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">توضیحات</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="توضیحات تکمیلی درباره کالا..." className="w-full px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50" />
              </div>
            </div>
          </div>

          {/* بخش موجودی و قیمت */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold text-text-primary">موجودی و قیمت</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  {editingId ? 'تعداد فعلی (قابل تغییر از تعدیل)' : 'تعداد اولیه'}
                </label>
                {editingId ? (
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-text-primary">{formatNumber(form.quantity || 0)}</span>
                    <span className="text-[10px] text-text-muted">فقط از طریق تعدیل</span>
                  </div>
                ) : (
                  <input type="number" min={0} value={form.quantity || 0} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-transparent border-0 text-text-primary text-lg font-bold focus:outline-none" />
                )}
                <div className="flex items-center gap-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${(form.quantity || 0) <= 0 ? 'bg-red-400' : (form.quantity || 0) <= (form.lowStockAlert || 5) ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className="text-[10px] text-text-muted">
                    {(form.quantity || 0) <= 0 ? 'ناموجود' : (form.quantity || 0) <= (form.lowStockAlert || 5) ? 'کم موجود' : 'موجود'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <label className="block text-xs font-medium text-text-muted mb-1.5">هشدار کم موجودی</label>
                <input type="number" min={0} value={form.lowStockAlert || 5} onChange={(e) => setForm({ ...form, lowStockAlert: parseInt(e.target.value) || 5 })} className="w-full px-3 py-2 bg-transparent border-0 text-amber-400 text-lg font-bold focus:outline-none" />
                <div className="text-[10px] text-text-muted mt-1">زیر این تعداد هشدار داده می‌شود</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <label className="block text-xs font-medium text-text-muted mb-1.5">قیمت تمام شده (تومان)</label>
                <input type="number" min={0} value={form.costPrice || ''} onChange={(e) => setForm({ ...form, costPrice: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="0" className="w-full px-3 py-2 bg-transparent border-0 text-text-primary text-lg font-bold placeholder:text-text-muted/30 focus:outline-none" />
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <label className="block text-xs font-medium text-text-muted mb-1.5">قیمت فروش (تومان)</label>
                <input type="number" min={0} value={form.sellPrice || ''} onChange={(e) => setForm({ ...form, sellPrice: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="0" className="w-full px-3 py-2 bg-transparent border-0 text-accent-primary text-lg font-bold placeholder:text-accent-primary/30 focus:outline-none" />
                {form.costPrice && form.sellPrice && (
                  <div className="text-[10px] text-emerald-400 mt-1">
                    سود: {((form.sellPrice - form.costPrice) / form.costPrice * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* بخش محل نگهداری */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary">محل نگهداری و تامین</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">محل نگهداری</label>
                <GlassInput value={form.location || ''} onChange={(value) => setForm({ ...form, location: value })} placeholder="رف ۳، طبقه ۲، ردیف B" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">تامین کننده</label>
                <GlassInput value={form.supplier || ''} onChange={(value) => setForm({ ...form, supplier: value })} placeholder="نام شرکت تامین کننده" />
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <GlassButton variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>
            انصراف
          </GlassButton>
          <GlassButton variant="primary" onClick={handleCreate}>
            <Check className="w-4 h-4 ml-2 shrink-0" />
            {editingId ? 'بروزرسانی' : 'ذخیره کالا'}
          </GlassButton>
        </ModalFooter>
      </GlassModal>

      <GlassModal isOpen={showAdjust} onClose={() => { setShowAdjust(false); setAdjustItem(null); }} size="md">
        <ModalHeader
          icon={<ArrowUp className="w-5 h-5 text-accent-primary" />}
          title="تعدیل موجودی"
          subtitle={adjustItem?.name}
          onClose={() => { setShowAdjust(false); setAdjustItem(null); }}
        />

        <ModalBody>
          {adjustItem && (
            <>
              <div className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-center">
                  <div className="text-xs text-text-muted mb-1">موجودی فعلی</div>
                  <div className="text-2xl sm:text-3xl font-bold text-text-primary">
                    {formatNumber(adjustItem.quantity)}
                  </div>
                  <div className="text-xs text-text-muted mt-1">{adjustItem.unit}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">نوع عملیات</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'IN', label: 'ورود', icon: ArrowDown, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
                    { value: 'OUT', label: 'خروج', icon: ArrowUp, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
                    { value: 'RETURN', label: 'برگشت', icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
                    { value: 'ADJUST', label: 'اصلاح', icon: Edit2, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAdjustForm({ ...adjustForm, type: opt.value as any })}
                      className={`flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl border transition-all ${
                        adjustForm.type === opt.value
                          ? `${opt.bg} ${opt.border} ${opt.color}`
                          : 'border-white/5 text-text-muted hover:bg-white/5'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">تعداد</label>
                <input
                  type="text"
                  inputMode="numeric"
                  min={1}
                  value={toPersianDigits(adjustForm.quantity)}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value.replace(/[^\d۰-۹]/g, '').replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))) || 1 })}
                  className="w-full px-4 py-3 bg-glass-light border border-glass-border rounded-xl text-text-primary text-center text-xl sm:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">توضیح (اختیاری)</label>
                <GlassInput value={adjustForm.note || ''} onChange={(value) => setAdjustForm({ ...adjustForm, note: value })} placeholder="دلیل تعدیل..." />
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <GlassButton variant="secondary" onClick={() => { setShowAdjust(false); setAdjustItem(null); }}>لغو</GlassButton>
          <GlassButton variant="primary" onClick={handleAdjust}>
            <Check className="w-4 h-4 ml-2 shrink-0" />
            تایید تعدیل
          </GlassButton>
        </ModalFooter>
      </GlassModal>

      <GlassModal isOpen={showHistory} onClose={() => { setShowHistory(false); setHistoryItem(null); }} size="md">
        <ModalHeader
          icon={<History className="w-5 h-5 text-blue-400" />}
          title="تاریخچه تغییرات"
          subtitle={historyItem?.name}
          onClose={() => { setShowHistory(false); setHistoryItem(null); }}
        />

        <ModalBody className="!space-y-2">
          {historyLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : historyMovements.length === 0 ? (
            <div className="text-center py-8 text-text-muted">تاریخچه‌ای وجود ندارد</div>
          ) : (
            historyMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className={`p-2 rounded-lg shrink-0 ${m.type === 'IN' || m.type === 'RETURN' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                  {m.type === 'IN' || m.type === 'RETURN' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">
                    {m.type === 'IN' ? 'ورود' : m.type === 'OUT' ? 'خروج' : m.type === 'RETURN' ? 'برگشت' : 'اصلاح'}: {formatNumber(m.quantity)}
                  </div>
                  {m.note && <div className="text-xs text-text-muted mt-0.5 truncate">{m.note}</div>}
                </div>
                <div className="text-xs text-text-muted shrink-0">
                  {new Date(m.createdAt).toLocaleDateString('fa-IR')}
                </div>
              </div>
            ))
          )}
        </ModalBody>

        {historyTotalPages > 1 && (
          <div className="px-4 sm:px-6 pb-4">
            <GlassPagination
              currentPage={historyPage}
              totalPages={historyTotalPages}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </GlassModal>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="حذف کالا"
        message={`آیا از حذف "${confirmDelete.name}" مطمئن هستید؟`}
        confirmText="حذف"
        cancelText="لغو"
        type="danger"
        onConfirm={() => confirmDelete.id && handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
      />

      {previewData && (
        <ImportPreviewModal
          file={previewData.file}
          items={previewData.items}
          parseErrors={previewData.parseErrors}
          totalRows={previewData.totalRows}
          validRows={previewData.validRows}
          onClose={() => setPreviewData(null)}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
            fetchStats();
          }}
        />
      )}
    </div>
  );
};

export default AdminInventoryItem;
