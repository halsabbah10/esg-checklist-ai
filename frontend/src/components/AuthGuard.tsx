import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clearAllAuthData, validateAuthState } from '../utils/authUtils';
import { Box, CircularProgress, Typography } from '@mui/material';

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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          Securing your session...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
