import api from '../api';

export interface Notification {
  notification_id: number;
  user_id: number | null;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  link: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationCreate {
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, any> | null;
  user_id?: number | null;
}

export const notificationsService = {
  /**
   * Get notifications for current user
   */
  list: async (params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
  }): Promise<Notification[]> => {
    const response = await api.get('/api/notifications/', { params });
    return response.data;
  },

  /**
   * Get count of unread notifications
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ updated: number }> => {
    const response = await api.put('/api/notifications/read-all');
    return response.data;
  },

  /**
   * Delete notification
   */
  delete: async (notificationId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Create test notifications (admin only)
   */
  createTest: async (): Promise<{ success: boolean; created: number; skipped: number; message: string }> => {
    const response = await api.post('/api/notifications/test-create');
    return response.data;
  },
};

