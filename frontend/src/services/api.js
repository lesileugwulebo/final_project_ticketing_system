import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enables sending/receiving secure httpOnly cookies
});

// Memory token holder
let accessToken = '';

export const setAccessToken = (token) => {
  accessToken = token;
};

// Automatic Header Interceptor
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt to rotate JWT using secure refresh cookie
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        if (res.data?.access_token) {
          setAccessToken(res.data.access_token);
          originalRequest.headers['Authorization'] = `Bearer ${res.data.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token expired or invalid; trigger logout/cleanup
        accessToken = '';
      }
    }
    return Promise.reject(error);
  }
);

// API Service Interfaces
export const api = {
  // Authentication
  auth: {
    login: async (email, password) => {
      // API expects standard form-url-encoded logins
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const res = await apiClient.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.data;
    },
    logout: async () => {
      const res = await apiClient.post('/auth/logout');
      setAccessToken('');
      return res.data;
    },
  },
  
  // Users Management
  users: {
    getMe: async () => {
      const res = await apiClient.get('/users/me');
      return res.data;
    },
    list: async () => {
      const res = await apiClient.get('/users');
      return res.data;
    },
    create: async (userData) => {
      const res = await apiClient.post('/users', userData);
      return res.data;
    },
    update: async (id, userData) => {
      const res = await apiClient.put(`/users/${id}`, userData);
      return res.data;
    },
  },

  // Tickets Service
  tickets: {
    list: async (filters = {}) => {
      const res = await apiClient.get('/tickets', { params: filters });
      return res.data;
    },
    get: async (id) => {
      const res = await apiClient.get(`/tickets/${id}`);
      return res.data;
    },
    create: async (ticketData) => {
      const res = await apiClient.post('/tickets', ticketData);
      return res.data;
    },
    assign: async (id, assigneeId) => {
      const res = await apiClient.patch(`/tickets/${id}/assign`, null, {
        params: { assignee_id: assigneeId },
      });
      return res.data;
    },
    updateStatus: async (id, status) => {
      const res = await apiClient.patch(`/tickets/${id}/status`, null, {
        params: { new_status: status },
      });
      return res.data;
    },
    addComment: async (id, commentData) => {
      const res = await apiClient.post(`/tickets/${id}/comments`, commentData);
      return res.data;
    },
    uploadAttachment: async (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(`/tickets/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
  },

  // Disaster Recovery Logs and Failover Actions
  dr: {
    getBackupLogs: async () => {
      const res = await apiClient.get('/dr/backup-logs');
      return res.data;
    },
    triggerFailover: async () => {
      const res = await apiClient.post('/dr/failover');
      return res.data;
    },
  },
};
export default api;
