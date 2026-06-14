import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { adminService } from '../../services/adminService';
import { User } from '../../types/auth';
import { Search, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { USER_ROLES } from '../../utils/constants';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchUsers();
    }, [page, searchQuery, roleFilter]);

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
                setTotalPages(response.pagination.totalPages || 1);
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
            alert(err.message || 'Failed to update user role');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
            return;

        try {
            await adminService.deleteUser(userId);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6">
                <div className="max-w-7xl mx-auto">
                    <GlassCard className="p-8 text-center">
                        <div className="glass-spinner w-12 h-12 mx-auto mb-4" />
                        <p className="text-text-secondary">Loading users...</p>
                    </GlassCard>
                </div>
            </div>
        );
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
                    <GlassCard className="p-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <UsersIcon className="w-6 h-6 text-accent-primary" />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Total Users</p>
                                <p className="text-2xl font-bold text-text-primary">
                                    {users.length.toLocaleString("fa-IR")}
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <Shield className="w-6 h-6 text-warning-color" />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Admins</p>
                                <p className="text-2xl font-bold text-text-primary">
                                    {users.filter((u) => u.role === 'ADMIN').length.toLocaleString("fa-IR")}
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-glass-medium">
                                <UsersIcon className="w-6 h-6 text-success-color" />
                            </div>
                            <div>
                                <p className="text-text-muted text-sm">Customers</p>
                                <p className="text-2xl font-bold text-text-primary">
                                    {users.filter((u) => u.role === 'USER').length.toLocaleString("fa-IR")}
                                </p>
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
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="glass-input px-4 py-2 rounded-xl"
                        >
                            <option value="">All Roles</option>
                            {Object.values(USER_ROLES).map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
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
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) =>
                                                            handleUpdateRole(user.id, e.target.value)
                                                        }
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                                            ? 'bg-warning-color/20 text-warning-color'
                                                            : 'bg-accent-primary/20 text-accent-primary'
                                                            }`}
                                                    >
                                                        {Object.values(USER_ROLES).map((role) => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="py-3 px-4 text-text-primary">
                                                    <span className="px-3 py-1 rounded-full bg-success-color/20 text-success-color text-xs font-medium">
                                                        {user.loyaltyPoints || 0} pts
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
                                <div className="flex items-center justify-center space-x-2 mt-6">
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </GlassButton>
                                    <span className="text-text-secondary px-4">
                                        Page {page} of {totalPages}
                                    </span>
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </GlassButton>
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
