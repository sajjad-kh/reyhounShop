import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import {
    RefreshCw,
    Search,
    User,
    Package,
    AlertTriangle,
    Info,
    XCircle,
    Download,
    CheckCircle,
    Activity,
    Shield,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { STORAGE_KEYS } from '../../utils/constants';
import { secureStorage } from '../../utils/security';

interface ActivityLog {
    id: number;
    correlationId?: string;
    sessionId?: string;
    userId?: number;
    targetUserId?: number;
    orderId?: number;
    actorType: 'USER' | 'SYSTEM' | 'ADMIN';
    action: string;
    entity: string;
    entityId?: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    success: boolean;
    metadata?: any;
    ip?: string;
    userAgent?: string;
    createdAt: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

interface ServerStats {
    total: number;
    errors: number;
    warnings: number;
    ok: number;
    fail: number;
}

const PAGE_SIZE = 20;

const actionLabel: Record<string, string> = {
    AUTH_LOGIN: 'ورود',
    AUTH_LOGOUT: 'خروج',
    AUTH_LOGIN_FAILED: 'ورود ناموفق',
    USER_CREATED: 'ثبت کاربر',
    USER_UPDATED: 'ویرایش کاربر',
    USER_DEACTIVATED: 'غیرفعال کاربر',
    USER_ROLE_CHANGED: 'تغییر نقش',
    ORDER_CREATED: 'ثبت سفارش',
    ORDER_UPDATED: 'ویرایش سفارش',
    ORDER_CANCELLED: 'لغو سفارش',
    ORDER_STATUS_CHANGED: 'تغییر وضعیت سفارش',
    ORDER_SHIPPED: 'ارسال سفارش',
    ORDER_DELIVERED: 'تحویل سفارش',
    PAYMENT_CREATED: 'ثبت پرداخت',
    PAYMENT_SUCCESS: 'پرداخت موفق',
    PAYMENT_REJECTED: 'رد پرداخت',
    PAYMENT_FAILED: 'پرداخت ناموفق',
    DESIGN_UPLOADED: 'آپلود طرح',
    DESIGN_APPROVED: 'تایید طرح',
    DESIGN_REVISION: 'ویرایش طرح',
    REVIEW_CREATED: 'ثبت نظر',
    REVIEW_APPROVED: 'تایید نظر',
    PRODUCT_CREATED: 'ثبت محصول',
    PRODUCT_UPDATED: 'ویرایش محصول',
    PRODUCT_DELETED: 'حذف محصول',
    ADMIN_VIEW_ACTIVITY_LOGS: 'مشاهده لاگ',
    ADMIN_VIEW_API_LOGS: 'مشاهده API لاگ',
    ADMIN_VIEW_ERROR_LOGS: 'مشاهده خطاها',
    ADMIN_VIEW_PERFORMANCE_LOGS: 'مشاهده پرفورمنس',
    ADMIN_SEARCH_LOGS: 'جستجو لاگ',
    ADMIN_VIEW_USER_LOGS: 'لاگ کاربر',
    ADMIN_VIEW_ANALYTICS: 'مشاهده آنالیتیکس',
    API_REQUEST: 'درخواست API',
    SYSTEM_EVENT: 'رویداد سیستم',
};

const uniqueEntities = ['User', 'Order', 'Product', 'Address', 'Payment', 'Review', 'Cart', 'Wishlist', 'Security', 'SYSTEM'];
const uniqueActions = Object.keys(actionLabel);

const LogsMethodsManagement: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [severity, setSeverity] = useState<'all' | 'INFO' | 'WARNING' | 'ERROR'>('all');
    const [entity, setEntity] = useState<string>('all');
    const [actorType, setActorType] = useState<string>('all');
    const [action, setAction] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [activeCard, setActiveCard] = useState<'errors' | 'warnings' | 'ok' | 'fail' | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);

    // FIX 1: serverStats در بالای component تعریف شده، نه داخل loadLogs
    const [serverStats, setServerStats] = useState<ServerStats>({
        total: 0, errors: 0, warnings: 0, ok: 0, fail: 0
    });

    const [fetchTrigger, setFetchTrigger] = useState(0);

    // FIX 6: لاگ‌های اختصاصی کاربر از server — نه فیلتر روی logs صفحه جاری
    const [userLogsData, setUserLogsData] = useState<ActivityLog[]>([]);
    const [userLogsLoading, setUserLogsLoading] = useState(false);

    const getHeaders = () => {
        const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        };
    };

    // FIX 2: useCallback تا interval همیشه نسخه جدید loadLogs رو داشته باشه
    // FIX 3: conflict پارامتر severity — activeCard اولویت داره
    const loadLogs = useCallback(async () => {
        try {
            setLoading(true);

            const activeSeverity =
                activeCard === 'errors' ? 'ERROR' :
                activeCard === 'warnings' ? 'WARNING' :
                severity !== 'all' ? severity :
                undefined;

            const activeSuccess =
                activeCard === 'ok' ? 'true' :
                activeCard === 'fail' ? 'false' :
                undefined;

            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
                ...(search && { search }),
                ...(activeSeverity && { severity: activeSeverity }),
                ...(activeSuccess !== undefined && { success: activeSuccess }),
                ...(entity !== 'all' && { entity }),
                ...(actorType !== 'all' && { actorType }),
                ...(action !== 'all' && { action }),
                ...(dateFrom && { dateFrom }),
                ...(dateTo && { dateTo }),
            });

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/logs/activity?${params}`, {
                headers: getHeaders(),
            });

            const data = await res.json();
            const safeLogs = data?.data?.logs?.logs ?? data?.data?.logs ?? data?.logs ?? [];
            const total = data?.data?.logs?.total ?? data?.data?.total ?? data?.total ?? 0;
            const stats = data?.data?.logs?.stats ?? data?.data?.stats ?? null;

            if (stats) setServerStats(stats);

            setLogs(Array.isArray(safeLogs) ? safeLogs : []);
            setTotalCount(total);
        } catch (err) {
            console.error('loadLogs error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, severity, entity, actorType, action, dateFrom, dateTo, activeCard,fetchTrigger]);

    // FIX 2: dependency روی loadLogs که useCallback هست
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // FIX 2: interval هم از loadLogs جدید استفاده می‌کنه
    useEffect(() => {
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, [loadLogs]);

    // FIX 6: وقتی user انتخاب می‌شه، همه لاگ‌هاش از server fetch می‌شه
    useEffect(() => {
        if (!selectedUser) {
            setUserLogsData([]);
            return;
        }

        const fetchUserLogs = async () => {
            try {
                setUserLogsLoading(true);
                const params = new URLSearchParams({
                    userId: String(selectedUser.id),
                    limit: '200',
                    offset: '0',
                });
                const res = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL}/admin/logs/activity?${params}`,
                    { headers: getHeaders() }
                );
                const data = await res.json();
                const fetched = data?.data?.logs?.logs ?? data?.data?.logs ?? data?.logs ?? [];
                setUserLogsData(Array.isArray(fetched) ? fetched : []);
            } catch (err) {
                console.error('fetchUserLogs error:', err);
            } finally {
                setUserLogsLoading(false);
            }
        };

        fetchUserLogs();
    }, [selectedUser]);

    const handleCardClick = (card: 'errors' | 'warnings' | 'ok' | 'fail') => {
        setActiveCard(prev => prev === card ? null : card);
        setPage(1);
    };

    // FIX 4: setPage(1) اضافه شد
    const resetFilters = () => {
        setSearch('');
        setSeverity('all');
        setEntity('all');
        setActorType('all');
        setAction('all');
        setDateFrom('');
        setDateTo('');
        setActiveCard(null);
        setPage(1);
        setFetchTrigger(t => t + 1); 
    };

    // FIX 1: stats از serverStats می‌آد، نه از فیلتر روی logs صفحه جاری
    const stats = useMemo(() => ({
        total: totalCount,
        errors: serverStats.errors,
        warnings: serverStats.warnings,
        ok: serverStats.ok,
        fail: serverStats.fail,
    }), [totalCount, serverStats]);

    // FIX 6: userLogs از userLogsData (fetch جداگانه) می‌آد
    const userLogs = useMemo(() => {
        if (!selectedUser) return [];
        return [...userLogsData].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [userLogsData, selectedUser]);

    const userStats = useMemo(() => ({
        total: userLogs.length,
        errors: userLogs.filter(l => l.severity === 'ERROR').length,
        warnings: userLogs.filter(l => l.severity === 'WARNING').length,
        fails: userLogs.filter(l => !l.success).length,
        ips: [...new Set(userLogs.map(l => l.ip).filter(Boolean))] as string[],
    }), [userLogs]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const getSeverityIcon = (s: string) => {
        switch (s) {
            case 'ERROR': return <XCircle className="w-4 h-4 text-red-400" />;
            case 'WARNING': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const exportCSV = () => {
        const headers = ['id', 'user', 'email', 'actorType', 'action', 'entity', 'entityId', 'severity', 'success', 'ip', 'createdAt'];
        const rows = logs.map(log => [
            log.id, log.user?.name || '', log.user?.email || '',
            log.actorType, log.action, log.entity,
            log.entityId || '', log.severity, log.success, log.ip || '', log.createdAt
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `activity-logs-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-white">لاگ فعالیت‌ها</h1>
                    <p className="text-sm text-white/50">بررسی رفتار کاربران و سیستم</p>
                </div>
                <div className="flex gap-2">
                    <GlassButton onClick={exportCSV}>
                        <Download className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton onClick={loadLogs} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </GlassButton>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <GlassCard
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition"
                    onClick={() => { setActiveCard(null); setPage(1); }}
                >
                    <div className="p-2 rounded-lg bg-white/10">
                        <Activity className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                        <p className="text-xs text-white/50">کل لاگ‌ها</p>
                        <p className="text-xl font-bold text-white">{stats.total.toLocaleString('fa-IR')}</p>
                    </div>
                </GlassCard>

                <GlassCard
                    className={`p-4 flex items-center gap-3 cursor-pointer transition hover:bg-white/10 
                        ${activeCard === 'errors' ? 'ring-2 ring-red-400/50 bg-red-500/10' : ''}`}
                    onClick={() => handleCardClick('errors')}
                >
                    <div className="p-2 rounded-lg bg-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <p className="text-xs text-white/50">خطا</p>
                        <p className="text-xl font-bold text-red-400">{stats.errors.toLocaleString('fa-IR')}</p>
                    </div>
                </GlassCard>

                <GlassCard
                    className={`p-4 flex items-center gap-3 cursor-pointer transition hover:bg-white/10 
                        ${activeCard === 'warnings' ? 'ring-2 ring-yellow-400/50 bg-yellow-500/10' : ''}`}
                    onClick={() => handleCardClick('warnings')}
                >
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-xs text-white/50">هشدار</p>
                        <p className="text-xl font-bold text-yellow-400">{stats.warnings.toLocaleString('fa-IR')}</p>
                    </div>
                </GlassCard>

                <GlassCard
                    className={`p-4 flex items-center gap-3 cursor-pointer transition hover:bg-white/10 
                        ${activeCard === 'ok' ? 'ring-2 ring-green-400/50 bg-green-500/10' : ''}`}
                    onClick={() => handleCardClick('ok')}
                >
                    <div className="p-2 rounded-lg bg-green-500/20">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-white/50">موفق</p>
                        <p className="text-xl font-bold text-green-400">{stats.ok.toLocaleString('fa-IR')}</p>
                    </div>
                </GlassCard>

                <GlassCard
                    className={`p-4 flex items-center gap-3 cursor-pointer transition hover:bg-white/10 
                        ${activeCard === 'fail' ? 'ring-2 ring-red-400/50 bg-red-500/10' : ''}`}
                    onClick={() => handleCardClick('fail')}
                >
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <Shield className="w-5 h-5 text-red-300" />
                    </div>
                    <div>
                        <p className="text-xs text-white/50">ناموفق</p>
                        <p className="text-xl font-bold text-red-300">{stats.fail.toLocaleString('fa-IR')}</p>
                    </div>
                </GlassCard>
            </div>

            {/* FILTERS */}
            <GlassCard className="p-4 space-y-3">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-white/40" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="جستجو نام، ایمیل، اکشن..."
                            className="w-full pr-9 pl-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
                        />
                    </div>

                    <select value={actorType} onChange={(e) => { setActorType(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
                        <option value="all">همه نقش‌ها</option>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SYSTEM">SYSTEM</option>
                    </select>

                    <select value={severity} onChange={(e) => { setSeverity(e.target.value as any); setPage(1); }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
                        <option value="all">همه سطوح</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="ERROR">ERROR</option>
                    </select>

                    <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
                        <option value="all">همه Entity‌ها</option>
                        {uniqueEntities.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>

                    <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none min-w-[160px]">
                        <option value="all">همه اکشن‌ها</option>
                        {uniqueActions.map(a => <option key={a} value={a}>{actionLabel[a] || a}</option>)}
                    </select>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-white/50">از تاریخ:</label>
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-white/50">تا تاریخ:</label>
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                    </div>
                    {(search || severity !== 'all' || entity !== 'all' || actorType !== 'all'
                        || action !== 'all' || dateFrom || dateTo || activeCard) && (
                        <button
                            onClick={resetFilters}
                            className="text-xs text-white/50 hover:text-white px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 transition"
                        >
                            پاک کردن فیلترها
                        </button>
                    )}
                    <span className="text-xs text-white/30 mr-auto">
                        {totalCount.toLocaleString('fa-IR')} نتیجه
                    </span>
                </div>
            </GlassCard>

            {/* TABLE */}
            <GlassCard className="p-4 overflow-auto">
                <table className="w-full text-sm text-right">
                    <thead className="border-b border-white/10 text-white/40 text-xs">
                        <tr>
                            <th className="p-3 font-medium">کاربر</th>
                            <th className="p-3 font-medium">مسیر</th>
                            <th className="p-3 font-medium">اکشن</th>
                            <th className="p-3 font-medium">Entity</th>
                            <th className="p-3 font-medium">ID</th>
                            <th className="p-3 font-medium">IP</th>
                            <th className="p-3 font-medium text-center">سطح</th>
                            <th className="p-3 font-medium text-center">وضعیت</th>
                            <th className="p-3 font-medium">تاریخ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-white/30">
                                    {loading ? 'در حال بارگذاری...' : 'لاگی یافت نشد'}
                                </td>
                            </tr>
                        ) : logs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                        <div>
                                            <p
                                                className={`text-xs ${log.user ? 'text-blue-300 cursor-pointer hover:underline' : 'text-white'}`}
                                                onClick={() => log.user && setSelectedUser(log.user)}
                                            >
                                                {log.user?.name || '—'}
                                            </p>
                                            {log.user?.email && (
                                                <p className="text-white/30 text-xs">{log.user.email}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 text-white/40 text-xs font-mono max-w-[160px] truncate" title={log.metadata?.endpoint || ''}>
                                    {log.metadata?.endpoint || '—'}
                                </td>
                                <td className="p-3 text-white/80 text-xs">
                                    {actionLabel[log.action] || log.action}
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-white/30" />
                                        <span className="text-white/70 text-xs">{log.entity}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-white/40 text-xs font-mono">
                                    {log.entityId || '—'}
                                </td>
                                <td className="p-3 text-white/40 text-xs font-mono">
                                    {log.ip || '—'}
                                </td>
                                <td className="p-3 text-center">
                                    {getSeverityIcon(log.severity)}
                                </td>
                                <td className="p-3 text-center">
                                    {log.success
                                        ? <span className="text-green-400 text-xs font-medium">OK</span>
                                        : <span className="text-red-400 text-xs font-medium">FAIL</span>
                                    }
                                </td>
                                <td className="p-3 text-white/40 text-xs whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleString('fa-IR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </GlassCard>

            {/* USER DRILL-DOWN MODAL */}
            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedUser(null)}
                >
                    <div
                        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex items-start justify-between">
                            <div>
                                <h2 className="text-white font-bold text-base">{selectedUser.name}</h2>
                                <p className="text-white/40 text-xs mt-0.5">{selectedUser.email}</p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="text-white/30 hover:text-white transition p-1"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-3 p-5 border-b border-white/10">
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-white text-lg font-bold">{userStats.total}</p>
                                <p className="text-white/40 text-xs mt-0.5">کل</p>
                            </div>
                            <div className="bg-red-500/10 rounded-xl p-3 text-center">
                                <p className="text-red-400 text-lg font-bold">{userStats.errors}</p>
                                <p className="text-white/40 text-xs mt-0.5">خطا</p>
                            </div>
                            <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
                                <p className="text-yellow-400 text-lg font-bold">{userStats.warnings}</p>
                                <p className="text-white/40 text-xs mt-0.5">هشدار</p>
                            </div>
                            <div className="bg-red-500/5 rounded-xl p-3 text-center">
                                <p className="text-red-300 text-lg font-bold">{userStats.fails}</p>
                                <p className="text-white/40 text-xs mt-0.5">ناموفق</p>
                            </div>
                        </div>

                        {/* Suspicious Warning */}
                        {(userStats.errors > 5 || userStats.fails > 10) && (
                            <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                <p className="text-yellow-300 text-xs">
                                    {userStats.errors > 5 && `${userStats.errors} خطا `}
                                    {userStats.fails > 10 && `${userStats.fails} عملیات ناموفق `}
                                    ثبت شده — این کاربر نیاز به بررسی دارد
                                </p>
                            </div>
                        )}

                        {/* IPs */}
                        {userStats.ips.length > 0 && (
                            <div className="px-5 pt-4 flex items-center gap-2 flex-wrap">
                                <span className="text-white/30 text-xs">IPها:</span>
                                {userStats.ips.map(ip => (
                                    <span key={ip} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-mono">
                                        {ip}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {userLogsLoading ? (
                                <div className="flex items-center justify-center py-10 text-white/30 text-sm">
                                    در حال بارگذاری...
                                </div>
                            ) : userLogs.length === 0 ? (
                                <div className="flex items-center justify-center py-10 text-white/30 text-sm">
                                    لاگی یافت نشد
                                </div>
                            ) : (
                                Object.entries(
                                    userLogs.reduce((groups, log) => {
                                        const date = new Date(log.createdAt).toLocaleDateString('fa-IR');
                                        if (!groups[date]) groups[date] = [];
                                        groups[date].push(log);
                                        return groups;
                                    }, {} as Record<string, typeof userLogs>)
                                ).map(([date, dateLogs]) => (
                                    <div key={date} className="mb-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-px flex-1 bg-white/10" />
                                            <span className="text-white/30 text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/5">
                                                {date}
                                            </span>
                                            <div className="h-px flex-1 bg-white/10" />
                                        </div>

                                        <div className="relative">
                                            <div className="absolute right-[11px] top-0 bottom-0 w-px bg-white/10" />
                                            <div className="space-y-1">
                                                {dateLogs.map((log) => {
                                                    const isError = log.severity === 'ERROR';
                                                    const isWarning = log.severity === 'WARNING';
                                                    const isFail = !log.success;

                                                    return (
                                                        <div key={log.id} className="flex gap-4 relative group">
                                                            <div className="flex-shrink-0 mt-3 z-10">
                                                                <div className={`w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center
                                                                    ${isError
                                                                        ? 'bg-red-500/20 border-red-500/60'
                                                                        : isWarning
                                                                        ? 'bg-yellow-500/20 border-yellow-500/60'
                                                                        : isFail
                                                                        ? 'bg-red-300/10 border-red-300/40'
                                                                        : 'bg-green-500/10 border-green-500/30'
                                                                    }`}
                                                                >
                                                                    {isError
                                                                        ? <XCircle className="w-3 h-3 text-red-400" />
                                                                        : isWarning
                                                                        ? <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                                                        : isFail
                                                                        ? <Shield className="w-3 h-3 text-red-300" />
                                                                        : <CheckCircle className="w-3 h-3 text-green-400" />
                                                                    }
                                                                </div>
                                                            </div>

                                                            <div className={`flex-1 mb-1 p-3 rounded-xl border transition-all
                                                                ${isError
                                                                    ? 'bg-red-500/5 border-red-500/15 group-hover:border-red-500/30'
                                                                    : isWarning
                                                                    ? 'bg-yellow-500/5 border-yellow-500/15 group-hover:border-yellow-500/30'
                                                                    : isFail
                                                                    ? 'bg-red-300/5 border-red-300/10 group-hover:border-red-300/25'
                                                                    : 'bg-white/3 border-white/5 group-hover:border-white/15'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={`text-xs font-semibold
                                                                            ${isError ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-white/80'}`}>
                                                                            {actionLabel[log.action] || log.action}
                                                                        </span>
                                                                        <span className="text-white/20 text-xs">·</span>
                                                                        <span className="text-white/30 text-xs flex items-center gap-1">
                                                                            <Package className="w-3 h-3" />
                                                                            {log.entity}
                                                                            {log.entityId && (
                                                                                <span className="font-mono text-white/20">#{log.entityId}</span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {!log.success && (
                                                                            <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">
                                                                                FAIL
                                                                            </span>
                                                                        )}
                                                                        <span className="text-white/20 text-xs font-mono">
                                                                            {new Date(log.createdAt).toLocaleTimeString('fa-IR')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {log.metadata?.endpoint && (
                                                                    <div className="mt-1.5 flex items-center gap-1.5">
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono
                                                                            ${log.metadata?.method === 'POST' ? 'bg-green-500/10 text-green-400'
                                                                            : log.metadata?.method === 'DELETE' ? 'bg-red-500/10 text-red-400'
                                                                            : log.metadata?.method === 'PUT' || log.metadata?.method === 'PATCH' ? 'bg-yellow-500/10 text-yellow-400'
                                                                            : 'bg-blue-500/10 text-blue-400'}`}>
                                                                            {log.metadata?.method || 'GET'}
                                                                        </span>
                                                                        <span className="text-white/30 text-xs font-mono truncate">
                                                                            {log.metadata.endpoint}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {(log.severity === 'ERROR' || !log.success) &&
                                                                    (log.metadata?.error || log.metadata?.errorMessage || log.metadata?.message) && (
                                                                    <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                                                                            <span className="text-red-400 text-xs font-medium">
                                                                                {log.metadata?.errorType || log.metadata?.code || 'Error'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-red-300/70 text-xs font-mono leading-relaxed">
                                                                            {log.metadata?.error || log.metadata?.errorMessage || log.metadata?.message}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {log.ip && (
                                                                    <div className="mt-1 text-white/20 text-xs font-mono">
                                                                        {log.ip}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-white/40">
                        صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 disabled:opacity-30 transition"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs transition ${
                                            pageNum === page
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
                                        }`}
                                    >
                                        {pageNum.toLocaleString('fa-IR')}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 disabled:opacity-30 transition"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LogsMethodsManagement;