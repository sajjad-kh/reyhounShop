import { api } from '../utils/api';

export interface BankAccount {
    id: number;
    bankName: string;
    cardNumber: string;
    sheba: string;
    holderName: string;
    isActive: boolean;
    priority: number;
}

export const bankAccountService = {
    getAll: async (): Promise<BankAccount[]> => {
        const res = await api.get('/bank-accounts');

        const data = res?.data;

        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data)) return data;

        return [];
    },

    create: async (data: Partial<BankAccount>) => {
        const res = await api.post('/bank-accounts', data);
        return res.data;
    },

    update: async (id: number, data: Partial<BankAccount>) => {
        const res = await api.put(`/bank-accounts/${id}`, data);
        return res.data;
    },

    remove: async (id: number) => {
        const res = await api.delete(`/bank-accounts/${id}`);
        return res.data;
    },
};