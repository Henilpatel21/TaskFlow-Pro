import { create } from 'zustand';
import { authApi, usersApi } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  error: null,

  // Initialize auth state from stored token
  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const { data } = await authApi.getMe();
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      initSocket(token);
    } catch (error) {
      localStorage.removeItem('accessToken');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Register new user
  register: async (name, email, password) => {
    set({ error: null });
    try {
      const { data } = await authApi.register({ name, email, password });
      localStorage.setItem('accessToken', data.accessToken);
      set({
        user: data.user,
        isAuthenticated: true,
      });
      initSocket(data.accessToken);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Login user
  login: async (email, password) => {
    set({ error: null });
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('accessToken', data.accessToken);
      set({
        user: data.user,
        isAuthenticated: true,
        isGuest: false,
      });
      initSocket(data.accessToken);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Guest entry (name and email only)
  guestEntry: async (name, email) => {
    set({ error: null });
    try {
      const { data } = await authApi.guest({ name, email });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('isGuest', 'true');
      set({
        user: data.user,
        isAuthenticated: true,
        isGuest: true,
      });
      initSocket(data.accessToken);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Entry failed';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isGuest');
    disconnectSocket();
    set({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      error: null,
    });
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const { data: response } = await usersApi.updateProfile(data);
      set({ user: response.user });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Update failed',
      };
    }
  },

  // Set active team
  setActiveTeam: async (teamId) => {
    try {
      const { data } = await usersApi.setActiveTeam(teamId);
      set({ user: data.user });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to set active team',
      };
    }
  },

  // Update user data (for socket events)
  updateUser: (userData) => {
    set((state) => ({
      user: { ...state.user, ...userData },
    }));
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
