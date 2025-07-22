import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clearAllAuthData, validateAuthState } from '../utils/authUtils';
import { LoadingState } from './ui';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoading } = useAuth();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateAndCleanAuth = () => {
      console.log('🛡️ AuthGuard: Validating authentication state...');

      // Run validation
      const isValid = validateAuthState();

      if (!isValid) {
        console.log('🧹 AuthGuard: Invalid auth state detected, forcing cleanup');
        clearAllAuthData();
      }

      setIsValidating(false);
    };

    // Run validation after a short delay to ensure all components are mounted
    const timeoutId = setTimeout(validateAndCleanAuth, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  if (isValidating || isLoading) {
    return (
      <LoadingState
        variant="full-page"
        message="Securing your session..."
        size="large"
        critical={true}
      />
    );
  }

  return <>{children}</>;
};
