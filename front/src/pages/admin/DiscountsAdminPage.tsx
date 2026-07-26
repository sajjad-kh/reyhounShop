import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discountService, type Discount, type CreateDiscountRequest, type BulkGrantRequest } from '../../services/discountService';
import { showToast } from '../../components/ui/Toast';

type Tab = 'discounts' | 'bulk';

const emptyForm: CreateDiscountRequest = {
    code: '',
    type: 'PERCENT',
    value: 10,
    minPurchase: null,
    maxUses: null,
    applicableTo: 'all',
    expiresAt: null,
};

export const DiscountsAdminPage: React.FC = () => {
    const [tab, setTab] = useState<Tab>('discounts');
    const qc = useQueryClient();
    const [form, setForm] = useState<CreateDiscountRequest>(emptyForm);
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    const discountsQ = useQuery({
        queryKey: ['admin', 'discounts'],
        queryFn: () => discountService.getDiscounts(),
        onSuccess: (data: Discount[]) => setDiscounts(data),
    });

    React.useEffect(() => {
        if (discountsQ.data) setDiscounts(discountsQ.data);
    }, [discountsQ.data]);

    const createMut = useMutation({
        mutationFn: (req: CreateDiscountRequest) => discountService.createDiscount(req),
        onSuccess: () => {
            showToast.success('کد تخفیف ساخته شد');
            setForm(emptyForm);
            qc.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        },
        onError: (e: Error) => showToast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => discountService.deleteDiscount(id),
        onSuccess: () => {
            showToast.success('غیرفعال شد');
            qc.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        },
        onError: (e: Error) => showToast.error(e.message),
    });

    const reactivateMut = useMutation({
        mutationFn: (id: number) => discountService.reactivateDiscount(id),
        onSuccess: () => {
            showToast.success('فعال شد');
            qc.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        },
        onError: (e: Error) => showToast.error(e.message),
    });

    const handleDelete = (id: number) => {
        const prev = discounts;
        setDiscounts((old) => old.map((d) => (d.id === id ? { ...d, isActive: false } : d)));
        deleteMut.mutate(id, {
            onError: () => setDiscounts(prev),
        });
    };

    const handleReactivate = (id: number) => {
        const prev = discounts;
        setDiscounts((old) => old.map((d) => (d.id === id ? { ...d, isActive: true } : d)));
        reactivateMut.mutate(id, {
            onError: () => setDiscounts(prev),
        });
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1">تخفیف‌ها و امتیاز هدیه</h1>
                <p className="text-text-secondary">مدیریت کدهای تخفیف مناسبتی و اعطای امتیاز دسته‌جمعی</p>
            </div>

            <div className="flex gap-2 border-b border-border-glass-light">
                {([
                    ['discounts', 'کدهای تخفیف'],
                    ['bulk', 'امتیاز هدیه دسته‌جمعی'],
                ] as [Tab, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={
                            'px-4 py-2 font-medium transition-colors ' +
                            (tab === key
                                ? 'text-accent-primary border-b-2 border-accent-primary'
                                : 'text-text-secondary hover:text-text-primary')
                        }
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'discounts' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GlassCard className="p-5">
                        <h2 className="text-lg font-semibold text-text-primary mb-4">ساخت کد تخفیف جدید</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">کد</label>
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                                    placeholder="EID1405"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm text-text-secondary mb-1">نوع</label>
                                    <DropdownSelect
                                        value={form.type}
                                        onChange={(v) => setForm({ ...form, type: v as 'PERCENT' | 'FIXED' })}
                                        placeholder="نوع تخفیف"
                                        options={[
                                            { value: 'PERCENT', label: 'درصدی (%)' },
                                            { value: 'FIXED', label: 'مبلغ ثابت (ریال)' },
                                        ]}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-text-secondary mb-1">
                                        مقدار {form.type === 'PERCENT' ? '(٪)' : '(ریال)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={form.value}
                                        onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                                        className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm text-text-secondary mb-1">حداقل خرید (ریال)</label>
                                    <input
                                        type="number"
                                        value={form.minPurchase ?? ''}
                                        onChange={(e) => setForm({ ...form, minPurchase: e.target.value ? Number(e.target.value) : null })}
                                        className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-text-secondary mb-1">سقف استفاده</label>
                                    <input
                                        type="number"
                                        value={form.maxUses ?? ''}
                                        onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : null })}
                                        className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                                    />
                                </div>
                            </div>
                            <GlassButton variant="accent" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>
                                ایجاد کد تخفیف
                            </GlassButton>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h2 className="text-lg font-semibold text-text-primary mb-4">کدهای موجود</h2>
                        {discountsQ.isLoading ? (
                            <LoadingSpinner />
                        ) : discounts.length > 0 ? (
                            <div className="[direction:rtl] overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-text-secondary">
                                            <th className="text-right py-2.5 px-3 font-medium">کد</th>
                                            <th className="text-right py-2.5 px-3 font-medium">نوع</th>
                                            <th className="text-right py-2.5 px-3 font-medium">مقدار</th>
                                            <th className="text-right py-2.5 px-3 font-medium">حداقل خرید</th>
                                            <th className="text-right py-2.5 px-3 font-medium">استفاده</th>
                                            <th className="text-right py-2.5 px-3 font-medium">وضعیت</th>
                                            <th className="text-right py-2.5 px-3 font-medium w-28">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {discounts.map((d: Discount) => (
                                            <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-2.5 px-3 font-mono text-text-primary">{d.code}</td>
                                                <td className="py-2.5 px-3 text-text-secondary">
                                                    {d.type === 'PERCENT' ? 'درصدی' : 'مبلغ ثابت'}
                                                </td>
                                                <td className="py-2.5 px-3 text-text-primary">
                                                    {d.type === 'PERCENT' ? `${d.value}٪` : `${(d.value ?? 0).toLocaleString('fa-IR')} ریال`}
                                                </td>
                                                <td className="py-2.5 px-3 text-text-secondary">
                                                    {d.minPurchase ? `${d.minPurchase.toLocaleString('fa-IR')} ریال` : '—'}
                                                </td>
                                                <td className="py-2.5 px-3 text-text-secondary">
                                                    {d.usedCount ?? 0}/{d.maxUses ?? '∞'}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.isActive ? 'bg-success-color/20 text-success-color' : 'bg-error-color/20 text-error-color'}`}>
                                                        {d.isActive ? 'فعال' : 'غیرفعال'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 w-28">
                                                    {d.isActive ? (
                                                        <GlassButton variant="secondary" size="sm" className="w-full" onClick={() => handleDelete(d.id)}>
                                                            حذف
                                                        </GlassButton>
                                                    ) : (
                                                        <GlassButton variant="accent" size="sm" className="w-full" onClick={() => handleReactivate(d.id)}>
                                                            فعال‌سازی
                                                        </GlassButton>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-text-secondary text-center py-6">کدی ثبت نشده</p>
                        )}
                    </GlassCard>
                </div>
            )}

            {tab === 'bulk' && <BulkGrantSection />}
        </div>
    );
};

const BulkGrantSection: React.FC = () => {
    const qc = useQueryClient();
    const [points, setPoints] = useState(100);
    const [reason, setReason] = useState('');

    const mut = useMutation({
        mutationFn: (req: BulkGrantRequest) => discountService.bulkGrantPoints(req),
        onSuccess: (res) => {
            showToast.success(`${res.granted} کاربر، هر کدام ${res.points} امتیاز دریافت کردند`);
            setReason('');
            qc.invalidateQueries({ queryKey: ['loyalty', 'points'] });
        },
        onError: (e: Error) => showToast.error(e.message),
    });

    return (
        <GlassCard className="p-5 max-w-lg">
            <h2 className="text-lg font-semibold text-text-primary mb-4">اعطای امتیاز به همه کاربران (مناسبتی)</h2>
            <p className="text-xs text-text-muted mb-4">
                این امتیاز به تمام کاربران فعال سیستم هدیه داده می‌شود و آن‌ها می‌توانند در صفحه پرداخت خرجش کنند.
            </p>
            <div className="space-y-3">
                <div>
                    <label className="block text-sm text-text-secondary mb-1">مقدار امتیاز</label>
                    <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm text-text-secondary mb-1">علت (مثلاً: جشن عید)</label>
                    <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary"
                        placeholder="جشن عید فطر"
                    />
                </div>
                <GlassButton variant="accent" loading={mut.isPending} disabled={!reason.trim()} onClick={() => mut.mutate({ points, reason })}>
                    اعطای امتیاز به همه
                </GlassButton>
            </div>
        </GlassCard>
    );
};

export default DiscountsAdminPage;
