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

  // Strict authentication check - both user and valid token must exist
  const isAuthenticated = !!user && !!localStorage.getItem('authToken');

  // Check for existing auth on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // For initial setup: Force clear auth state to ensure clean start
      // This ensures user must always log in fresh
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      setUser(null);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authAPI.login(email, password);
      const { access_token } = response.data;
      
      // Store token
      localStorage.setItem('authToken', access_token);
      
      // Get user data with the token
      const userResponse = await authAPI.getCurrentUser();
      const userData = userResponse.data;
      
      // Store user info
      localStorage.setItem('userRole', userData.role);
      setUser(userData);
    } catch (error: any) {
      console.error('Login error details:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      authAPI.logout();
    } catch (error) {
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
