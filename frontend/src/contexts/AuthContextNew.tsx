/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';
import { clearAllAuthData, validateAuthState } from '../utils/authUtils';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // More robust authentication check with race condition protection
  const isAuthenticated = React.useMemo(() => {
    const hasToken = !!localStorage.getItem('authToken');
    const hasUser = !!user;
    const result = hasToken && hasUser && authChecked;
    console.log('🔐 isAuthenticated calculation:', { hasToken, hasUser, authChecked, result });
    return result;
  }, [user, authChecked]);

  // Enhanced security: Clear auth state on page visibility changes or storage events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, revalidate auth state
        const hasValidAuth = validateAuthState();
        if (!hasValidAuth && user) {
          console.log('🚨 Auth state invalidated on page visibility change');
          setUser(null);
          setAuthChecked(false);
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      // Another tab cleared auth data
      if (e.key === 'authToken' && !e.newValue && user) {
        console.log('🚨 Auth token removed in another tab, logging out');
        setUser(null);
        setAuthChecked(false);
      }
    };

    const handleBeforeUnload = () => {
      // Optional: Clear sensitive data before page unload
      if (user) {
        console.log('🧹 Page unloading, clearing sensitive auth state');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Debug authentication state
  useEffect(() => {
    console.log('Authentication state changed:', {
      user: user ? `${user.email} (${user.role})` : null,
      hasToken: !!localStorage.getItem('authToken'),
      isAuthenticated,
      isLoading,
      authChecked,
    });
  }, [user, isAuthenticated, isLoading, authChecked]);

  // Check for existing token on mount with enhanced security
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Starting authentication check...');

      // First validate if the current auth state is consistent
      if (!validateAuthState()) {
        setUser(null);
        setAuthChecked(true);
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token || token.length < 20) {
        console.log('❌ No valid token found, clearing auth state');
        clearAllAuthData();
        setUser(null);
        setAuthChecked(true);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔑 Valid token found, verifying with backend...');

        // Add a small timeout to ensure backend is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const userResponse = await authAPI.getCurrentUser();
        const userData = userResponse.data;

        if (userData && userData.id && userData.email && userData.username) {
          setUser(userData);
          setAuthChecked(true);
          console.log('✅ User authenticated successfully:', userData.email);
        } else {
          console.log('❌ Invalid user data received, clearing auth');
          clearAllAuthData();
          setUser(null);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error('❌ Token verification failed:', error);
        // Use utility to clear ALL auth data
        clearAllAuthData();
        setUser(null);
        setAuthChecked(true);
      }

      setIsLoading(false);
    };

    // Add a slight delay to ensure DOM is fully loaded
    const timeoutId = setTimeout(checkAuth, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setAuthChecked(false); // Reset auth check state

      console.log('Starting login process for:', email);

      // Clear any existing auth data first
      clearAllAuthData();

      const response = await authAPI.login(email, password);
      const { access_token } = response.data;

      if (!access_token || access_token.length < 10) {
        throw new Error('Invalid token received from server');
      }

      // Store token
      localStorage.setItem('authToken', access_token);

      // Get user data with retry logic
      let userData;
      let retries = 3;
      while (retries > 0) {
        try {
          const userResponse = await authAPI.getCurrentUser();
          userData = userResponse.data;

          if (userData && userData.id && userData.email && userData.username) {
            break; // Success
          }
          throw new Error('Invalid user data received');
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait before retry
        }
      }

      // Store user info
      localStorage.setItem('userRole', userData.role);
      setUser(userData);
      setAuthChecked(true);

      console.log('Login successful for:', userData.email);
    } catch (error: unknown) {
      console.error('Login error:', error);

      // Clear any partial auth state
      clearAllAuthData();
      setUser(null);
      setAuthChecked(true);

      let errorMessage = 'Login failed. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; detail?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      authAPI.logout();
    } catch {
      // Even if logout fails on server, clear local state
      console.warn('Logout request failed, but clearing local state');
    } finally {
      console.log('🚪 Logging out user');
      clearAllAuthData();
      setUser(null);
      setError(null);
      setAuthChecked(false);

      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
