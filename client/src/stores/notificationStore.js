import { create } from 'zustand';
import { notificationsApi } from '../services/api';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  // Fetch notifications
  fetchNotifications: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await notificationsApi.getAll(params);
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        isLoading: false,
      });
      return { success: true, pagination: data.pagination };
    } catch (error) {
      set({ isLoading: false });
      return { success: false };
    }
  },

  // Mark as read
  markAsRead: async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const notification = get().notifications.find(
        (n) => n._id === notificationId
      );
      await notificationsApi.delete(notificationId);
      set((state) => ({
        notifications: state.notifications.filter(
          (n) => n._id !== notificationId
        ),
        unreadCount: notification?.read
          ? state.unreadCount
          : Math.max(0, state.unreadCount - 1),
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Clear all
  clearAll: async () => {
    try {
      await notificationsApi.clearAll();
      set({ notifications: [], unreadCount: 0 });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Add notification from socket
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Clear state
  clearNotificationState: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));

export default useNotificationStore;
