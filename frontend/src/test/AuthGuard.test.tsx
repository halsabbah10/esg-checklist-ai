import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from '../components/AuthGuard';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../services/api';
import * as authUtils from '../utils/authUtils';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';

// Mock the API module
vi.mock('../services/api', () => ({
  authAPI: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock auth utils
vi.mock('../utils/authUtils', () => ({
  clearAllAuthData: vi.fn(),
  validateAuthState: vi.fn(),
}));

const renderWithProviders = (
  component: React.ReactElement,
  { initialEntries = ['/'] } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const ProtectedComponent = () => <div data-testid="protected-content">Protected Content</div>;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock validateAuthState to return true by default
    vi.mocked(authUtils.validateAuthState).mockReturnValue(true);
  });

  it('should show loading spinner while validating authentication', async () => {
    // Mock getCurrentUser to simulate loading
    vi.mocked(api.authAPI.getCurrentUser).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    expect(screen.getByText('Securing your session...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children when validation completes', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor',
    };

    const mockConfig: InternalAxiosRequestConfig = {
      headers: new AxiosHeaders(),
      method: 'get',
      url: '',
    };

    const mockAxiosResponse: AxiosResponse = {
      data: mockUser,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: mockConfig,
    };

    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue(mockAxiosResponse);
    vi.mocked(authUtils.validateAuthState).mockReturnValue(true);

    renderWithProviders(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.queryByText('Securing your session...')).not.toBeInTheDocument();
  });

  it('should clear auth data when validation fails', async () => {
    vi.mocked(api.authAPI.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(authUtils.validateAuthState).mockReturnValue(false);

    renderWithProviders(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(authUtils.clearAllAuthData).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should call validateAuthState on mount', async () => {
    vi.mocked(authUtils.validateAuthState).mockReturnValue(true);
    
    renderWithProviders(
      <AuthGuard>
        <ProtectedComponent />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(authUtils.validateAuthState).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});