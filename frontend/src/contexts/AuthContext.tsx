/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
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

  // More robust authentication check
  const isAuthenticated = React.useMemo(() => {
    const hasToken = !!localStorage.getItem('authToken');
    const hasUser = !!user;
    const result = hasToken && hasUser;
    console.log('isAuthenticated calculation:', { hasToken, hasUser, result });
    return result;
  }, [user]);

  // Debug authentication state
  useEffect(() => {
    console.log('Authentication state changed:', {
      user: user ? `${user.email} (${user.role})` : null,
      hasToken: !!localStorage.getItem('authToken'),
      isAuthenticated,
      isLoading,
    });
  }, [user, isAuthenticated, isLoading]);

  // Check for existing auth on component mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking authentication state...');
      const token = localStorage.getItem('authToken');
      console.log('Token from localStorage:', token ? 'exists' : 'not found');

      // If no token exists, user needs to login
      if (!token) {
        setUser(null);
        setIsLoading(false);
        console.log('No token found, setting as unauthenticated');
        return;
      }

      try {
        console.log('Verifying token with backend...');
        // Verify the token is valid by calling the backend
        const userResponse = await authAPI.getCurrentUser();
        const userData = userResponse.data;
        console.log('Backend returned user data:', userData);

        // If we get valid user data, set the user as authenticated
        if (userData && userData.id && userData.email) {
          setUser(userData);
          console.log('User authenticated successfully');
        } else {
          // Invalid user data, clear auth
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          setUser(null);
          console.log('Invalid user data, clearing auth');
        }
      } catch (error) {
        // Token is invalid or backend error, clear auth
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        setUser(null);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting login process for:', email);
      const response = await authAPI.login(email, password);
      console.log('Login response received:', response.data);
      const { access_token } = response.data;

      // Store token
      localStorage.setItem('authToken', access_token);
      console.log('Token stored in localStorage');

      // Get user data with the token
      console.log('Fetching user data...');
      const userResponse = await authAPI.getCurrentUser();
      console.log('User response received:', userResponse.data);
      const userData = userResponse.data;

      // Store user info and set user state
      localStorage.setItem('userRole', userData.role);
      setUser(userData);
      console.log('User set in context:', userData);

      // Wait a bit to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: unknown) {
      console.error('Login error details:', error);

      // Extract error message from the backend response
      let errorMessage = 'Login failed. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; detail?: string } } };
        console.error('Error response:', axiosError.response);

        // Handle the backend error format: { error: true, message: "...", status_code: 401 }
        if (axiosError.response?.data) {
          errorMessage =
            axiosError.response.data.message || axiosError.response.data.detail || errorMessage;
        }
      } else if (error instanceof Error) {
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
