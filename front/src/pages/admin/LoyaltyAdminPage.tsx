import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import type { DropdownOption } from '../../components/ui/DropdownSelect';
import {
    useLoyaltyAdminStats,
    useAdminSeed,
    useAdminExpirePoints,
    useAdminAdjust,
    useAdminTiers,
    useCreateAdminTier,
    useUpdateAdminTier,
    useDeleteAdminTier,
    useAdminRules,
    useCreateAdminRule,
    useUpdateAdminRule,
    useDeleteAdminRule,
    useAdminCampaigns,
    useCreateAdminCampaign,
    useUpdateAdminCampaign,
    useDeleteAdminCampaign,
    useAdminRewards,
    useCreateAdminReward,
    useUpdateAdminReward,
    useDeleteAdminReward,
    useAdminReferrals,
} from '../../hooks/useLoyalty';
import type {
    LoyaltyRewardType,
    LoyaltyTier,
    LoyaltyRule,
    LoyaltyCampaign,
    LoyaltyReward,
    AdminTierInput,
    AdminRuleInput,
    AdminCampaignInput,
    AdminRewardInput,
    TierBenefits,
} from '../../services/loyaltyService';
import { toast } from '../../utils/toast';
import { Database, Clock, Trash2, Plus, Edit } from 'lucide-react';
import { cn } from '../../utils';

type AdminTab = 'tiers' | 'rules' | 'campaigns' | 'rewards' | 'referrals';

const formatNumber = (n?: number | null) => (n ?? 0).toLocaleString('fa-IR');

// راهنمای هر بخش وفاداری — ادمین متوجه می‌شود هر بخش چیست و کاربردش چیست
const LOYALTY_TAB_GUIDE: Record<AdminTab, { title: string; lines: string[] }> = {
    tiers: {
        title: 'سطوح (Tiers)',
        lines: [
            'تعریف سطوح مختلف وفاداری بر اساس امتیاز انباشته کاربر (مثلاً برنزی، نقره‌ای، طلایی).',
            'هر سطح یک حداقل و حداکثر امتیاز دارد و با رسیدن کاربر به آن محدوده، برچسب و رنگ سطح او تغییر می‌کند.',
            'مزایا (benefits) را می‌توانید به صورت لیست بنویسید تا در پروفایل کاربر نمایش داده شود.',
            'کاربرد: تفکیک مشتریان وفادار و اعطای امتیازات متمایز به هر گروه.',
        ],
    },
    rules: {
        title: 'قوانین امتیازدهی (Rules)',
        lines: [
            'مشخص می‌کند به ازای هر رویداد (event) چقدر امتیاز به کاربر تعلق می‌گیرد.',
            'رویدادهای پشتیبانی‌شده شامل: تکمیل سفارش، ثبت نظر، اولین سفارش، ورود روزانه، تولد، معرفی دوستان و تکمیل پروفایل.',
            'بخش شرایط (conditions) اختیاری است و با فرمت JSON برای محدودسازی قانون استفاده می‌شود.',
            'کاربرد: تنظیم خودکار سیستم امتیازدهی بدون نیاز به تغییر کد.',
        ],
    },
    campaigns: {
        title: 'کمپین‌ها (Campaigns)',
        lines: [
            'کمپین‌ها ضریب (multiplier) یا پاداش (bonus) موقت روی امتیازدهی اعمال می‌کنند.',
            'مثلاً در جشن نوروز می‌توانید ضریب ۲ برابر برای همه رویدادها فعال کنید.',
            'تاریخ شروع/پایان تعیین می‌کند کمپین در چه بازه‌ای فعال باشد و priority اولویت‌بندی چند کمپین هم‌زمان را مشخص می‌کند.',
            'کاربرد: تشویق خرید در بازه‌های خاص و مناسبتی.',
        ],
    },
    rewards: {
        title: 'پاداش‌ها (Rewards)',
        lines: [
            'پاداش‌ها آیتم‌هایی هستند که کاربر می‌تواند با امتیاز انباشته خود دریافت کند.',
            'انواع پاداش: تخفیف، ارسال رایگان، اعتبار کیف پول یا کوپن.',
            'مقدار پاداش (rewardValue) و نوع آن (percent / fixed) تعیین‌کننده ارزش پاداش است.',
            'کاربرد: تخلیه امتیاز کاربران و ایجاد انگیزه برای خریدهای بعدی.',
        ],
    },
    referrals: {
        title: 'معرفی‌ها (Referrals)',
        lines: [
            'لیست کاربرانی که دوستان خود را دعوت کرده‌اند و وضعیت امتیازدهی معرفی.',
            'وقتی دعوت‌شده ثبت‌نام یا اولین خرید خود را انجام دهد، به هر دو طرف امتیاز تعلق می‌گیرد.',
            'ستون امتیازدهی نشان‌دهنده میزان امتیازی است که به معرف (referrer) تعلق گرفته.',
            'کاربرد: رشد ارگانیک کاربران از طریق معرفی دهان‌به‌دهان.',
        ],
    },
};

const TabGuide: React.FC<{ tab: AdminTab }> = ({ tab }) => {
    const g = LOYALTY_TAB_GUIDE[tab];
    return (
        <GlassCard className="bg-glass-light/60">
            <div className="flex items-start gap-3">
                <span className="mt-1 px-2.5 py-1 rounded-lg bg-gradient-accent text-white text-xs font-semibold whitespace-nowrap">
                    راهنما
                </span>
                <div>
                    <p className="font-semibold text-text-primary mb-1">{g.title}</p>
                    <ul className="space-y-1 text-sm text-text-secondary leading-relaxed">
                        {g.lines.map((l, i) => (
                            <li key={i}>• {l}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </GlassCard>
    );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <GlassCard className="text-center">
        <p className="text-sm text-text-secondary mb-2">{label}</p>
        <p className="text-2xl font-bold text-accent-primary">{formatNumber(value)}</p>
    </GlassCard>
);

export const LoyaltyAdminPage: React.FC = () => {
    const [tab, setTab] = useState<AdminTab>('tiers');

    const statsQ = useLoyaltyAdminStats();
    const seed = useAdminSeed();
    const expire = useAdminExpirePoints();
    const adjust = useAdminAdjust();

    const tiersQ = useAdminTiers();
    const createTier = useCreateAdminTier();
    const updateTier = useUpdateAdminTier();
    const deleteTier = useDeleteAdminTier();

    const rulesQ = useAdminRules();
    const createRule = useCreateAdminRule();
    const updateRule = useUpdateAdminRule();
    const deleteRule = useDeleteAdminRule();

    const campaignsQ = useAdminCampaigns();
    const createCampaign = useCreateAdminCampaign();
    const updateCampaign = useUpdateAdminCampaign();
    const deleteCampaign = useDeleteAdminCampaign();

    const rewardsQ = useAdminRewards();
    const createReward = useCreateAdminReward();
    const updateReward = useUpdateAdminReward();
    const deleteReward = useDeleteAdminReward();

    const referralsQ = useAdminReferrals();

    const [editingTierId, setEditingTierId] = useState<number | null>(null);
    const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
    const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
    const [editingRewardId, setEditingRewardId] = useState<number | null>(null);

    // ----- Tier form -----
    const defaultBenefits: TierBenefits = {
        discountPercent: 0, freeShipping: false, freeShippingMinOrder: 0,
        giftWrappingFree: false, birthdayPointsBonus: 0, returnDays: 7,
        annualGift: false, pointsMultiplier: 1,
    };
    const [tierForm, setTierForm] = useState<AdminTierInput>({
        name: '',
        label: '',
        minPoints: 0,
        maxPoints: null,
        color: '#6e8efb',
        benefits: { ...defaultBenefits },
    });
    const submitTier = async () => {
        if (!tierForm.name || !tierForm.label) {
            toast.error('نام و برچسب سطح الزامی است');
            return;
        }
        try {
            const payload = { ...tierForm, minPoints: Number(tierForm.minPoints) };
            if (editingTierId !== null) {
                await updateTier.mutateAsync({ id: editingTierId, input: payload });
                toast.success('سطح ویرایش شد');
            } else {
                await createTier.mutateAsync(payload);
                toast.success('سطح جدید ایجاد شد');
            }
            setEditingTierId(null);
            setTierForm({
                name: '',
                label: '',
                minPoints: 0,
                maxPoints: null,
                color: '#6e8efb',
                benefits: { ...defaultBenefits },
            });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در ذخیره سطح');
        }
    };

    const startEditTier = (t: LoyaltyTier) => {
        setEditingTierId(t.id);
        setTierForm({
            name: t.name,
            label: t.label,
            minPoints: t.minPoints,
            maxPoints: t.maxPoints,
            color: t.color,
            benefits: t.benefits ? { ...defaultBenefits, ...t.benefits } : { ...defaultBenefits },
        });
    };

    const handleDeleteTier = async (id: number) => {
        if (!window.confirm('حذف سطح انجام شود؟')) return;
        try {
            await deleteTier.mutateAsync(id);
            toast.success('سطح حذف شد');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در حذف');
        }
    };

    // ----- Rule form -----
    const [ruleForm, setRuleForm] = useState<AdminRuleInput>({
        event: '',
        points: 0,
        conditions: {},
    });
    const [ruleConditionsText, setRuleConditionsText] = useState('{}');
    const submitRule = async () => {
        if (!ruleForm.event) {
            toast.error('رویداد الزامی است');
            return;
        }
        try {
            const conditions = JSON.parse(ruleConditionsText || '{}');
            const payload = { ...ruleForm, points: Number(ruleForm.points), conditions };
            if (editingRuleId !== null) {
                await updateRule.mutateAsync({ id: editingRuleId, input: payload });
                toast.success('قانون ویرایش شد');
            } else {
                await createRule.mutateAsync(payload);
                toast.success('قانون جدید ایجاد شد');
            }
            setEditingRuleId(null);
            setRuleForm({ event: '', points: 0, conditions: {} });
            setRuleConditionsText('{}');
        } catch {
            toast.error('فرمت JSON شرایط نامعتبر است');
        }
    };

    const startEditRule = (r: LoyaltyRule) => {
        setEditingRuleId(r.id);
        setRuleForm({ event: r.event, points: r.points, conditions: {} });
        setRuleConditionsText(JSON.stringify(r.conditions ?? {}, null, 2));
    };

    const handleDeleteRule = async (id: number) => {
        if (!window.confirm('حذف قانون انجام شود؟')) return;
        try {
            await deleteRule.mutateAsync(id);
            toast.success('قانون حذف شد');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در حذف');
        }
    };

    // ----- Campaign form -----
    const [campaignForm, setCampaignForm] = useState<AdminCampaignInput>({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        multiplier: 1,
        bonus: 0,
        priority: 1,
        conditions: {},
        isActive: true,
    });
    const [campaignConditionsText, setCampaignConditionsText] = useState('{}');
    const submitCampaign = async () => {
        if (!campaignForm.title) {
            toast.error('عنوان کمپین الزامی است');
            return;
        }
        try {
            const conditions = JSON.parse(campaignConditionsText || '{}');
            const payload = {
                ...campaignForm,
                multiplier: Number(campaignForm.multiplier),
                bonus: Number(campaignForm.bonus),
                priority: Number(campaignForm.priority),
                conditions,
            };
            if (editingCampaignId !== null) {
                await updateCampaign.mutateAsync({ id: editingCampaignId, input: payload });
                toast.success('کمپین ویرایش شد');
            } else {
                await createCampaign.mutateAsync(payload);
                toast.success('کمپین جدید ایجاد شد');
            }
            setEditingCampaignId(null);
            setCampaignForm({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                multiplier: 1,
                bonus: 0,
                priority: 1,
                conditions: {},
                isActive: true,
            });
            setCampaignConditionsText('{}');
        } catch {
            toast.error('فرمت JSON شرایط نامعتبر است');
        }
    };

    const startEditCampaign = (c: LoyaltyCampaign) => {
        setEditingCampaignId(c.id);
        setCampaignForm({
            title: c.title,
            description: c.description,
            startDate: (c.startDate || '').toString().slice(0, 10),
            endDate: (c.endDate || '').toString().slice(0, 10),
            multiplier: c.multiplier,
            bonus: c.bonus,
            priority: (c as { priority?: number }).priority ?? 1,
            conditions: c.conditions ?? {},
            isActive: (c as { isActive?: boolean }).isActive ?? true,
        });
        setCampaignConditionsText(JSON.stringify(c.conditions ?? {}, null, 2));
    };

    // ----- Reward form -----
    const [rewardForm, setRewardForm] = useState<AdminRewardInput>({
        title: '',
        description: '',
        requiredPoints: 0,
        rewardType: 'DISCOUNT',
        rewardValue: 0,
        rewardValueType: 'percent',
        active: true,
        limit: null,
    });
    const submitReward = async () => {
        if (!rewardForm.title) {
            toast.error('عنوان پاداش الزامی است');
            return;
        }
        try {
            const payload = {
                ...rewardForm,
                requiredPoints: Number(rewardForm.requiredPoints),
                rewardValue: Number(rewardForm.rewardValue),
                limit: rewardForm.limit ? Number(rewardForm.limit) : null,
            };
            if (editingRewardId !== null) {
                await updateReward.mutateAsync({ id: editingRewardId, input: payload });
                toast.success('پاداش ویرایش شد');
            } else {
                await createReward.mutateAsync(payload);
                toast.success('پاداش جدید ایجاد شد');
            }
            setEditingRewardId(null);
            setRewardForm({
                title: '',
                description: '',
                requiredPoints: 0,
                rewardType: 'DISCOUNT',
                rewardValue: 0,
                rewardValueType: 'percent',
                active: true,
                limit: null,
            });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در ذخیره پاداش');
        }
    };

    const startEditReward = (r: LoyaltyReward) => {
        setEditingRewardId(r.id);
        setRewardForm({
            title: r.title,
            description: r.description,
            requiredPoints: r.requiredPoints,
            rewardType: r.rewardType,
            rewardValue: r.rewardValue,
            rewardValueType: r.rewardValueType,
            active: r.active,
            limit: r.limit,
        });
    };

    // ----- Adjust form -----
    const [adjustForm, setAdjustForm] = useState({ userId: '', points: '', reason: '' });
    const submitAdjust = async () => {
        if (!adjustForm.userId || !adjustForm.reason) {
            toast.error('شناسه کاربر و دلیل الزامی است');
            return;
        }
        try {
            await adjust.mutateAsync({
                userId: Number(adjustForm.userId),
                points: Number(adjustForm.points),
                reason: adjustForm.reason,
            });
            toast.success('امتیازات تنظیم شد');
            setAdjustForm({ userId: '', points: '', reason: '' });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در تنظیم امتیاز');
        }
    };

    const handleDeleteCampaign = async (id: number) => {
        if (!window.confirm('حذف کمپین انجام شود؟')) return;
        try {
            await deleteCampaign.mutateAsync(id);
            toast.success('کمپین حذف شد');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در حذف');
        }
    };

    const handleDeleteReward = async (id: number) => {
        if (!window.confirm('حذف پاداش انجام شود؟')) return;
        try {
            await deleteReward.mutateAsync(id);
            toast.success('پاداش حذف شد');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا در حذف');
        }
    };

    return (
        <div className="space-y-6 p-2" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-text-primary">مدیریت وفاداری</h1>
                <div className="flex gap-2">
                    <GlassButton
                        variant="accent"
                        loading={seed.isPending}
                        onClick={() => {
                            if (window.confirm('مقادیر پیش‌فرض ایجاد شود؟')) seed.mutate();
                        }}
                    >
                        <Database className="w-4 h-4 ml-1" /> Seed defaults
                    </GlassButton>
                    <GlassButton
                        variant="secondary"
                        loading={expire.isPending}
                        onClick={() => {
                            if (window.confirm('امتیازهای منقضی‌شده حذف شوند؟')) expire.mutate();
                        }}
                    >
                        <Clock className="w-4 h-4 ml-1" /> expire points now
                    </GlassButton>
                </div>
            </div>

            {/* Stats */}
            {statsQ.isLoading ? (
                <LoadingSpinner />
            ) : statsQ.data ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="صادر شده" value={statsQ.data.totalIssued} />
                    <StatCard label="استفاده شده" value={statsQ.data.totalRedeemed} />
                    <StatCard label="منقضی شده" value={statsQ.data.totalExpired} />
                    <StatCard label="کاربران فعال" value={statsQ.data.activeUsers} />
                    <StatCard label="تراکنش‌ها" value={statsQ.data.totalTransactions} />
                    <StatCard label="در انتظار" value={statsQ.data.pendingPoints} />
                </div>
            ) : null}

            {statsQ.data && statsQ.data.tierDistribution.length > 0 && (
                <GlassCard>
                    <h2 className="text-lg font-semibold text-text-primary mb-3">توزیع سطوح</h2>
                    <div className="flex flex-wrap gap-2">
                        {statsQ.data.tierDistribution.map((t) => (
                            <span
                                key={t.tier}
                                className="px-3 py-1.5 rounded-lg bg-glass-light text-text-secondary text-sm"
                            >
                                {t.tier}: {formatNumber(t.count)}
                            </span>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-border-glass-light">
                {([
                    ['tiers', 'سطوح'],
                    ['rules', 'قوانین'],
                    ['campaigns', 'کمپین‌ها'],
                    ['rewards', 'پاداش‌ها'],
                    ['referrals', 'معرفی‌ها'],
                ] as [AdminTab, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'px-4 py-2 font-medium transition-colors',
                            tab === key
                                ? 'text-accent-primary border-b-2 border-accent-primary'
                                : 'text-text-secondary hover:text-text-primary'
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tiers */}
            {tab === 'tiers' && (
                <>
                    <TabGuide tab="tiers" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">سطوح موجود</h2>
                        {tiersQ.isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="space-y-2">
                                {tiersQ.data?.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between glass-card bg-glass-light p-3 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-text-primary">{t.label}</p>
                                            <p className="text-xs text-text-muted">
                                                {formatNumber(t.minPoints)} تا{' '}
                                                {t.maxPoints ? formatNumber(t.maxPoints) : '∞'} امتیاز
                                            </p>
                                            {t.benefits && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {t.benefits.discountPercent > 0 && (
                                                        <span className="text-[10px] bg-accent-primary/10 text-accent-primary px-1.5 py-0.5 rounded-full">{t.benefits.discountPercent}% تخفیف</span>
                                                    )}
                                                    {t.benefits.freeShipping && (
                                                        <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full">ارسال رایگان</span>
                                                    )}
                                                    {t.benefits.giftWrappingFree && (
                                                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full">بسته‌بندی هدیه</span>
                                                    )}
                                                    {t.benefits.pointsMultiplier > 1 && (
                                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded-full">{t.benefits.pointsMultiplier}x امتیاز</span>
                                                    )}
                                                    {t.benefits.annualGift && (
                                                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">هدیه سالانه</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-5 h-5 rounded-full"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <button
                                                onClick={() => startEditTier(t)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary"
                                                title="ویرایش"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTier(t.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">
                            {editingTierId !== null ? 'ویرایش سطح' : 'افزودن سطح'}
                        </h2>
                        <div className="space-y-3">
                            <GlassInput
                                label="نام (انگلیسی)"
                                value={tierForm.name}
                                onChange={(v) => setTierForm((f) => ({ ...f, name: v }))}
                            />
                            <GlassInput
                                label="برچسب (فارسی)"
                                value={tierForm.label}
                                onChange={(v) => setTierForm((f) => ({ ...f, label: v }))}
                            />
                            <GlassInput
                                label="حداقل امتیاز"
                                type="number"
                                value={String(tierForm.minPoints)}
                                onChange={(v) =>
                                    setTierForm((f) => ({ ...f, minPoints: Number(v) || 0 }))
                                }
                            />
                            <div>
                                <label className="block text-sm text-text-secondary mb-1.5">رنگ سطح</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={tierForm.color}
                                        onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))}
                                        className="w-10 h-10 rounded-lg border border-border-glass-light cursor-pointer bg-transparent p-0.5"
                                        title="انتخاب رنگ"
                                    />
                                    <input
                                        type="text"
                                        value={tierForm.color}
                                        onChange={(e) => setTierForm((f) => ({ ...f, color: e.target.value }))}
                                        className="flex-1 glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary text-sm font-mono"
                                        placeholder="#6e8efb"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 pb-1">
                                <p className="text-sm font-semibold text-text-primary mb-2">مزایای سطح</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <GlassInput
                                        label="تخفیف سفارش (%)"
                                        type="number"
                                        value={String(tierForm.benefits.discountPercent)}
                                        onChange={(v) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, discountPercent: Number(v) || 0 } }))}
                                    />
                                    <GlassInput
                                        label="ضریب امتیاز"
                                        type="number"
                                        value={String(tierForm.benefits.pointsMultiplier)}
                                        onChange={(v) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, pointsMultiplier: Number(v) || 1 } }))}
                                    />
                                    <GlassInput
                                        label="امتیاز اضافی تولد"
                                        type="number"
                                        value={String(tierForm.benefits.birthdayPointsBonus)}
                                        onChange={(v) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, birthdayPointsBonus: Number(v) || 0 } }))}
                                    />
                                    <GlassInput
                                        label="روزهای مهلت مرجوعی"
                                        type="number"
                                        value={String(tierForm.benefits.returnDays)}
                                        onChange={(v) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, returnDays: Number(v) || 7 } }))}
                                    />
                                    <GlassInput
                                        label="حداقل سفارش ارسال رایگان (ریال)"
                                        type="number"
                                        value={String(tierForm.benefits.freeShippingMinOrder)}
                                        onChange={(v) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, freeShippingMinOrder: Number(v) || 0 } }))}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <label className="flex items-center gap-2 glass-card bg-glass-light px-3 py-2 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tierForm.benefits.freeShipping}
                                            onChange={(e) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, freeShipping: e.target.checked } }))}
                                            className="accent-accent-primary"
                                        />
                                        <span className="text-sm text-text-primary">ارسال رایگان</span>
                                    </label>
                                    <label className="flex items-center gap-2 glass-card bg-glass-light px-3 py-2 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tierForm.benefits.giftWrappingFree}
                                            onChange={(e) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, giftWrappingFree: e.target.checked } }))}
                                            className="accent-accent-primary"
                                        />
                                        <span className="text-sm text-text-primary">بسته‌بندی هدیه</span>
                                    </label>
                                    <label className="flex items-center gap-2 glass-card bg-glass-light px-3 py-2 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tierForm.benefits.annualGift}
                                            onChange={(e) => setTierForm((f) => ({ ...f, benefits: { ...f.benefits, annualGift: e.target.checked } }))}
                                            className="accent-accent-primary"
                                        />
                                        <span className="text-sm text-text-primary">هدیه سالانه</span>
                                    </label>
                                </div>
                            </div>

                            {editingTierId !== null && (
                                <GlassButton
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        setEditingTierId(null);
                                        setTierForm({
                                            name: '',
                                            label: '',
                                            minPoints: 0,
                                            maxPoints: null,
                                            color: '#6e8efb',
                                            benefits: { ...defaultBenefits },
                                        });
                                    }}
                                >
                                    لغو ویرایش
                                </GlassButton>
                            )}
                            <GlassButton
                                variant="accent"
                                className="w-full"
                                loading={createTier.isPending || updateTier.isPending}
                                onClick={submitTier}
                            >
                                {editingTierId !== null ? (
                                    'ذخیره تغییرات'
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 ml-1" /> ایجاد سطح
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
                </>
            )}

            {/* Rules */}
            {tab === 'rules' && (
                <>
                    <TabGuide tab="rules" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">قوانین امتیازدهی</h2>
                        {rulesQ.isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="space-y-2">
                                {rulesQ.data?.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between glass-card bg-glass-light p-3 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-text-primary">{r.event}</p>
                                            <p className="text-xs text-text-muted">
                                                {formatNumber(r.points)} امتیاز
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEditRule(r)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary"
                                                title="ویرایش"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(r.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                                                title="حذف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">
                            {editingRuleId !== null ? 'ویرایش قانون' : 'افزودن قانون'}
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1.5">رویداد (event)</label>
                                <DropdownSelect
                                    value={ruleForm.event}
                                    onChange={(v) => setRuleForm((f) => ({ ...f, event: v }))}
                                    placeholder="انتخاب رویداد"
                                    options={[
                                        { value: 'ORDER_COMPLETED', label: 'تکمیل سفارش', hint: 'ORDER_COMPLETED' },
                                        { value: 'REVIEW', label: 'ثبت نظر', hint: 'REVIEW' },
                                        { value: 'FIRST_ORDER', label: 'اولین سفارش', hint: 'FIRST_ORDER' },
                                        { value: 'DAILY_LOGIN', label: 'ورود روزانه', hint: 'DAILY_LOGIN' },
                                        { value: 'BIRTHDAY', label: 'تولد', hint: 'BIRTHDAY' },
                                        { value: 'REFERRAL_SIGNUP', label: 'ثبت‌نام با معرفی', hint: 'REFERRAL_SIGNUP' },
                                        { value: 'REFERRAL_FIRST_ORDER', label: 'اولین خرید دعوت‌شده', hint: 'REFERRAL_FIRST_ORDER' },
                                        { value: 'PROFILE_COMPLETED', label: 'تکمیل پروفایل', hint: 'PROFILE_COMPLETED' },
                                    ]}
                                />
                            </div>
                            <GlassInput
                                label="امتیاز"
                                type="number"
                                value={String(ruleForm.points)}
                                onChange={(v) =>
                                    setRuleForm((f) => ({ ...f, points: Number(v) || 0 }))
                                }
                            />
                            <textarea
                                className="glass-input w-full rounded-xl bg-glass-light p-3 text-text-primary text-sm"
                                rows={4}
                                placeholder="شرایط (JSON)"
                                value={ruleConditionsText}
                                onChange={(e) => setRuleConditionsText(e.target.value)}
                            />
                            {editingRuleId !== null && (
                                <GlassButton
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        setEditingRuleId(null);
                                        setRuleForm({ event: '', points: 0, conditions: {} });
                                        setRuleConditionsText('{}');
                                    }}
                                >
                                    لغو ویرایش
                                </GlassButton>
                            )}
                            <GlassButton
                                variant="accent"
                                className="w-full"
                                loading={createRule.isPending || updateRule.isPending}
                                onClick={submitRule}
                            >
                                {editingRuleId !== null ? (
                                    'ذخیره تغییرات'
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 ml-1" /> ایجاد قانون
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
                </>
            )}

            {/* Campaigns */}
            {tab === 'campaigns' && (
                <>
                    <TabGuide tab="campaigns" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">کمپین‌ها</h2>
                        {campaignsQ.isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="space-y-2">
                                {campaignsQ.data?.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between glass-card bg-glass-light p-3 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-text-primary">{c.title}</p>
                                            <p className="text-xs text-text-muted">
                                                ضریب {c.multiplier} · پاداش {formatNumber(c.bonus)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <GlassButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => startEditCampaign(c)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </GlassButton>
                                            <GlassButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleDeleteCampaign(c.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </GlassButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">
                            {editingCampaignId !== null ? 'ویرایش کمپین' : 'افزودن کمپین'}
                        </h2>
                        <div className="space-y-3">
                            <GlassInput
                                label="عنوان"
                                value={campaignForm.title}
                                onChange={(v) => setCampaignForm((f) => ({ ...f, title: v }))}
                            />
                            <GlassInput
                                label="توضیحات"
                                value={campaignForm.description}
                                onChange={(v) => setCampaignForm((f) => ({ ...f, description: v }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <GlassInput
                                    label="تاریخ شروع"
                                    type="date"
                                    value={campaignForm.startDate}
                                    onChange={(v) => setCampaignForm((f) => ({ ...f, startDate: v }))}
                                />
                                <GlassInput
                                    label="تاریخ پایان"
                                    type="date"
                                    value={campaignForm.endDate}
                                    onChange={(v) => setCampaignForm((f) => ({ ...f, endDate: v }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <GlassInput
                                    label="ضریب (multiplier)"
                                    type="number"
                                    value={String(campaignForm.multiplier)}
                                    onChange={(v) =>
                                        setCampaignForm((f) => ({ ...f, multiplier: Number(v) || 1 }))
                                    }
                                />
                                <GlassInput
                                    label="پاداش (bonus)"
                                    type="number"
                                    value={String(campaignForm.bonus)}
                                    onChange={(v) =>
                                        setCampaignForm((f) => ({ ...f, bonus: Number(v) || 0 }))
                                    }
                                />
                            </div>
                            <textarea
                                className="glass-input w-full rounded-xl bg-glass-light p-3 text-text-primary text-sm"
                                rows={3}
                                placeholder="شرایط (JSON)"
                                value={campaignConditionsText}
                                onChange={(e) => setCampaignConditionsText(e.target.value)}
                            />
                            {editingCampaignId !== null && (
                                <GlassButton
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        setEditingCampaignId(null);
                                        setCampaignForm({
                                            title: '',
                                            description: '',
                                            startDate: '',
                                            endDate: '',
                                            multiplier: 1,
                                            bonus: 0,
                                            priority: 1,
                                            conditions: {},
                                            isActive: true,
                                        });
                                        setCampaignConditionsText('{}');
                                    }}
                                >
                                    لغو ویرایش
                                </GlassButton>
                            )}
                            <GlassButton
                                variant="accent"
                                className="w-full"
                                loading={createCampaign.isPending || updateCampaign.isPending}
                                onClick={submitCampaign}
                            >
                                {editingCampaignId !== null ? (
                                    'ذخیره تغییرات'
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 ml-1" /> ایجاد کمپین
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
                </>
            )}

            {/* Rewards */}
            {tab === 'rewards' && (
                <>
                    <TabGuide tab="rewards" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">پاداش‌ها</h2>
                        {rewardsQ.isLoading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="space-y-2">
                                {rewardsQ.data?.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between glass-card bg-glass-light p-3 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-medium text-text-primary">{r.title}</p>
                                            <p className="text-xs text-text-muted">
                                                {formatNumber(r.requiredPoints)} امتیاز ·{' '}
                                                {r.rewardType}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <GlassButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => startEditReward(r)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </GlassButton>
                                            <GlassButton
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleDeleteReward(r.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </GlassButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                    <GlassCard>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">
                            {editingRewardId !== null ? 'ویرایش پاداش' : 'افزودن پاداش'}
                        </h2>
                        <div className="space-y-3">
                            <GlassInput
                                label="عنوان"
                                value={rewardForm.title}
                                onChange={(v) => setRewardForm((f) => ({ ...f, title: v }))}
                            />
                            <GlassInput
                                label="توضیحات"
                                value={rewardForm.description}
                                onChange={(v) => setRewardForm((f) => ({ ...f, description: v }))}
                            />
                            <GlassInput
                                label="امتیاز مورد نیاز"
                                type="number"
                                value={String(rewardForm.requiredPoints)}
                                onChange={(v) =>
                                    setRewardForm((f) => ({
                                        ...f,
                                        requiredPoints: Number(v) || 0,
                                    }))
                                }
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <DropdownSelect
                                    value={rewardForm.rewardType}
                                    onChange={(v) =>
                                        setRewardForm((f) => ({
                                            ...f,
                                            rewardType: v as LoyaltyRewardType,
                                        }))
                                    }
                                    options={[
                                        { value: 'DISCOUNT', label: 'تخفیف' },
                                        { value: 'FREE_SHIPPING', label: 'ارسال رایگان' },
                                        { value: 'CREDIT', label: 'اعتبار' },
                                        { value: 'COUPON', label: 'کوپن' },
                                    ]}
                                />
                                <GlassInput
                                    label="مقدار پاداش"
                                    type="number"
                                    value={String(rewardForm.rewardValue)}
                                    onChange={(v) =>
                                        setRewardForm((f) => ({
                                            ...f,
                                            rewardValue: Number(v) || 0,
                                        }))
                                    }
                                />
                            </div>
                            {editingRewardId !== null && (
                                <GlassButton
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        setEditingRewardId(null);
                                        setRewardForm({
                                            title: '',
                                            description: '',
                                            requiredPoints: 0,
                                            rewardType: 'DISCOUNT',
                                            rewardValue: 0,
                                            rewardValueType: 'percent',
                                            active: true,
                                            limit: null,
                                        });
                                    }}
                                >
                                    لغو ویرایش
                                </GlassButton>
                            )}
                            <GlassButton
                                variant="accent"
                                className="w-full"
                                loading={createReward.isPending || updateReward.isPending}
                                onClick={submitReward}
                            >
                                {editingRewardId !== null ? (
                                    'ذخیره تغییرات'
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 ml-1" /> ایجاد پاداش
                                    </>
                                )}
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
                </>
            )}

            {/* Referrals */}
            {tab === 'referrals' && (
                <>
                    <TabGuide tab="referrals" />
                    <GlassCard>
                    <h2 className="text-lg font-semibold text-text-primary mb-3">معرفی‌ها</h2>
                    {referralsQ.isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="space-y-2">
                            {referralsQ.data?.map((r, i) => (
                                <div
                                    key={r.id ?? i}
                                    className="glass-card bg-glass-light p-3 rounded-xl flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-medium text-text-primary">
                                            {r.referrer?.name || 'کاربر'} ← {r.referred?.name || 'دوست'}
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            وضعیت: {r.status === 'COMPLETED' ? 'تکمیل شده' : 'در انتظار'}
                                            {r.createdAt ? ' • ' + new Date(r.createdAt).toLocaleDateString('fa-IR') : ''}
                                        </p>
                                    </div>
                                    <div className="text-left text-sm text-text-secondary">
                                        <p>{formatNumber(r.referrerPoints)} امتیاز</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            </>
            )}

            {/* Manual adjust */}
            <GlassCard>
                <h2 className="text-lg font-semibold text-text-primary mb-3">
                    تنظیم دستی امتیاز کاربر
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <GlassInput
                        label="شناسه کاربر"
                        type="number"
                        value={adjustForm.userId}
                        onChange={(v) => setAdjustForm((f) => ({ ...f, userId: v }))}
                    />
                    <GlassInput
                        label="امتیاز (مثبت/منفی)"
                        type="number"
                        value={adjustForm.points}
                        onChange={(v) => setAdjustForm((f) => ({ ...f, points: v }))}
                    />
                    <GlassInput
                        label="دلیل"
                        value={adjustForm.reason}
                        onChange={(v) => setAdjustForm((f) => ({ ...f, reason: v }))}
                    />
                    <GlassButton
                        variant="accent"
                        loading={adjust.isPending}
                        onClick={submitAdjust}
                    >
                        اعمال
                    </GlassButton>
                </div>
            </GlassCard>

        </div>
    );
};

export default LoyaltyAdminPage;
