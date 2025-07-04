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

// AI Processing API endpoints
export const aiAPI = {
  analyze: (file: File, checklistId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (checklistId) {
      formData.append('checklist_id', checklistId);
    }
    return api.post('/v1/ai/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getResults: (params?: Record<string, any>) =>
    api.get('/v1/ai/results', { params }),
  
  getResult: (id: string) => api.get(`/v1/ai/results/${id}`),
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

// Uploads API endpoints
export const uploadsAPI = {
  search: (params?: Record<string, any>) =>
    api.get('/v1/uploads/search', { params }),
  
  addComment: (uploadId: string, comment: string, status?: string) =>
    api.post(`/v1/uploads/${uploadId}/comment`, { comment, status }),
  
  upload: (file: File, checklistId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (checklistId) {
      formData.append('checklist_id', checklistId);
    }
    return api.post('/v1/uploads/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Analytics API endpoints
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
  
  getChecklistStats: () => api.get('/v1/admin/checklists/stats/summary'),
};

export default api;
