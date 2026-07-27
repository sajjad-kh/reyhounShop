import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { adminService } from '../../services/adminService';
import { User } from '../../types/auth';
import { Search, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';
import { toast } from '../../utils/toast';

const getPageRange = (current: number, total: number): (number | '...')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [stats, setStats] = useState<{
        totalUsers: number;
        totalAdmins: number;
        totalCustomers: number;
        activeUsers: number;
        totalLoyaltyPoints: number;
    } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [page, searchQuery, roleFilter]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminService.getUserStats();
                if (res.data) setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch user stats:', err);
            }
        };
        fetchStats();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await adminService.getAllUsers({
                page,
                limit: 10,
                search: searchQuery || undefined,
                role: roleFilter || undefined,
            });
            // Ensure users is always an array
            const usersData = Array.isArray(response.data) ? response.data : [];
            setUsers(usersData);
            if (response.pagination) {
                setTotalPages(response.pagination.totalPages || response.pagination.pages || 1);
                setTotalUsersCount(response.pagination.total || 0);
            }
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            setError(err.message || 'Failed to load users');
            setUsers([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: number, newRole: string) => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

        try {
            await adminService.updateUserRole(userId, newRole);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'خطا در تغییر نقش کاربر');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
            return;

        try {
            await adminService.deleteUser(userId);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'خطا در حذف کاربر');
        }
    };

    if (loading && users.length === 0) {
        return <LoadingSpinner fullScreen label="در حال بارگذاری کاربران..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-primary p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-primary mb-2">
                        User Management
                    </h1>
                    <p className="text-text-secondary">Manage user accounts and permissions</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="relative overflow-hidden p-6">
                        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-accent-primary/20 blur-2xl" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-muted text-sm mb-1">کل کاربران</p>
                                <p className="text-3xl font-bold text-text-primary" dir="ltr">
                                    {(stats?.totalUsers ?? 0).toLocaleString("fa-IR")}
                                </p>
                                <p className="text-xs text-success-color mt-1">
                                    {stats ? `${stats.activeUsers.toLocaleString("fa-IR")} فعال` : ''}
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-primary/30 to-accent-secondary/20">
                                <UsersIcon className="w-7 h-7 text-accent-primary" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="relative overflow-hidden p-6">
                        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-warning-color/20 blur-2xl" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-muted text-sm mb-1">مدیران</p>
                                <p className="text-3xl font-bold text-text-primary" dir="ltr">
                                    {(stats?.totalAdmins ?? 0).toLocaleString("fa-IR")}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                    {stats ? `${stats.totalCustomers.toLocaleString("fa-IR")} مشتری` : ''}
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-warning-color/30 to-error-color/20">
                                <Shield className="w-7 h-7 text-warning-color" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="relative overflow-hidden p-6">
                        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-success-color/20 blur-2xl" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-muted text-sm mb-1">مجموع امتیازات وفاداری</p>
                                <p className="text-3xl font-bold text-text-primary" dir="ltr">
                                    {(stats?.totalLoyaltyPoints ?? 0).toLocaleString("fa-IR")}
                                </p>
                                <p className="text-xs text-success-color mt-1">امتیاز در گردش</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-success-color/30 to-accent-primary/20">
                                <UsersIcon className="w-7 h-7 text-success-color" />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Filters */}
                <GlassCard className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full md:w-auto">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <GlassInput
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(value) => setSearchQuery(value)}
                                className="pl-12 w-full"
                            />
                        </div>
                        <DropdownSelect
                            value={roleFilter}
                            onChange={setRoleFilter}
                            placeholder="همه نقش‌ها"
                            className="min-w-[160px]"
                            options={[
                                { value: '', label: 'همه نقش‌ها' },
                                ...Object.values(USER_ROLES).map((role) => ({
                                    value: role,
                                    label: role,
                                })),
                            ]}
                        />
                    </div>
                </GlassCard>

                {/* Users Table */}
                <GlassCard className="p-6">
                    {error ? (
                        <div className="text-center py-8">
                            <p className="text-error-color mb-4">{error}</p>
                            <GlassButton onClick={fetchUsers}>Retry</GlassButton>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8">
                            <UsersIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
                            <p className="text-text-secondary">No users found</p>
                        </div>
                    ) : (
                        <>
                            <div className="[direction:rtl] overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border-glass-light ">
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                ID
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                User
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Email
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Phone
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Role
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Loyalty Points
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Joined
                                            </th>
                                            <th className="text-right py-3 px-4 text-text-secondary font-medium">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-border-glass-light hover:bg-glass-light transition-colors"
                                            >
                                                <td className="py-3 px-4 text-text-muted font-mono text-sm">
                                                    #{user.id}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-semibold">
                                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <p className="text-text-primary font-medium">
                                                            {user.name || 'Unknown'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-text-primary">
                                                    {user.email}
                                                </td>
                                                <td className="py-3 px-4 text-text-secondary">
                                                    {user.phone || 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <DropdownSelect
                                                        value={user.role}
                                                        onChange={(v) => handleUpdateRole(user.id, v)}
                                                        className={`min-w-[130px] text-xs ${
                                                            user.role === 'ADMIN'
                                                                ? '[&>button]:!border-warning-color/40 [&>button]:!text-warning-color'
                                                                : '[&>button]:!border-accent-primary/40 [&>button]:!text-accent-primary'
                                                        }`}
                                                        options={Object.values(USER_ROLES).map((role) => ({
                                                            value: role,
                                                            label: role,
                                                        }))}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-text-primary">
                                                    <span className="px-3 py-1 rounded-full bg-success-color/20 text-success-color text-xs font-medium">
                                                        {user.loyaltyPoints || 0} امتیاز
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-text-secondary text-sm">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("FA-IR") : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-error-color" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 pt-5 border-t border-white/5">
                                    <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                                        <p className="text-sm text-text-muted" dir="ltr">
                                            نمایش{' '}
                                            <span className="text-text-primary font-semibold">
                                                {((page - 1) * 10 + 1).toLocaleString("fa-IR")}
                                            </span>{' '}
                                            تا{' '}
                                            <span className="text-text-primary font-semibold">
                                                {Math.min(page * 10, totalUsersCount).toLocaleString("fa-IR")}
                                            </span>{' '}
                                            از{' '}
                                            <span className="text-accent-primary font-semibold">
                                                {totalUsersCount.toLocaleString("fa-IR")}
                                            </span>{' '}
                                            کاربر
                                        </p>
                                        <p className="text-sm text-text-muted">
                                            صفحه{' '}
                                            <span className="text-text-primary font-semibold">
                                                {page.toLocaleString("fa-IR")}
                                            </span>{' '}
                                            از {totalPages.toLocaleString("fa-IR")}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="group flex items-center gap-1 px-3.5 py-2 rounded-xl glass-input text-sm text-text-secondary hover:text-text-primary hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                                        >
                                            <span className="text-xs">›</span>
                                            قبلی
                                        </button>

                                        {getPageRange(page, totalPages).map((p, i) =>
                                            p === '...' ? (
                                                <span
                                                    key={`e${i}`}
                                                    className="px-2 py-2 text-text-muted select-none"
                                                    title="صفحات بیشتر"
                                                >
                                                    …
                                                </span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => setPage(p)}
                                                    className={`relative min-w-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                                                        p === page
                                                            ? 'bg-gradient-to-l from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30 scale-105'
                                                            : 'glass-input text-text-secondary hover:text-text-primary hover:border-accent-primary/40'
                                                    }`}
                                                >
                                                    {p.toLocaleString("fa-IR")}
                                                </button>
                                            )
                                        )}

                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="group flex items-center gap-1 px-3.5 py-2 rounded-xl glass-input text-sm text-text-secondary hover:text-text-primary hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                                        >
                                            بعدی
                                            <span className="text-xs">‹</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </GlassCard>
            </div>
        </div>
    );
};

export default UserManagement;
