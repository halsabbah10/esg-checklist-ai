import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire api module
const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
};

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

// Import after mocking
const { authAPI } = await import('../services/api');

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication API', () => {
    it('should call login endpoint with correct data', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authAPI.login('test@example.com', 'password123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/users/login', {
        username: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should call logout endpoint', async () => {
      const mockResponse = {
        data: { message: 'Successfully logged out' }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authAPI.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/users/logout');
      expect(result).toEqual(mockResponse);
    });

    it('should call getCurrentUser endpoint', async () => {
      const mockResponse = {
        data: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'auditor'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await authAPI.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/me');
      expect(result).toEqual(mockResponse);
    });

    it('should handle login error responses', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            detail: 'Incorrect email or password'
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(authAPI.login('wrong@example.com', 'wrongpass')).rejects.toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(authAPI.login('test@example.com', 'password')).rejects.toThrow('Network Error');
    });
  });

  describe('API Instance Configuration', () => {
    it('should have axios instance configured', () => {
      // Just verify the API functions exist
      expect(authAPI.login).toBeDefined();
      expect(authAPI.logout).toBeDefined();
      expect(authAPI.getCurrentUser).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { detail: 'Token expired' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(authAPI.getCurrentUser()).rejects.toEqual(authError);
    });

    it('should handle 403 forbidden errors', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { detail: 'Access denied' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(forbiddenError);

      await expect(authAPI.getCurrentUser()).rejects.toEqual(forbiddenError);
    });

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        }
      };

      mockAxiosInstance.post.mockRejectedValue(serverError);

      await expect(authAPI.login('test@example.com', 'password')).rejects.toEqual(serverError);
    });
  });

  describe('Request/Response Transformations', () => {
    it('should handle empty response bodies gracefully', async () => {
      const emptyResponse = { data: null };
      mockAxiosInstance.post.mockResolvedValue(emptyResponse);

      const result = await authAPI.logout();
      expect(result.data).toBeNull();
    });

    it('should preserve response headers', async () => {
      const responseWithHeaders = {
        data: { message: 'Success' },
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '99'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(responseWithHeaders);

      const result = await authAPI.logout();
      expect(result.headers).toEqual(responseWithHeaders.headers);
    });
  });
});