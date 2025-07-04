import axios from 'axios';

// Create Axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', email); // Backend expects 'username' field for email
    params.append('password', password);
    
    return api.post('/v1/users/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
  
  logout: () => api.post('/v1/auth/logout'),
  
  getCurrentUser: () => api.get('/v1/users/me'),
};

// Checklists API endpoints
export const checklistsAPI = {
  getAll: () => api.get('/v1/checklists/'),
  
  getById: (id: string) => api.get(`/v1/checklists/${id}`),
  
  getItems: (id: string) => api.get(`/v1/checklists/${id}/items`),
  
  search: (query: string, category?: string, limit = 20) =>
    api.get('/v1/checklists/search', {
      params: { q: query, category, limit },
    }),
  
  submit: (checklistId: string, answers: Record<string, any>) =>
    api.post(`/v1/checklists/${checklistId}/submit`, { answers }),
  
  upload: (id: string, formData: FormData) =>
    api.post(`/v1/checklists/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getStatus: (uploadId: string) => api.get(`/v1/uploads/${uploadId}/status`),
  
  export: (id: string, format: 'csv' | 'xlsx' | 'pdf') =>
    api.get(`/v1/checklists/${id}/export?format=${format}`, {
      responseType: 'blob',
    }),
};

// Submissions API endpoints
export const submissionsAPI = {
  getAll: () => api.get('/v1/submissions/'),
  
  getById: (id: string) => api.get(`/v1/submissions/${id}`),
  
  getByChecklist: (checklistId: string) =>
    api.get(`/v1/submissions/checklist/${checklistId}`),
  
  create: (checklistId: string, answers: Array<{ item_id: number; answer: string; score?: number }>) =>
    api.post('/v1/submissions/', {
      checklist_id: checklistId,
      answers,
    }),
};

// AI Processing API endpoints (updated to match backend)
export const aiAPI = {
  // Get AI results for uploaded files (from uploads router)
  getResults: (params?: Record<string, any>) =>
    api.get('/v1/search/ai-results', { params }),
  
  getResult: (id: string) => api.get(`/v1/search/ai-results/${id}`),
  
  // Get results by file upload ID
  getResultByUpload: (uploadId: string) =>
    api.get(`/v1/search/ai-results`, { params: { upload_id: uploadId } }),
};

// Reviews API endpoints
export const reviewsAPI = {
  getAll: () => api.get('/v1/reviews/'),
  
  getById: (id: string) => api.get(`/v1/reviews/${id}`),
  
  approve: (uploadId: string, comment?: string) =>
    api.post(`/v1/reviews/${uploadId}/approve`, { comment }),
  
  reject: (uploadId: string, comment: string) =>
    api.post(`/v1/reviews/${uploadId}/reject`, { comment }),
  
  getComments: (uploadId: string) =>
    api.get(`/v1/reviews/${uploadId}/comments`),
  
  addComment: (uploadId: string, comment: string) =>
    api.post(`/v1/reviews/${uploadId}/comments`, { comment }),
  
  getStatus: (uploadId: string) =>
    api.get(`/v1/reviews/${uploadId}/status`),
};

// Uploads API endpoints (updated to match backend)
export const uploadsAPI = {
  search: (params?: Record<string, any>) =>
    api.get('/v1/search/file-uploads', { params }),
  
  addComment: (uploadId: string, comment: string, status?: string) =>
    api.post(`/v1/uploads/${uploadId}/comment`, { comment, status }),
  
  getById: (uploadId: string) =>
    api.get(`/v1/uploads/${uploadId}`),
  
  getStatus: (uploadId: string) =>
    api.get(`/v1/uploads/${uploadId}/status`),
};

// Comments/Reviews API endpoints
export const commentsAPI = {
  getByUpload: (uploadId: string) =>
    api.get(`/v1/uploads/${uploadId}/comments`),
  
  addComment: (uploadId: string, comment: string, status?: string) =>
    api.post(`/v1/uploads/${uploadId}/comment`, { comment, status }),
  
  updateComment: (commentId: string, data: any) =>
    api.put(`/v1/comments/${commentId}`, data),
  
  deleteComment: (commentId: string) =>
    api.delete(`/v1/comments/${commentId}`),
};

// Notifications API endpoints
export const notificationsAPI = {
  getAll: () => api.get('/v1/notifications/my'),
  
  markAsRead: (id: string) => api.post(`/v1/notifications/${id}/read`),
  
  markAllAsRead: () => api.patch('/v1/notifications/mark-all-read'),
  
  getUnreadCount: () => api.get('/v1/notifications/unread-count'),
  
  send: (data: { recipient_id: string; message: string; type?: string }) =>
    api.post('/v1/notifications/send', data),
};

// Export API endpoints
export const exportAPI = {
  exportChecklists: (format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/v1/export/checklists?format=${format}`, {
      responseType: 'blob',
    }),
  
  exportAIResults: (format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/v1/export/ai-results?format=${format}`, {
      responseType: 'blob',
    }),
  
  exportUsers: (format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/v1/export/users?format=${format}`, {
      responseType: 'blob',
    }),
  
  exportSubmissions: (format: 'csv' | 'xlsx' = 'csv') =>
    api.get(`/v1/export/submissions?format=${format}`, {
      responseType: 'blob',
    }),
  
  exportAuditLogs: (params: { format: 'csv' | 'xlsx'; [key: string]: any }) =>
    api.get(`/v1/export/audit-logs?format=${params.format}`, {
      params: { ...params, format: undefined },
      responseType: 'blob',
    }),
};

// Admin API endpoints (Enhanced)
export const adminAPI = {
  // User management
  getAllUsers: (params?: Record<string, any>) => api.get('/v1/admin/users/', { params }),
  
  getUserById: (userId: string) => api.get(`/v1/admin/users/${userId}`),
  
  createUser: (userData: any) => api.post('/v1/admin/users/', userData),
  
  updateUser: (userId: string, userData: any) => api.put(`/v1/admin/users/${userId}`, userData),
  
  deleteUser: (userId: string) => api.delete(`/v1/admin/users/${userId}`),
  
  resetUserPassword: (userId: string) => api.post(`/v1/admin/users/${userId}/reset-password`),
  
  updateUserRole: (userId: string, role: string) => api.put(`/v1/admin/users/${userId}/role`, { role }),
  
  // System configuration
  getSystemConfig: () => api.get('/v1/admin/system/config'),
  
  updateSystemConfig: (config: any) => api.put('/v1/admin/system/config', config),
  
  resetSystemConfig: () => api.post('/v1/admin/system/config/reset'),
  
  // Checklist management
  getAllChecklists: (params?: Record<string, any>) => api.get('/v1/admin/checklists/', { params }),
  
  getChecklistById: (checklistId: string) => api.get(`/v1/admin/checklists/${checklistId}`),
  
  createChecklist: (checklistData: any) => api.post('/v1/admin/checklists/', checklistData),
  
  updateChecklist: (checklistId: string, checklistData: any) => 
    api.put(`/v1/admin/checklists/${checklistId}`, checklistData),
  
  deleteChecklist: (checklistId: string) => api.delete(`/v1/admin/checklists/${checklistId}`),
  
  getChecklistItems: (checklistId: string) => api.get(`/v1/admin/checklists/${checklistId}/items`),
  
  createChecklistItem: (checklistId: string, itemData: any) =>
    api.post(`/v1/admin/checklists/${checklistId}/items`, itemData),
  
  updateChecklistItem: (itemId: string, itemData: any) =>
    api.put(`/v1/admin/checklists/items/${itemId}`, itemData),
  
  deleteChecklistItem: (itemId: string) => api.delete(`/v1/admin/checklists/items/${itemId}`),
  
  getChecklistStats: () => api.get('/v1/admin/checklists/stats/summary'),
};

// Enhanced Analytics API
export const analyticsAPI = {
  getSummary: () => api.get('/v1/analytics/overall'),
  
  getScoreTrends: (checklistId?: string) =>
    api.get('/v1/analytics/score-trend', {
      params: checklistId ? { checklistId } : {},
    }),
  
  getCategoryBreakdown: (checklistId?: string) =>
    api.get('/v1/analytics/score-by-checklist', {
      params: checklistId ? { checklistId } : {},
    }),
  
  getScoreByUser: (userId?: string) =>
    api.get('/v1/analytics/score-by-user', {
      params: userId ? { userId } : {},
    }),
  
  getScoreDistribution: (params?: Record<string, any>) =>
    api.get('/v1/analytics/score-distribution', { params }),
  
  getLeaderboard: (params?: Record<string, any>) =>
    api.get('/v1/analytics/leaderboard', { params }),
  
  getChecklistStats: () => api.get('/v1/analytics/checklist-stats'),
};

// Enhanced Search API
export const searchAPI = {
  fileUploads: (params?: Record<string, any>) =>
    api.get('/v1/search/file-uploads', { params }),
  
  submissions: (params?: Record<string, any>) =>
    api.get('/v1/search/submissions', { params }),
  
  aiResults: (params?: Record<string, any>) =>
    api.get('/v1/search/ai-results', { params }),
  
  users: (params?: Record<string, any>) =>
    api.get('/v1/search/users', { params }),
  
  notifications: (params?: Record<string, any>) =>
    api.get('/v1/search/notifications', { params }),
  
  submissionAnswers: (params?: Record<string, any>) =>
    api.get('/v1/search/submission-answers', { params }),
  
  checklists: (params?: Record<string, any>) =>
    api.get('/v1/search/checklists', { params }),
  
  checklistItems: (params?: Record<string, any>) =>
    api.get('/v1/search/checklist-items', { params }),
  
  comments: (params?: Record<string, any>) =>
    api.get('/v1/search/comments', { params }),
  
  auditLogs: (params?: Record<string, any>) =>
    api.get('/v1/search/audit-logs', { params }),
  
  systemConfig: (params?: Record<string, any>) =>
    api.get('/v1/search/system-config', { params }),
  
  globalSearch: (params?: Record<string, any>) =>
    api.get('/v1/search/global', { params }),
};

// Audit API endpoints  
export const auditAPI = {
  getAuditLogs: (params?: Record<string, any>) =>
    api.get('/v1/audit/logs', { params }),
  
  getSystemHealth: () => api.get('/v1/audit/system-health'),
  
  getSecurityEvents: () => api.get('/v1/audit/security-events'),
};

export default api;
