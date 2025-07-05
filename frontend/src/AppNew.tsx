import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';

// Import custom theme
import { theme } from './theme';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContextNew';
import { NotificationProvider } from './contexts/NotificationContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AuthGuard } from './components/AuthGuard';

// Import components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for code splitting and performance
const Login = lazy(() => import('./pages/LoginNew').then(module => ({ default: module.Login })));
const Dashboard = lazy(() =>
  import('./pages/DashboardNew').then(module => ({ default: module.Dashboard }))
);
const Checklists = lazy(() =>
  import('./pages/Checklists').then(module => ({ default: module.Checklists }))
);
const ChecklistDetail = lazy(() =>
  import('./pages/ChecklistDetail').then(module => ({ default: module.ChecklistDetail }))
);
const ChecklistSubmit = lazy(() =>
  import('./pages/ChecklistSubmit').then(module => ({ default: module.ChecklistSubmit }))
);
const FileUploader = lazy(() =>
  import('./components/FileUploaderNew').then(module => ({ default: module.FileUploader }))
);
const UploadPage = lazy(() =>
  import('./pages/UploadPage').then(module => ({ default: module.UploadPage }))
);
const Reviews = lazy(() => import('./pages/Reviews').then(module => ({ default: module.Reviews })));
const Analytics = lazy(() =>
  import('./pages/AnalyticsSimple').then(module => ({ default: module.AnalyticsSimple }))
);
const RealTimeDashboard = lazy(() =>
  import('./components/RealTimeDashboard').then(module => ({ default: module.RealTimeDashboard }))
);
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Settings = lazy(() =>
  import('./pages/Settings').then(module => ({ default: module.default }))
);
const UserManagement = lazy(() =>
  import('./pages/UserManagement').then(module => ({ default: module.UserManagement }))
);
const SystemAdministration = lazy(() =>
  import('./pages/SystemAdministration').then(module => ({ default: module.SystemAdministration }))
);
const ChecklistManagement = lazy(() =>
  import('./pages/ChecklistManagement').then(module => ({ default: module.ChecklistManagement }))
);
const AdvancedAnalytics = lazy(() =>
  import('./pages/AdvancedAnalytics').then(module => ({ default: module.AdvancedAnalytics }))
);
const SystemConfiguration = lazy(() =>
  import('./pages/SystemConfiguration').then(module => ({ default: module.SystemConfiguration }))
);
const AdvancedFileUpload = lazy(() =>
  import('./pages/AdvancedFileUpload').then(module => ({ default: module.AdvancedFileUpload }))
);

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Loading component with enhanced styling
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
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
      {message}
    </Typography>
  </Box>
);

// Error Fallback Component (available if needed)
// const ErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
//   <Box
//     display="flex"
//     justifyContent="center"
//     alignItems="center"
//     minHeight="100vh"
//     flexDirection="column"
//     gap={2}
//     sx={{ p: 3, textAlign: 'center' }}
//   >
//     <Typography variant="h4" color="error.main" gutterBottom>
//       Something went wrong
//     </Typography>
//     <Typography variant="body1" color="text.secondary" paragraph>
//       {error?.message || 'An unexpected error occurred'}
//     </Typography>
//     <Typography variant="body2" color="text.secondary">
//       Please refresh the page or contact support if the problem persists.
//     </Typography>
//   </Box>
// );

// Layout wrapper for authenticated pages
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Layout>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        py: 3,
      }}
    >
      <Suspense fallback={<LoadingSpinner message="Loading page..." />}>{children}</Suspense>
    </Box>
  </Layout>
);

// Home component that handles initial routing with strict authentication
const Home: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🏠 Home component - Auth state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email,
    hasToken: !!localStorage.getItem('authToken'),
    tokenLength: localStorage.getItem('authToken')?.length || 0,
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner message="Verifying authentication..." />;
  }

  // Strict authentication check with multiple conditions
  const hasValidToken = !!localStorage.getItem('authToken');
  const hasValidUser = !!(user && user.id && user.email);
  const isFullyAuthenticated = isAuthenticated && hasValidToken && hasValidUser;

  console.log('🔍 Detailed auth check:', { hasValidToken, hasValidUser, isFullyAuthenticated });

  // Force redirect to login if ANY condition fails
  if (!isFullyAuthenticated) {
    console.log('🚪 Redirecting to login - authentication failed one or more checks');
    return <Navigate to="/login" replace />;
  }

  // Only redirect to dashboard if ALL authentication checks pass
  console.log('✅ All authentication checks passed, redirecting to dashboard');
  return <Navigate to="/dashboard" replace />;
};

// Main App Content with all routes
const AppContent: React.FC = () => {
  // Reset problematic global styles
  const globalStylesReset = `
    body {
      margin: 0 !important;
      padding: 0 !important;
      min-height: 100vh !important;
      background-color: #f5f5f5 !important;
    }
    #root {
      margin: 0 !important;
      padding: 0 !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    * {
      box-sizing: border-box;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStylesReset }} />
      <AuthGuard>
        <ErrorBoundary>
          <Router>
            <Routes>
              {/* Root route - shows login if not authenticated, dashboard if authenticated */}
              <Route path="/" element={<Home />} />

              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <Suspense fallback={<LoadingSpinner message="Loading login..." />}>
                    <Login />
                  </Suspense>
                }
              />

              {/* Protected routes with layout */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Checklist routes */}
              <Route
                path="/checklists"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Checklists />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/checklists/:id"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <ChecklistDetail />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/checklists/:id/submit"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <ChecklistSubmit />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/checklists/:checklistId/upload"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <FileUploader />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Review and Analytics routes */}
              <Route
                path="/reviews"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Reviews />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Analytics />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/analytics/realtime"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <RealTimeDashboard />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/analytics/advanced"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <AdvancedAnalytics />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Reports />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin/users"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <UserManagement />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/checklists"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <ChecklistManagement />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <SystemAdministration />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/config"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <SystemConfiguration />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Upload routes */}
              <Route
                path="/upload"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <UploadPage />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/uploads/advanced"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <AdvancedFileUpload />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </PrivateRoute>
                }
              />

              {/* Catch-all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ErrorBoundary>
      </AuthGuard>
    </>
  );
};

// Main App component with all providers
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
