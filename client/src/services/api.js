import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  guest: (data) => api.post('/auth/guest', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersApi = {
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
  setActiveTeam: (teamId) => api.put('/users/active-team', { teamId }),
  searchUsers: (email) => api.get('/users/search', { params: { email } }),
};

// Teams API
export const teamsApi = {
  create: (data) => api.post('/teams', data),
  getAll: () => api.get('/teams'),
  getOne: (teamId) => api.get(`/teams/${teamId}`),
  update: (teamId, data) => api.put(`/teams/${teamId}`, data),
  delete: (teamId) => api.delete(`/teams/${teamId}`),
  addMember: (teamId, email, role) =>
    api.post(`/teams/${teamId}/members`, { email, role }),
  updateMemberRole: (teamId, userId, role) =>
    api.put(`/teams/${teamId}/members/${userId}/role`, { role }),
  removeMember: (teamId, userId) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
  leave: (teamId) => api.post(`/teams/${teamId}/leave`),
  getActivity: (teamId, params) =>
    api.get(`/teams/${teamId}/activity`, { params }),
};

// Tasks API
export const tasksApi = {
  create: (data) => api.post('/tasks', data),
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (taskId) => api.get(`/tasks/${taskId}`),
  update: (taskId, data) => api.put(`/tasks/${taskId}`, data),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
  reorder: (data) => api.put('/tasks/reorder', data),
  updateChecklistItem: (taskId, itemId, data) =>
    api.put(`/tasks/${taskId}/checklist/${itemId}`, data),
  bulkUpdate: (data) => api.put('/tasks/bulk', data),
  bulkDelete: (data) => api.delete('/tasks/bulk', { data }),
  // Time tracking
  startTimer: (taskId) => api.post(`/tasks/${taskId}/timer/start`),
  stopTimer: (taskId) => api.post(`/tasks/${taskId}/timer/stop`),
  updateTimeEstimate: (taskId, estimatedMinutes) =>
    api.put(`/tasks/${taskId}/time-estimate`, { estimatedMinutes }),
  addTimeEntry: (taskId, duration) =>
    api.post(`/tasks/${taskId}/time-entry`, { duration }),
};

// Projects API
export const projectsApi = {
  create: (data) => api.post('/projects', data),
  getAll: (params) => api.get('/projects', { params }),
  getOne: (projectId) => api.get(`/projects/${projectId}`),
  update: (projectId, data) => api.put(`/projects/${projectId}`, data),
  delete: (projectId) => api.delete(`/projects/${projectId}`),
  reorder: (data) => api.put('/projects/reorder', data),
};

// Invites API
export const invitesApi = {
  create: (data) => api.post('/invites', data),
  getTeamInvites: (teamId) => api.get(`/invites/team/${teamId}`),
  getMyInvites: () => api.get('/invites/my'),
  accept: (inviteId) => api.post(`/invites/${inviteId}/accept`),
  decline: (inviteId) => api.post(`/invites/${inviteId}/decline`),
  cancel: (inviteId) => api.delete(`/invites/${inviteId}`),
  getByToken: (token) => api.get(`/invites/token/${token}`),
};

// Notifications API
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`),
  clearAll: () => api.delete('/notifications'),
};

export default api;
