import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassPagination } from '../../components/ui/GlassPagination';
import { tourService } from '../../services/tourService';
import { api } from '../../utils/api';
import { cn } from '../../utils';
import { TourStep, TourStepInput, TourPlacement } from '../../types/tour';
import { Plus, Pencil, Trash2, MousePointerClick, Crosshair, X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '../../utils/toast';
import { GlassModal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/GlassModal';

const PLACEMENTS: { value: TourPlacement; label: string }[] = [
    { value: 'auto', label: 'خودکار' },
    { value: 'top', label: 'بالا' },
    { value: 'bottom', label: 'پایین' },
    { value: 'left', label: 'چپ' },
    { value: 'right', label: 'راست' },
];

// Valid page keys — MUST match the outputs of `pageFromPath` in hooks/useTour.ts
const PAGE_OPTIONS: { value: string; label: string }[] = [
    { value: 'home', label: 'خانه (home)' },
    { value: 'products', label: 'لیست محصولات (products)' },
    { value: 'product-detail', label: 'جزئیات محصول (product-detail)' },
    { value: 'search', label: 'جستجو (search)' },
    { value: 'cart', label: 'سبد خرید (cart)' },
    { value: 'checkout', label: 'تسویه حساب (checkout)' },
    { value: 'dashboard', label: 'داشبورد - پروفایل (dashboard)' },
    { value: 'orders', label: 'تاریخچه سفارشات (orders)' },
    { value: 'wishlist', label: 'علاقه‌مندی‌ها (wishlist)' },
    { value: 'addresses', label: 'آدرس‌ها (addresses)' },
    { value: 'loyalty', label: 'امتیاز وفاداری (loyalty)' },
    { value: 'reviews', label: 'نظرات من (reviews)' },
    { value: 'order-confirmation', label: 'تایید سفارش (order-confirmation)' },
    { value: 'login', label: 'ورود (login)' },
    { value: 'register', label: 'ثبت‌نام (register)' },
    { value: 'basalam', label: 'باسلام - سبد (basalam)' },
    { value: 'basalam-cart', label: 'باسلام - سبد خرید (basalam-cart)' },
    { value: 'basalam-checkout', label: 'باسلام - تسویه (basalam-checkout)' },
    { value: 'basalam-orders', label: 'باسلام - سفارشات (basalam-orders)' },
];

// Native <option> elements don't inherit glass backgrounds correctly — a
// translucent bg makes the light text invisible until hover. Use a solid
// dark background so options are always readable.
const OPTION_CLASS = 'bg-[#1b1726] text-text-primary';

type SortKey = 'page' | 'selector' | 'title' | 'placement' | 'order' | 'isActive';

const SortIndicator: React.FC<{ active: boolean; dir: 'asc' | 'desc' }> = ({
    active,
    dir,
}) => {
    if (!active) return <span className="text-text-muted/40">↕</span>;
    return dir === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5" />
    ) : (
        <ChevronDown className="w-3.5 h-3.5" />
    );
};

const emptyForm: TourStepInput = {
    page: '',
    selector: '',
    title: '',
    description: '',
    order: 1,
    placement: 'auto',
    isActive: true,
};

export const TourManagement: React.FC = () => {
    const [steps, setSteps] = useState<TourStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TourStep | null>(null);
    const [form, setForm] = useState<TourStepInput>(emptyForm);
    const [saving, setSaving] = useState(false);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [previewPath, setPreviewPath] = useState('/');
    const [previewSrc, setPreviewSrc] = useState('/');

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
        key: 'order',
        dir: 'asc',
    });

    const toggleSort = (key: SortKey) => {
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        );
    };

    const processed = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = steps;

        if (q) {
            list = list.filter(
                (s) =>
                    s.page.toLowerCase().includes(q) ||
                    s.selector.toLowerCase().includes(q) ||
                    s.title.toLowerCase().includes(q) ||
                    s.placement.toLowerCase().includes(q) ||
                    (s.description || '').toLowerCase().includes(q)
            );
        }

        const dir = sort.dir === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => {
            let av: string | number;
            let bv: string | number;

            switch (sort.key) {
                case 'order':
                    av = a.order;
                    bv = b.order;
                    break;
                case 'isActive':
                    av = a.isActive ? 1 : 0;
                    bv = b.isActive ? 1 : 0;
                    break;
                default:
                    av = String((a as unknown as Record<string, unknown>)[sort.key] ?? '');
                    bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? '');
            }

            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [steps, search, sort]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setPage(1);
    }, [search, pageSize]);

    const total = processed.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const paged = processed.slice((safePage - 1) * pageSize, safePage * pageSize);

    const PAGE_PATHS: Record<string, string> = {
        home: '/',
        products: '/products',
        'product-detail': '/products',
        search: '/search',
        cart: '/cart',
        checkout: '/checkout',
        dashboard: '/dashboard',
        orders: '/dashboard/orders',
        wishlist: '/dashboard/wishlist',
        addresses: '/dashboard/addresses',
        loyalty: '/dashboard/loyalty',
        reviews: '/dashboard/reviews',
        'order-confirmation': '/orders/1',
        login: '/login',
        register: '/register',
        basalam: '/basalam/cart',
        'basalam-cart': '/basalam/cart',
        'basalam-checkout': '/basalam/checkout',
        'basalam-orders': '/basalam/orders',
    };

    const pickerSrc = (path: string) => `${path}${path.includes('?') ? '&' : '?'}tourPicker=1`;

    const openPicker = () => {
        const path = PAGE_PATHS[form.page] || '/';
        setPreviewPath(path);
        setPreviewSrc(pickerSrc(path));
        setPickerOpen(true);
    };

    // Receive the selector from the iframe SPA, which runs the picker itself
    // when opened with ?tourPicker=1. This avoids injecting inline scripts and
    // cross-document event capture, so navigation is reliably prevented.
    useEffect(() => {
        if (!pickerOpen) return;

        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data;
            if (data && data.type === 'tour-pick' && typeof data.selector === 'string') {
                setField('selector', data.selector);
                setPickerOpen(false);
            }
        };

        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [pickerOpen]);

    const load = async () => {
        try {
            setLoading(true);
            const data = await tourService.getAll();
            setSteps(data);
        } catch (err) {
            console.error('Load tour steps error:', err);
            toast.error('خطا در بارگذاری مراحل تور');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (step: TourStep) => {
        setEditing(step);
        setForm({
            page: step.page,
            selector: step.selector,
            title: step.title,
            description: step.description,
            order: step.order,
            placement: step.placement,
            isActive: step.isActive,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.page.trim() || !form.selector.trim() || !form.title.trim()) {
            toast.error('فیلدهای صفحه، سلکتور و عنوان الزامی هستند');
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await tourService.update(editing.id, form);
                toast.success('مرحله تور به‌روزرسانی شد');
            } else {
                await tourService.create(form);
                toast.success('مرحله تور ایجاد شد');
            }
            setModalOpen(false);
            api.clearCacheEntry('/admin/tours');
            await load();
        } catch (err) {
            console.error('Save tour step error:', err);
            toast.error('خطا در ذخیره مرحله تور');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('آیا از حذف این مرحله تور مطمئن هستید؟')) return;

        try {
            await tourService.remove(id);
            toast.success('مرحله تور حذف شد');
            api.clearCacheEntry('/admin/tours');
            await load();
        } catch (err) {
            console.error('Delete tour step error:', err);
            toast.error('خطا در حذف مرحله تور');
        }
    };

    const setField = <K extends keyof TourStepInput>(key: K, value: TourStepInput[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <MousePointerClick className="w-7 h-7 text-accent-primary" />
                    <h1 className="text-2xl font-bold text-text-primary">مدیریت تور راهنما</h1>
                </div>
                <GlassButton variant="accent" onClick={openAdd} className="flex items-center">
                    <Plus className="w-5 h-5 ml-1" />
                    افزودن مرحله
                </GlassButton>
            </div>

            <p className="text-sm text-text-muted mb-4">
                مراحل تور توسط ادمین تنظیم می‌شوند و در سمت کاربر (روی هر صفحه) به صورت خودکار یا
                با دکمه راهنما نمایش داده می‌شوند.
            </p>

            <div className="mb-4 max-w-sm">
                <GlassInput
                    value={search}
                    onChange={setSearch}
                    placeholder="جستجو در مراحل تور..."
                    icon={<Search className="w-5 h-5" />}
                />
            </div>

            <GlassCard className="p-4 overflow-x-auto">
                {loading ? (
                    <div className="py-10 text-center text-text-muted">در حال بارگذاری...</div>
                ) : steps.length === 0 ? (
                    <div className="py-10 text-center text-text-muted space-y-4">
                        <div>هنوز مرحله‌ای تعریف نشده است.</div>
                        <GlassButton variant="accent" onClick={openAdd}>
                            <Plus className="w-5 h-5 ml-1" />
                            افزودن مرحله
                        </GlassButton>
                    </div>
                ) : (
                    <table className="w-full text-right">
                        <thead>
                            <tr className="text-text-secondary text-sm border-b border-border-glass-light">
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('order')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        #<SortIndicator active={sort.key === 'order'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('page')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        صفحه<SortIndicator active={sort.key === 'page'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('selector')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        سلکتور<SortIndicator active={sort.key === 'selector'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('title')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        عنوان<SortIndicator active={sort.key === 'title'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('placement')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        موقعیت<SortIndicator active={sort.key === 'placement'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort('isActive')}
                                        className="inline-flex items-center gap-1 hover:text-text-primary"
                                    >
                                        فعال<SortIndicator active={sort.key === 'isActive'} dir={sort.dir} />
                                    </button>
                                </th>
                                <th className="py-3 px-2">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((step) => (
                                <tr
                                    key={step.id}
                                    className="border-b border-border-glass-light/50 text-text-primary"
                                >
                                    <td className="py-3 px-2">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-glass-light text-xs text-text-primary tabular-nums">
                                            {step.order}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <code className="text-xs bg-glass-light px-2 py-1 rounded">
                                            {step.page}
                                        </code>
                                    </td>
                                    <td className="py-3 px-2 max-w-[200px] truncate">
                                        <code className="text-xs bg-glass-light px-2 py-1 rounded">
                                            {step.selector}
                                        </code>
                                    </td>
                                    <td className="py-3 px-2">{step.title}</td>
                                    <td className="py-3 px-2">{step.placement}</td>
                                    <td className="py-3 px-2">
                                        {step.isActive ? (
                                            <span className="text-green-500 text-sm">بله</span>
                                        ) : (
                                            <span className="text-red-400 text-sm">خیر</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEdit(step)}
                                                className="p-2 rounded-lg hover:bg-glass-light transition-colors"
                                                title="ویرایش"
                                            >
                                                <Pencil className="w-4 h-4 text-text-secondary" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(step.id)}
                                                className="p-2 rounded-lg hover:bg-glass-light transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {total > 0 && (
                    <div className="mt-4 overflow-x-auto">
                        <div className="flex items-center justify-between gap-3 min-w-max">
                            <span className="whitespace-nowrap text-sm text-text-muted">
                                نمایش {(safePage - 1) * pageSize + 1} تا{' '}
                                {Math.min(safePage * pageSize, total)} از {total}
                            </span>

                            <div className="flex items-center gap-3">
                                <GlassPagination
                                    currentPage={safePage}
                                    totalPages={totalPages}
                                    onPageChange={(n) => setPage(n)}
                                    showInfo={false}
                                />

                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span>در صفحه:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        dir="ltr"
                                        className="px-2 py-1 bg-glass-light border border-glass-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                                    >
                                        {[5, 10, 20, 50].map((n) => (
                                            <option key={n} className={OPTION_CLASS} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>

{/* Add / Edit Modal */}
            <GlassModal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
                <ModalHeader
                    title={editing ? 'ویرایش مرحله تور' : 'افزودن مرحله تور'}
                    onClose={() => setModalOpen(false)}
                />

                <ModalBody>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">
                                    صفحه (page) *
                                </label>
                                <select
                                    value={form.page}
                                    onChange={(e) => setField('page', e.target.value)}
                                    dir="rtl"
                                    className="w-full px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                                >
                                    <option className={OPTION_CLASS} value="">انتخاب صفحه...</option>
                                    {PAGE_OPTIONS.map((p) => (
                                        <option key={p.value} className={OPTION_CLASS} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">
                                    موقعیت نمایش
                                </label>
                                <select
                                    value={form.placement}
                                    onChange={(e) =>
                                        setField('placement', e.target.value as TourPlacement)
                                    }
                                    dir="rtl"
                                    className="w-full px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                                >
                                    {PLACEMENTS.map((p) => (
                                        <option key={p.value} className={OPTION_CLASS} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                سلکتور (CSS selector) *
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <GlassInput
                                        value={form.selector}
                                        onChange={(v) => setField('selector', v)}
                                        placeholder="مثال: [data-tour='search']"
                                        dir="ltr"
                                    />
                                </div>
                                <GlassButton
                                    type="button"
                                    variant="secondary"
                                    onClick={openPicker}
                                    title="انتخاب المان با کلیک روی صفحه"
                                    className="whitespace-nowrap flex items-center gap-1"
                                >
                                    <Crosshair className="w-5 h-5" />
                                    انتخاب با کلیک
                                </GlassButton>
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                                المانی که باید هایلایت شود. برای راحتی روی «انتخاب با کلیک» بزنید و المان را در صفحه انتخاب کنید.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                عنوان *
                            </label>
                                <GlassInput
                                    value={form.title}
                                    onChange={(v) => setField('title', v)}
                                    placeholder="مثال: جستجوی محصولات"
                                />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                توضیحات
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setField('description', e.target.value)}
                                rows={3}
                                placeholder="توضیحات این مرحله از تور..."
                                className="w-full px-4 py-2.5 bg-glass-light border border-glass-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">
                                    ترتیب (order)
                                </label>
                                <GlassInput
                                    type="number"
                                    min={1}
                                    value={form.order}
                                    onChange={(v) =>
                                        setField('order', Number(v))
                                    }
                                />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-glass-light rounded-xl self-end">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={form.isActive}
                                    onChange={(e) => setField('isActive', e.target.checked)}
                                    className="w-5 h-5 rounded border-glass-border text-accent-primary focus:ring-2 focus:ring-accent-primary/50"
                                />
                                <label
                                    htmlFor="isActive"
                                    className="text-sm font-medium text-text-primary cursor-pointer"
                                >
                                    فعال
                                </label>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <GlassButton
                        variant="secondary"
                        onClick={() => setModalOpen(false)}
                        disabled={saving}
                    >
                        انصراف
                    </GlassButton>
                    <GlassButton
                        variant="accent"
                        onClick={handleSave}
                        loading={saving}
                    >
                        {editing ? 'ذخیره تغییرات' : 'ایجاد'}
                    </GlassButton>
                </ModalFooter>
            </GlassModal>

            {/* Element picker modal */}
            {pickerOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-4xl h-[82vh] flex flex-col p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-text-primary">
                                انتخاب المان با کلیک
                            </h3>
                            <button
                                onClick={() => setPickerOpen(false)}
                                className="p-2 rounded-lg hover:bg-glass-light transition-colors"
                            >
                                <X className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>

                        <div className="flex gap-2 mb-3">
                            <div className="flex-1">
                                <GlassInput
                                    value={previewPath}
                                    onChange={(v) => setPreviewPath(v)}
                                    dir="ltr"
                                    placeholder="/products"
                                />
                            </div>
                            <GlassButton
                                variant="secondary"
                                onClick={() => setPreviewSrc(pickerSrc(previewPath))}
                            >
                                بارگذاری
                            </GlassButton>
                        </div>

                        <p className="text-xs text-text-muted mb-2">
                            روی هر المانی در صفحه زیر کلیک کنید تا سلکتورش به‌طور خودکار انتخاب شود.
                        </p>

                        <iframe
                            id="tour-picker-iframe"
                            src={previewSrc}
                            className="w-full flex-1 rounded-xl bg-white"
                            title="tour-picker"
                        />
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
export default TourManagement;
