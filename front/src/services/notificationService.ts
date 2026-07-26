import { api } from './apiClient';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

const notificationService = {
  getNotifications: async (page = 1, limit = 30): Promise<NotificationsResponse> => {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get('/notifications/unread-count');
    return data.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};

export default notificationService;
