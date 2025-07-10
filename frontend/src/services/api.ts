import axios from 'axios';

// Type definitions for API requests
interface UserData {
  email: string;
  name: string;
  role: string;
  department?: string;
}

interface ChecklistData {
  title: string;
  description?: string;
  category?: string;
  items?: unknown[];
}

interface SystemConfig {
  [key: string]: unknown;
}

export interface FileUploadData {
  id: string;
  filename: string;
  size: number;
  status: string;
  created_at: string;
  ai_score?: number;
  user_id?: string;
  checklist_id?: string;
}

// Create Axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 90000, // Increased base timeout to 90 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors with enhanced auth clearing
api.interceptors.response.use(
  response => response,
  error => {
    // Only redirect to login if it's a 401 error AND not from the login endpoint
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      // Token expired or invalid for authenticated requests
      console.warn('401 Unauthorized - clearing auth data and redirecting to login');

      // Clear all possible auth storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('user');

      // Force redirect to login without any cached state
      window.location.replace('/login');
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

  submit: (checklistId: string, answers: Record<string, unknown>) =>
    api.post(`/v1/checklists/${checklistId}/submit`, { answers }),

  upload: (id: string, formData: FormData, department?: string) => {
    // Remove Content-Type header to let browser set it with boundary for multipart/form-data
    const params = department ? { department } : {};
    return api.post(`/v1/checklists/${id}/upload`, formData, {
      headers: {
        'Content-Type': undefined, // Let browser set the correct multipart/form-data with boundary
      },
      params,
      timeout: 180000, // 3 minutes for file upload and AI processing
    });
  },

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

  getByChecklist: (checklistId: string) => api.get(`/v1/submissions/checklist/${checklistId}`),

  create: (
    checklistId: string,
    answers: Array<{ item_id: number; answer: string; score?: number }>
  ) =>
    api.post('/v1/submissions/', {
      checklist_id: checklistId,
      answers,
    }),
};

// AI Processing API endpoints (updated to match backend)
export const aiAPI = {
  // Get AI results for uploaded files (from uploads router)
  getResults: (params?: Record<string, unknown>) => api.get('/v1/search/ai-results', { params }),

  getResult: (id: string) => api.get(`/v1/search/ai-results/${id}`),

  // Get results by file upload ID
  getResultByUpload: (uploadId: string) =>
    api.get(`/v1/search/ai-results`, { params: { file_upload_id: uploadId } }),
};

// Reviews API endpoints
export const reviewsAPI = {
  // Note: There's no getAll endpoint in the backend, use uploadsAPI.search() instead
  getAll: () => uploadsAPI.search({ limit: 100 }),

  getById: (id: string) => api.get(`/v1/reviews/${id}`),

  approve: (uploadId: string, comment?: string) => {
    // First set status to approved, then add comment if provided
    const promises = [
      api.post(`/v1/reviews/${uploadId}/status`, { status: 'approved' })
    ];
    if (comment) {
      promises.push(api.post(`/v1/reviews/${uploadId}/comment`, { text: comment }));
    }
    return Promise.all(promises);
  },

  reject: (uploadId: string, comment: string) => {
    // First set status to rejected, then add comment
    return Promise.all([
      api.post(`/v1/reviews/${uploadId}/status`, { status: 'rejected' }),
      api.post(`/v1/reviews/${uploadId}/comment`, { text: comment })
    ]);
  },

  getComments: (uploadId: string) => api.get(`/v1/reviews/${uploadId}/comments`),

  addComment: (uploadId: string, comment: string) =>
    api.post(`/v1/reviews/${uploadId}/comment`, { text: comment }),

  getStatus: (uploadId: string) => api.get(`/v1/reviews/${uploadId}/status`),
};

// Uploads API endpoints (updated to match backend)
export const uploadsAPI = {
  search: (params?: Record<string, unknown>) => api.get('/v1/search/file-uploads', { params }),

  addComment: (uploadId: string, comment: string, status?: string) =>
    api.post(`/v1/uploads/${uploadId}/comment`, { comment, status }),

  getById: (uploadId: string) => api.get(`/v1/uploads/${uploadId}`),

  getStatus: (uploadId: string) => api.get(`/v1/uploads/${uploadId}/status`),
};

// Comments/Reviews API endpoints
export const commentsAPI = {
  getByUpload: (uploadId: string) => api.get(`/v1/uploads/${uploadId}/comments`),

  addComment: (uploadId: string, comment: string, status?: string) =>
    api.post(`/v1/uploads/${uploadId}/comment`, { comment, status }),

  updateComment: (commentId: string, data: { content: string }) =>
    api.put(`/v1/comments/${commentId}`, data),

  deleteComment: (commentId: string) => api.delete(`/v1/comments/${commentId}`),
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
  exportChecklists: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/checklists?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportAIResults: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/ai-results?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportUsers: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/users?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportSubmissions: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/submissions?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportAnalytics: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/analytics?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportComplianceReport: (format: 'csv' | 'xlsx' | 'pdf' | 'docx' = 'pdf') => {
    const backendFormat = format === 'xlsx' ? 'excel' : format;
    return api.get(`/v1/export/compliance-report?format=${backendFormat}`, {
      responseType: 'blob',
    });
  },

  exportAuditLogs: (params: { format: 'csv' | 'xlsx' | 'pdf' | 'docx' } & Record<string, unknown>) =>
    api.get(`/v1/export/audit-logs?format=${params.format}`, {
      params: { ...params, format: undefined },
      responseType: 'blob',
    }),
};

// Admin API endpoints (Enhanced)
export const adminAPI = {
  // User management
  getAllUsers: (params?: Record<string, unknown>) => api.get('/v1/admin/users/', { params }),

  getUserById: (userId: string) => api.get(`/v1/admin/users/${userId}`),

  createUser: (userData: UserData) => api.post('/v1/admin/users/', userData),

  updateUser: (userId: string, userData: Partial<UserData>) =>
    api.put(`/v1/admin/users/${userId}`, userData),

  deleteUser: (userId: string) => api.delete(`/v1/admin/users/${userId}`),

  resetUserPassword: (userId: string) => api.post(`/v1/admin/users/${userId}/reset-password`),

  updateUserRole: (userId: string, role: string) =>
    api.put(`/v1/admin/users/${userId}/role`, { role }),

  // System configuration
  getSystemConfig: () => api.get('/v1/admin/system/config'),

  updateSystemConfig: (config: SystemConfig) => api.put('/v1/admin/system/config', config),

  resetSystemConfig: () => api.post('/v1/admin/system/config/reset'),

  // Checklist management
  getAllChecklists: (params?: Record<string, unknown>) =>
    api.get('/v1/admin/checklists/', { params }),

  getChecklistById: (checklistId: string) => api.get(`/v1/admin/checklists/${checklistId}`),

  createChecklist: (checklistData: ChecklistData) =>
    api.post('/v1/admin/checklists/', checklistData),

  updateChecklist: (checklistId: string, checklistData: Partial<ChecklistData>) =>
    api.put(`/v1/admin/checklists/${checklistId}`, checklistData),

  deleteChecklist: (checklistId: string) => api.delete(`/v1/admin/checklists/${checklistId}`),

  getChecklistItems: (checklistId: string) => api.get(`/v1/admin/checklists/${checklistId}/items`),

  createChecklistItem: (checklistId: string, itemData: unknown) =>
    api.post(`/v1/admin/checklists/${checklistId}/items`, itemData),

  updateChecklistItem: (itemId: string, itemData: unknown) =>
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

  getScoreDistribution: (params?: Record<string, unknown>) =>
    api.get('/v1/analytics/score-distribution', { params }),

  getLeaderboard: (params?: Record<string, unknown>) =>
    api.get('/v1/analytics/leaderboard', { params }),

  getChecklistStats: () => api.get('/v1/analytics/checklist-stats'),

  getAuditorMetrics: () => api.get('/v1/analytics/auditor-metrics'),
};

// Enhanced Search API
export const searchAPI = {
  fileUploads: (params?: Record<string, unknown>) => api.get('/v1/search/file-uploads', { params }),

  submissions: (params?: Record<string, unknown>) => api.get('/v1/search/submissions', { params }),

  aiResults: (params?: Record<string, unknown>) => api.get('/v1/search/ai-results', { params }),

  users: (params?: Record<string, unknown>) => api.get('/v1/search/users', { params }),

  notifications: (params?: Record<string, unknown>) =>
    api.get('/v1/search/notifications', { params }),

  submissionAnswers: (params?: Record<string, unknown>) =>
    api.get('/v1/search/submission-answers', { params }),

  checklists: (params?: Record<string, unknown>) => api.get('/v1/search/checklists', { params }),

  checklistItems: (params?: Record<string, unknown>) =>
    api.get('/v1/search/checklist-items', { params }),

  comments: (params?: Record<string, unknown>) => api.get('/v1/search/comments', { params }),

  auditLogs: (params?: Record<string, unknown>) => api.get('/v1/search/audit-logs', { params }),

  systemConfig: (params?: Record<string, unknown>) =>
    api.get('/v1/search/system-config', { params }),

  globalSearch: (params?: Record<string, unknown>) => api.get('/v1/search/global', { params }),
};

// Audit API endpoints
export const auditAPI = {
  getAuditLogs: (params?: Record<string, unknown>) => api.get('/v1/audit/logs', { params }),

  getSystemHealth: () => api.get('/health'),

  getSecurityEvents: () => api.get('/v1/audit/security-events'),
};

// Real-time Analytics API endpoints
export const realtimeAnalyticsAPI = {
  // Dashboard data
  getDashboard: () => api.get('/v1/realtime-analytics/dashboard'),

  // Live metrics
  getLiveMetrics: () => api.get('/v1/realtime-analytics/metrics/live'),

  // Recent activity
  getActivity: (params?: Record<string, unknown>) =>
    api.get('/v1/realtime-analytics/activity', { params }),

  // Compliance trends
  getComplianceTrends: (params?: Record<string, unknown>) =>
    api.get('/v1/realtime-analytics/compliance/trends', { params }),

  // Real-time events
  getEvents: (params?: Record<string, unknown>) =>
    api.get('/v1/realtime-analytics/events', { params }),

  // Performance metrics
  getPerformance: () => api.get('/v1/realtime-analytics/performance'),

  // Track events
  trackEvent: (eventData: Record<string, unknown>) =>
    api.post('/v1/realtime-analytics/track', eventData),

  // Analytics snapshots
  getSnapshots: (params?: Record<string, unknown>) =>
    api.get('/v1/realtime-analytics/snapshots', { params }),

  createSnapshot: () => api.post('/v1/realtime-analytics/snapshots/create'),

  // WebSocket connection URL
  getWebSocketUrl: (channel: string) => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsURL = baseURL.replace(/^http/, 'ws');
    return `${wsURL}/v1/realtime-analytics/ws/${channel}`;
  },
};

// Departments API endpoints
export const departmentsAPI = {
  getAll: () => api.get('/v1/departments/public'),

  getAllAuthenticated: () => api.get('/v1/departments/'),

  getInfo: (departmentName: string) => 
    api.get(`/v1/departments/${encodeURIComponent(departmentName)}/info`),

  analyze: (data: {
    text: string;
    department_name: string;
    checklist_items?: unknown[];
    file_upload_id?: number;
    checklist_id?: number;
  }) => api.post('/v1/departments/analyze', data),

  getHistory: (departmentName: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/v1/departments/analyze/history/${encodeURIComponent(departmentName)}`, { params }),
};

export default api;
