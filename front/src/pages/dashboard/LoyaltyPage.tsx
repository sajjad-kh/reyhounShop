import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LoyaltyProgress } from '../../components/loyalty/LoyaltyProgress';
import { RewardCard } from '../../components/loyalty/RewardCard';
import {
    useLoyaltyPoints,
    useLoyaltyTransactions,
    useLoyaltyRewards,
    useReferral,
    useLoyaltyExpiration,
    useDailyLogin,
    useBirthday,
    useLoyaltyTiers,
} from '../../hooks/useLoyalty';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import type { LoyaltyTransactionSourceType, TierBenefits } from '../../services/loyaltyService';
import { toast } from '../../utils/toast';
import { Copy, Gift, CalendarDays, PartyPopper, ArrowUpRight, ArrowDownRight, Crown, Check, X } from 'lucide-react';
import { cn } from '../../utils';

type Tab = 'rewards' | 'transactions' | 'expiration';

const formatDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fa-IR');
};

const LoyaltyPageInner: React.FC = () => {
    const [tab, setTab] = useState<Tab>('rewards');
    const [txnType, setTxnType] = useState<LoyaltyTransactionSourceType | undefined>(undefined);
    const [txnPage, setTxnPage] = useState(1);

    const { state } = useAuth();
    const userId = state.user?.id;
    const pointsQ = useLoyaltyPoints(userId);

    // While switching users (or before data loads) show a spinner instead of stale data.
    const isSwitching = !pointsQ.data && userId;
    const rewardsQ = useLoyaltyRewards();
    const txnQ = useLoyaltyTransactions(txnPage, txnType);
    const referralQ = useReferral();
    const expQ = useLoyaltyExpiration();

    const dailyLogin = useDailyLogin();
    const birthday = useBirthday();
    const qc = useQueryClient();

    const data = pointsQ.data;

    const refreshLoyalty = async () => {
        qc.removeQueries({ queryKey: ['loyalty', 'transactions'] });
        await qc.refetchQueries({ queryKey: ['loyalty', 'transactions'], type: 'all' });
        if (userId) {
            qc.removeQueries({ queryKey: ['loyalty', 'points', String(userId)] });
            await qc.refetchQueries({ queryKey: ['loyalty', 'points', String(userId)], type: 'all' });
        }
    };

    const handleDailyLogin = async () => {
        try {
            const res = await dailyLogin.mutateAsync();
            if (res.skipped) toast(res.reason || 'امروز قبلاً وارد شده‌اید', { icon: 'ℹ️' });
            else toast.success(`ورود روزانه: ${res.points} امتیاز دریافت کردید!`);
            await refreshLoyalty();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا');
        }
    };

    const handleBirthday = async () => {
        try {
            const res = await birthday.mutateAsync();
            if (res.skipped) toast(res.reason || 'هدیه تولد قبلاً دریافت شده', { icon: 'ℹ️' });
            else toast.success(`تولدت مبارک! ${res.points} امتیاز هدیه گرفتید 🎂`);
            await refreshLoyalty();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'خطا');
        }
    };

    const copyReferral = async () => {
        const url = referralQ.data?.inviteUrl;
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('لینک دعوت کپی شد');
        } catch {
            toast.error('کپی نشد');
        }
    };

    if (pointsQ.isLoading || isSwitching) {
        return (
            <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-1">وفاداری</h1>
                <p className="text-text-secondary">
                    امتیاز جمع کنید و با آن پاداش بگیرید
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="text-center">
                    <p className="text-sm text-text-secondary mb-2">امتیاز قابل استفاده</p>
                    <p className="text-3xl font-bold text-accent-primary">
                        {(data?.availablePoints ?? 0).toLocaleString('fa-IR')}
                    </p>
                </GlassCard>
                <GlassCard className="text-center">
                    <p className="text-sm text-text-secondary mb-2">امتیاز در انتظار</p>
                    <p className="text-3xl font-bold text-text-primary">
                        {(data?.pendingPoints ?? 0).toLocaleString('fa-IR')}
                    </p>
                </GlassCard>
                <GlassCard className="text-center">
                    <p className="text-sm text-text-secondary mb-2">مجموع امتیازهای کسب‌شده</p>
                    <p className="text-3xl font-bold text-text-primary">
                        {(data?.lifetimeEarned ?? 0).toLocaleString('fa-IR')}
                    </p>
                </GlassCard>
            </div>

            {data && <LoyaltyProgress data={data} />}

            <div className="flex flex-wrap gap-3">
                <GlassButton variant="accent" onClick={handleDailyLogin} loading={dailyLogin.isPending}>
                    <CalendarDays className="w-5 h-5 ml-2" /> ورود روزانه
                </GlassButton>
                <GlassButton variant="secondary" onClick={handleBirthday} loading={birthday.isPending}>
                    <PartyPopper className="w-5 h-5 ml-2" /> هدیه تولد
                </GlassButton>
            </div>

            <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-accent-primary" />
                    <h2 className="text-xl font-semibold text-text-primary">دعوت دوستان</h2>
                </div>
                {referralQ.isLoading ? (
                    <LoadingSpinner size="sm" />
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-text-secondary">
                            کد دعوت شما:{' '}
                            <span className="font-bold text-text-primary">
                                {referralQ.data?.code}
                            </span>
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={referralQ.data?.inviteUrl || ''}
                                className="flex-1 glass-input bg-glass-light rounded-xl px-3 py-2 text-text-primary text-sm"
                            />
                            <GlassButton variant="secondary" onClick={copyReferral}>
                                <Copy className="w-4 h-4 ml-1" /> کپی
                            </GlassButton>
                        </div>
                        <p className="text-xs text-text-muted">
                            {referralQ.data?.totalReferred ?? 0} نفر دعوت شده ·{' '}
                            {(referralQ.data?.totalEarned ?? 0).toLocaleString('fa-IR')} امتیاز کسب‌شده
                        </p>
                        {(referralQ.data?.referrals?.length ?? 0) > 0 && (
                            <div className="mt-3 border-t border-border-glass-light pt-3">
                                <p className="text-sm font-medium text-text-primary mb-2">افراد دعوت‌شده:</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {referralQ.data!.referrals.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-glass-light rounded-lg px-3 py-2">
                                            <span className="text-text-primary font-medium">{r.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    'px-2 py-0.5 rounded-full text-xs',
                                                    r.status === 'FIRST_ORDER_COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                    r.status === 'REGISTERED' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                )}>
                                                    {r.status === 'FIRST_ORDER_COMPLETED' ? 'اولین خرید ✓' :
                                                     r.status === 'REGISTERED' ? 'ثبت‌نام ✓' : r.status}
                                                </span>
                                                <span className="text-text-muted">{r.pointsEarned} امتیاز</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>

            <div className="flex gap-2 border-b border-border-glass-light">
                {([
                    ['rewards', 'پاداش‌ها'],
                    ['transactions', 'تاریخچه'],
                    ['expiration', 'انقضا'],
                ] as [Tab, string][]).map(([key, label]) => (
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

            {tab === 'rewards' && (
                <div>
                    <p className="text-sm text-text-secondary mb-4">
                        امتیازهای خود را مستقیماً در مرحله پرداخت خرج کنید — کافیست تعداد امتیاز دلخواه را در صفحه پرداخت انتخاب کنید.
                    </p>
                    {rewardsQ.isLoading ? (
                        <LoadingSpinner />
                    ) : rewardsQ.data && rewardsQ.data.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rewardsQ.data.map((r) => (
                                <RewardCard
                                    key={r.id}
                                    reward={r}
                                    userPoints={data?.availablePoints ?? 0}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-secondary text-center py-8">پاداشی موجود نیست</p>
                    )}
                </div>
            )}

            {tab === 'transactions' && (
                <GlassCard>
                    <div className="flex gap-2 mb-4">
                        {([
                            [undefined, 'همه'],
                            ['earned', 'کسب‌شده'],
                            ['redeemed', 'استفاده‌شده'],
                        ] as [LoyaltyTransactionSourceType | undefined, string][]).map(([key, label]) => (
                            <button
                                key={key ?? 'all'}
                                onClick={() => {
                                    setTxnType(key);
                                    setTxnPage(1);
                                }}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm',
                                    txnType === key
                                        ? 'bg-accent-primary text-white'
                                        : 'bg-glass-light text-text-secondary'
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {txnQ.isLoading ? (
                        <LoadingSpinner />
                    ) : txnQ.data && txnQ.data.transactions.length > 0 ? (
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-2xl border border-border-glass-light">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-glass-light/60 text-text-secondary text-xs uppercase tracking-wide">
                                                <th className="text-right py-3.5 px-4 font-semibold">شرح</th>
                                                <th className="text-right py-3.5 px-4 font-semibold">تاریخ</th>
                                                <th className="text-left py-3.5 px-4 font-semibold">امتیاز</th>
                                                <th className="text-left py-3.5 px-4 font-semibold">موجودی</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {txnQ.data.transactions.map((t, i) => {
                                                const positive = t.points >= 0;
                                                return (
                                                    <tr
                                                        key={t.id}
                                                        className={cn(
                                                            'border-t border-border-glass-light/40 transition-colors hover:bg-accent-primary/5',
                                                            i % 2 === 1 && 'bg-glass-light/20'
                                                        )}
                                                    >
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <span
                                                                    className={cn(
                                                                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                                                        positive
                                                                            ? 'bg-green-500/15 text-green-400'
                                                                            : 'bg-red-500/15 text-red-400'
                                                                    )}
                                                                >
                                                                    {positive ? (
                                                                        <ArrowUpRight className="w-4 h-4" />
                                                                    ) : (
                                                                        <ArrowDownRight className="w-4 h-4" />
                                                                    )}
                                                                </span>
                                                                <span className="text-text-primary font-medium">
                                                                    {t.description || '-'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                                                            {formatDate(t.createdAt)}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
                                                                    positive
                                                                        ? 'bg-green-500/15 text-green-400'
                                                                        : 'bg-red-500/15 text-red-400'
                                                                )}
                                                            >
                                                                {positive ? '+' : '-'}
                                                                {Math.abs(t.points).toLocaleString('fa-IR')}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-left text-text-secondary font-medium whitespace-nowrap">
                                                            {(t.balanceAfter ?? 0).toLocaleString('fa-IR')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex justify-center gap-2 pt-1">
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    disabled={txnPage <= 1}
                                    onClick={() => setTxnPage((p) => p - 1)}
                                >
                                    قبلی
                                </GlassButton>
                                <span className="text-text-secondary text-sm px-2">
                                    {txnPage} / {txnQ.data.pagination.pages}
                                </span>
                                <GlassButton
                                    variant="secondary"
                                    size="sm"
                                    disabled={txnPage >= txnQ.data.pagination.pages}
                                    onClick={() => setTxnPage((p) => p + 1)}
                                >
                                    بعدی
                                </GlassButton>
                            </div>
                        </div>
                    ) : (
                        <p className="text-text-secondary text-center py-8">
                            تراکنشی یافت نشد
                        </p>
                    )}
                </GlassCard>
            )}

            {tab === 'expiration' && (
                <GlassCard>
                    {expQ.isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-text-secondary">
                                مجموع امتیازهای در حال انقضا:{' '}
                                <span className="font-bold text-red-400">
                                    {(expQ.data?.totalExpiringPoints ?? 0).toLocaleString('fa-IR')}
                                </span>
                            </p>
                            {expQ.data && expQ.data.expiringTransactions.length > 0 ? (
                                expQ.data.expiringTransactions.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between glass-card bg-glass-light p-3 rounded-xl"
                                    >
                                        <div>
                                            <p className="text-text-primary text-sm">{t.description}</p>
                                            <p className="text-xs text-text-muted">
                                                انقضا: {formatDate(t.expireDate)}
                                            </p>
                                        </div>
                                        <span className="font-bold text-red-400">
                                            -{t.points.toLocaleString('fa-IR')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-secondary text-center py-6">
                                    امتیازی در شرف انقضا نیست
                                </p>
                            )}
                        </div>
                    )}
                </GlassCard>
            )}
        </div>
    );
};

export const LoyaltyPage: React.FC = () => {
    const { state } = useAuth();
    const userId = state.user?.id;
    // Force a full remount when the logged-in user changes so every query
    // (points, transactions, rewards, ...) resets to a fresh loading state.
    // This guarantees the page never shows a previous user's cached data.
    return <LoyaltyPageInner key={userId ?? 'guest'} />;
};

export default LoyaltyPage;
