import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Typography, Box, Alert, IconButton, Tooltip } from '@mui/material';
import { LoadingState, PageTransition, TextField, Button } from '../components/ui';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface LoginForm {
  email: string;
  password: string;
}

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  // Redirect if already authenticated (on page load)
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      console.log('Already authenticated, redirecting...');
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, isSubmitting]);

  const onSubmit = async (data: LoginForm) => {
    try {
      console.log('Attempting login with:', {
        email: data.email,
        password: data.password.length + ' chars',
      });
      console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

      setIsSubmitting(true);

      // Attempt login
      await login(data.email, data.password);
      console.log('Login successful - waiting for auth state to settle');

      // Start transition
      setIsTransitioning(true);

      // Wait for auth state to settle and transition to start
      await new Promise(resolve => setTimeout(resolve, 600));

      console.log('Auth state settled - redirecting to dashboard');
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      // Error is handled by AuthContext and will be displayed
      // Don't rethrow to prevent potential form reset or page reload
      setIsTransitioning(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsSubmitting(true);
      // Mock successful login for demo purposes
      // Store mock data
      localStorage.setItem('authToken', 'demo-token');
      localStorage.setItem('userRole', 'admin');

      // Start transition
      setIsTransitioning(true);
      
      // Wait for transition to start
      await new Promise(resolve => setTimeout(resolve, 600));

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Demo login failed:', error);
      setIsTransitioning(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isTransitioning) {
    return (
      <PageTransition in={!isTransitioning} variant="fade" duration={500}>
        <LoadingState
          variant="full-page"
          message={isTransitioning ? "Redirecting to dashboard..." : "Loading application..."}
          size="large"
          critical={true}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition in={!isTransitioning} variant="fade" duration={300}>
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
          // Landscape mobile optimization using media query
          '@media (max-height: 600px) and (orientation: landscape)': {
            flexDirection: 'row',
          },
        }}
      >
      {/* Dark Mode Toggle - Responsive positioning */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          zIndex: 1000,
        }}
      >
        <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`} arrow>
          <IconButton
            onClick={toggleTheme}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            sx={{
              color: 'text.primary',
              backgroundColor: 'background.paper',
              boxShadow: 2,
              position: 'relative',
              minWidth: { xs: 48, sm: 44 },
              minHeight: { xs: 48, sm: 44 },
              padding: { xs: '12px', sm: '8px' },
              '&:hover': {
                backgroundColor: 'background.paper',
                transform: 'scale(1.1)',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LightMode
                sx={{
                  position: 'absolute',
                  opacity: isDarkMode ? 1 : 0,
                  transform: isDarkMode ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0.8)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              <DarkMode
                sx={{
                  position: 'absolute',
                  opacity: isDarkMode ? 0 : 1,
                  transform: isDarkMode ? 'rotate(-180deg) scale(0.8)' : 'rotate(0deg) scale(1)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </Box>
          </IconButton>
        </Tooltip>
      </Box>
      {/* Login Section - Responsive Layout */}
      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { xs: 2, sm: 3, md: 4 },
          backgroundColor: 'background.default',
          minHeight: { xs: '100vh', md: 'auto' },
          overflowY: { xs: 'auto', md: 'hidden' },
        }}
      >
        {/* Logo - Responsive sizing */}
        <Box
          component="img"
          src="https://www.eand.com/content/dam/eand/assets/img/etand-icons/logo-new.svg"
          alt="e& Logo"
          sx={{
            height: { xs: 48, sm: 56, md: 60 },
            marginBottom: { xs: 3, sm: 4 },
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            maxWidth: '200px',
            objectFit: 'contain',
          }}
        />

        {/* Login Card - Mobile optimized */}
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 400, md: 420 },
            padding: { xs: 3, sm: 4 },
            borderRadius: { xs: 2, sm: 3 },
            boxShadow: { xs: 1, sm: 3 },
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            margin: { xs: 0, sm: 'auto' },
          }}
        >
          {/* Title - Responsive typography */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              textAlign: 'center',
              marginBottom: 1,
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              lineHeight: 1.2,
            }}
          >
            ESG Checklist AI
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              marginBottom: { xs: 3, sm: 4 },
              fontSize: { xs: '0.95rem', sm: '1rem' },
            }}
          >
            Sign in to your account
          </Typography>

          {/* Demo Credentials - Mobile optimized */}
          <Alert
            severity="info"
            sx={{
              marginBottom: { xs: 2, sm: 3 },
              '& .MuiAlert-message': {
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                lineHeight: 1.4,
                color: theme => theme.palette.mode === 'dark' ? '#E5E7EB' : 'inherit',
              },
            }}
          >
            <strong>Demo Mode Available:</strong>
            <br />
            Use the demo button below or:
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
              size="lg"
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                marginBottom: { xs: 1.5, sm: 2 },
              }}
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
              size="lg"
              label="Password"
              type="password"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                marginBottom: { xs: 2.5, sm: 3 },
              }}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              variant="contained"
              loading={isSubmitting}
            >
              Sign In
            </Button>

            <Button
              fullWidth
              size="lg"
              variant="outlined"
              onClick={handleDemoLogin}
              loading={isSubmitting}
              sx={{
                marginTop: { xs: 1.5, sm: 2 },
              }}
            >
              Continue with Demo Mode
            </Button>
          </Box>
        </Box>

        {/* Copyright - Mobile spacing */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            textAlign: 'center',
            marginTop: { xs: 2, sm: 3 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            px: { xs: 2, sm: 0 },
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
    </PageTransition>
  );
};
