import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

// Test component to access AuthContext
const TestComponent = () => {
  const { user, isLoading, error, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="user-status">
        {isLoading ? 'Loading' : user ? `User: ${user.username}` : 'No user'}
      </div>
      {error && <div data-testid="error">{error}</div>}
      <button onClick={() => login('test@example.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    vi.mocked(localStorage.clear);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    // Mock getCurrentUser to simulate checking auth
    vi.mocked(api.authAPI.getCurrentUser).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('user-status')).toHaveTextContent('Loading');
  });

  it('should handle successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    // Mock initial auth check to return no user
    vi.mocked(api.authAPI.getCurrentUser)
      .mockRejectedValueOnce(new Error('Not authenticated'))
      .mockResolvedValueOnce({ data: mockUser });

    // Mock login success
    vi.mocked(api.authAPI.login).mockResolvedValue({
      data: { access_token: 'mock-token', token_type: 'bearer' }
    });

    renderWithProviders(<TestComponent />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No user');
    });

    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: testuser');
    });

    expect(api.authAPI.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(api.authAPI.getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it('should handle login error', async () => {
    // Mock initial auth check to return no user
    vi.mocked(api.authAPI.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    // Mock login failure
    vi.mocked(api.authAPI.login).mockRejectedValue({
      response: {
        data: { message: 'Invalid credentials' }
      }
    });

    renderWithProviders(<TestComponent />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No user');
    });

    // Click login button
    fireEvent.click(screen.getByTestId('login-btn'));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    // Mock initial auth check to return user
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });
    
    // Mock logout success
    vi.mocked(api.authAPI.logout).mockResolvedValue({ data: { message: 'Logged out' } });

    renderWithProviders(<TestComponent />);
    
    // Wait for user to load
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: testuser');
    });

    // Click logout button
    fireEvent.click(screen.getByTestId('logout-btn'));

    // Wait for logout to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('No user');
    });

    expect(api.authAPI.logout).toHaveBeenCalled();
  });

  it('should restore user from existing authentication', async () => {
    const mockUser = {
      id: 1,
      username: 'existing-user',
      email: 'existing@example.com',
      role: 'admin'
    };

    // Mock getCurrentUser to return existing user
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });

    renderWithProviders(<TestComponent />);
    
    // Wait for user to load from existing auth
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: existing-user');
    });

    expect(api.authAPI.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle updateUser functionality', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    // Mock getCurrentUser to return user
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });

    const TestUpdateComponent = () => {
      const { user, updateUser } = useAuth();
      
      const handleUpdate = () => {
        updateUser({ username: 'updated-user' });
      };
      
      return (
        <div>
          <div data-testid="user-status">
            {user ? `User: ${user.username}` : 'No user'}
          </div>
          <button onClick={handleUpdate} data-testid="update-btn">
            Update User
          </button>
        </div>
      );
    };

    renderWithProviders(<TestUpdateComponent />);
    
    // Wait for initial user load
    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('User: testuser');
    });

    // Click update button
    fireEvent.click(screen.getByTestId('update-btn'));

    // Verify user was updated
    expect(screen.getByTestId('user-status')).toHaveTextContent('User: updated-user');
  });
});