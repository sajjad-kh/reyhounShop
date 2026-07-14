import { api } from '../utils/api';
import { TourStep, TourStepInput } from '../types/tour';

export const tourService = {
    // PUBLIC: active steps for a given page (used on the user side)
    getActive: async (page: string): Promise<TourStep[]> => {
        const res = await api.get<{ data: TourStep[] }>('/admin/tours/active', {
            params: { page },
        });

        const data = res?.data;

        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data)) return data;

        return [];
    },

    // ADMIN: all steps
    getAll: async (): Promise<TourStep[]> => {
        const res = await api.get<{ data: TourStep[] }>('/admin/tours');
        const data = res?.data;

        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data)) return data;

        return [];
    },

    // ADMIN: create
    create: async (data: TourStepInput): Promise<TourStep> => {
        const res = await api.post<TourStep>('/admin/tours', data);
        return res.data as TourStep;
    },

    // ADMIN: update
    update: async (id: number, data: TourStepInput): Promise<TourStep> => {
        const res = await api.put<TourStep>(`/admin/tours/${id}`, data);
        return res.data as TourStep;
    },

    // ADMIN: delete
    remove: async (id: number): Promise<void> => {
        await api.delete(`/admin/tours/${id}`);
    },
};
