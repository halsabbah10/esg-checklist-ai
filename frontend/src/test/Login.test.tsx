import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Login from '../pages/Login';
import { AuthProvider } from '../contexts/AuthContext';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            {component}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Mock getCurrentUser to return no user initially
    vi.mocked(api.authAPI.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
  });

  it('should render login form elements', async () => {
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    // Mock successful login
    vi.mocked(api.authAPI.login).mockResolvedValue({
      data: { access_token: 'mock-token', token_type: 'bearer' }
    });

    // Mock getCurrentUser to return user after login
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });

    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit form
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    // Wait for login to complete and navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    expect(api.authAPI.login).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();

    // Mock login failure
    vi.mocked(api.authAPI.login).mockRejectedValue({
      response: {
        data: { message: 'Invalid credentials' }
      }
    });

    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');

    // Submit form
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();

    // Mock login to take time
    vi.mocked(api.authAPI.login).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit form
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    });
  });

  it('should handle password visibility toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const toggleButton = screen.getByLabelText(/toggle password visibility/i);

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click toggle to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Click toggle to hide password again
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock network error
    vi.mocked(api.authAPI.login).mockRejectedValue(new Error('Network Error'));

    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill and submit form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should redirect to dashboard if user is already authenticated', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    // Mock user already authenticated
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });

    renderWithProviders(<Login />);

    // Should redirect without showing login form
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should handle form submission with Enter key', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'auditor'
    };

    vi.mocked(api.authAPI.login).mockResolvedValue({
      data: { access_token: 'mock-token', token_type: 'bearer' }
    });
    vi.mocked(api.authAPI.getCurrentUser).mockResolvedValue({ data: mockUser });

    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Press Enter on password field
    await user.type(passwordInput, '{enter}');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display ESG Checklist branding', async () => {
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByText(/esg checklist/i)).toBeInTheDocument();
    });
  });
});