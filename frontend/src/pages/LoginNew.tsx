import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { TextField, Button, Typography, Box, Alert, CircularProgress, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContextNew';
import { forceAuthReset } from '../utils/authUtils';

interface LoginForm {
  email: string;
  password: string;
}

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading, error, clearError, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, isSubmitting]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsSubmitting(true);
      clearError();

      await login(data.email, data.password);

      // Navigation will be handled by the useEffect above
    } catch (error) {
      console.error('Login failed:', error);
      // Error is already handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Login Section - Left Half */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          backgroundColor: '#f8f9fa',
        }}
      >
        {/* Logo */}
        <Box
          component="img"
          src="https://www.eand.com/content/dam/eand/assets/img/etand-icons/logo-new.svg"
          alt="e& Logo"
          sx={{
            height: 60,
            marginBottom: 4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          }}
        />

        {/* Login Card */}
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 420,
            padding: 4,
            borderRadius: 3,
          }}
        >
          {/* Title */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              textAlign: 'center',
              marginBottom: 1,
            }}
          >
            ESG Checklist AI
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Sign in to your account
          </Typography>

          {/* Demo Credentials */}
          <Alert
            severity="info"
            sx={{
              marginBottom: 3,
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
              },
            }}
          >
            <strong>Demo Credentials:</strong>
            <br />
            Admin: admin@test.com / admin123
            <br />
            Auditor: test@user.com / test123
            <br />
            Reviewer: reviewer@test.com / reviewer123
          </Alert>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ marginBottom: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ marginBottom: 2 }}
            />

            <TextField
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              fullWidth
              label="Password"
              type="password"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ marginBottom: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              sx={{
                height: 48,
                fontSize: '1rem',
                fontWeight: 500,
                textTransform: 'none',
              }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            {/* Debug Section - Only in development */}
            {import.meta.env.DEV && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Debug: Auth State
                </Typography>
                <Typography variant="caption" display="block">
                  Token: {localStorage.getItem('authToken') ? 'Present' : 'None'}
                </Typography>
                <Typography variant="caption" display="block">
                  User: {user?.email || 'None'}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={forceAuthReset}
                  sx={{ mt: 1, fontSize: '0.75rem' }}
                >
                  🧹 Clear Cache & Reload
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Copyright */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            marginTop: 3,
            fontSize: '0.875rem',
          }}
        >
          © 2025 e&. All Rights Reserved.
        </Typography>
      </Box>

      {/* Image Section - Right Half */}
      <Box
        sx={{
          width: '50%',
          display: { xs: 'none', md: 'block' },
          backgroundImage:
            'url(https://www.eand.com/content/dam/eand/assets/images/main1440_850.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        {/* Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 4,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              fontWeight: 600,
              marginBottom: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            e& Enterprise Solutions
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'white',
              opacity: 0.9,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            Empowering sustainable business practices through AI-driven ESG compliance
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
