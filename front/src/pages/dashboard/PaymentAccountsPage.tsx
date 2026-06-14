import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';

import { bankAccountService, BankAccount } from '../../services/bankAccountService';

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const initialForm = {
    bankName: '',
    cardNumber: '',
    sheba: '',
    holderName: '',
    isActive: true,
    priority: 1,
};

export const PaymentAccountsPage: React.FC = () => {

    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<BankAccount | null>(null);
    const [form, setForm] = useState(initialForm);

    // =========================
    // QUERY
    // =========================
    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: bankAccountService.getAll,
    });

    // =========================
    // CREATE
    // =========================
    const createMutation = useMutation({
        mutationFn: bankAccountService.create,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
    });

    // =========================
    // UPDATE
    // =========================
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: any) =>
            bankAccountService.update(id, data),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
    });

    // =========================
    // DELETE
    // =========================
    const deleteMutation = useMutation({
        mutationFn: bankAccountService.remove,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
    });

    // =========================
    // MODAL HANDLERS
    // =========================
    const openCreate = () => {
        setEditing(null);
        setForm(initialForm);
        setIsModalOpen(true);
    };

    const openEdit = (acc: BankAccount) => {
        setEditing(acc);
        setForm(acc);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditing(null);
        setForm(initialForm);
    };

    const saveAccount = () => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }

        closeModal();
    };

    const isMutating =
        createMutation.isPending ||
        updateMutation.isPending;

    return (
        <div className="space-y-8">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        Payment Accounts
                    </h1>
                    <p className="text-sm text-text-secondary">
                        Manage bank accounts
                    </p>
                </div>

                <GlassButton onClick={openCreate}>
                    <PlusIcon />
                    <span className="ml-2">New Account</span>
                </GlassButton>
            </div>

            {/* LOADING */}
            {isLoading && (
                <div className="text-text-secondary">
                    Loading...
                </div>
            )}

            {/* EMPTY */}
            {!isLoading && accounts.length === 0 && (
                <GlassCard className="p-10 text-center text-text-secondary">
                    No bank accounts found
                </GlassCard>
            )}

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {accounts.map(acc => (
                    <GlassCard key={acc.id} className="p-5 space-y-4">

                        {/* HEADER */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-text-primary">
                                    {acc.bankName}
                                </h3>
                                <p className="text-xs text-text-secondary">
                                    {acc.holderName}
                                </p>
                            </div>

                            <span className={`text-xs px-2 py-1 rounded-full ${
                                acc.isActive
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                            }`}>
                                {acc.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* CARD */}
                        <div className="text-sm bg-glass-light p-2 rounded text-text-primary">
                            {acc.cardNumber}
                        </div>

                        {/* SHEBA */}
                        <div className="text-xs text-text-secondary break-all">
                            {acc.sheba}
                        </div>

                        {/* ACTIONS */}
                        <div className="flex justify-between pt-2 border-t border-border-glass-light">

                            <button
                                onClick={() => openEdit(acc)}
                                className="flex items-center gap-1 text-blue-400 text-sm"
                            >
                                <EditIcon /> Edit
                            </button>

                            <button
                                onClick={() => deleteMutation.mutate(acc.id)}
                                className="flex items-center gap-1 text-red-400 text-sm"
                            >
                                <TrashIcon /> Delete
                            </button>

                        </div>

                    </GlassCard>
                ))}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeModal}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <GlassCard className="w-full max-w-2xl max-h-[90vh] flex flex-col">

                            {/* HEADER */}
                            <div className="p-5 border-b border-border-glass-light">
                                <h2 className="text-lg font-semibold text-text-primary">
                                    {editing ? 'Edit Bank Account' : 'Create New Account'}
                                </h2>
                                <p className="text-xs text-text-secondary mt-1">
                                    Fill the required bank details carefully
                                </p>
                            </div>

                            {/* BODY */}
                            <div className="p-5 space-y-6 overflow-y-auto">

                                {/* BANK INFO */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-text-primary">
                                        Bank Information
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <GlassInput
                                            label="Bank Name"
                                            value={form.bankName}
                                            onChange={(value) =>
                                                setForm({ ...form, bankName: value })
                                            }
                                        />

                                        <GlassInput
                                            label="Holder Name"
                                            value={form.holderName}
                                            onChange={(value) =>
                                                setForm({ ...form, holderName: value })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* CARD INFO */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-text-primary">
                                        Card Details
                                    </h3>

                                    <div className="space-y-3">

                                        {/* CARD NUMBER */}
                                        <GlassInput
                                            label="Card Number"
                                            value={form.cardNumber}
                                            onChange={(value) =>
                                                setForm({ ...form, cardNumber: value })
                                            }
                                        />

                                        {/* SHEBA */}
                                        <GlassInput
                                            label="Sheba (IBAN)"
                                            value={form.sheba}
                                            onChange={(value) =>
                                                setForm({ ...form, sheba: value })
                                            }
                                        />

                                    </div>
                                </div>

                                {/* SETTINGS */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-text-primary">
                                        Settings
                                    </h3>

                                    <GlassInput
                                        label="Priority"
                                        type="number"
                                        value={form.priority}
                                    onChange={(value) =>
                                        setForm({ ...form, priority: Number(value) })
                                    }
                                    />

                                    {/* STATUS */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-glass-light">
                                        <div>
                                            <p className="text-sm text-text-primary">
                                                Account Status
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                Enable or disable this account
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setForm({ ...form, isActive: !form.isActive })
                                            }
                                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                                                form.isActive
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}
                                        >
                                            {form.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* FOOTER */}
                            <div className="p-5 border-t border-border-glass-light flex justify-end gap-3">

                                <GlassButton variant="secondary" onClick={closeModal}>
                                    Cancel
                                </GlassButton>

                                <GlassButton
                                    variant="accent"
                                    onClick={saveAccount}
                                    disabled={isMutating}
                                >
                                    {isMutating
                                        ? 'Saving...'
                                        : editing
                                            ? 'Update Account'
                                            : 'Create Account'}
                                </GlassButton>

                            </div>

                        </GlassCard>
                    </div>
                </div>
            )}

        </div>
    );
};