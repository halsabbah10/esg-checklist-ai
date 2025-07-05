import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Box, Toolbar, useMediaQuery, useTheme, CircularProgress, Typography } from '@mui/material';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then(module => ({ default: module.Dashboard }))
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
const ChecklistUpload = lazy(() =>
  import('./pages/ChecklistUpload').then(module => ({ default: module.ChecklistUpload }))
);
const Reviews = lazy(() => import('./pages/Reviews').then(module => ({ default: module.Reviews })));
const Analytics = lazy(() =>
  import('./pages/Analytics').then(module => ({ default: module.Analytics }))
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

// Loading component
const LoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="60vh"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={48} />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Layout component for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={handleSidebarToggle} />
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={!isMobile && sidebarCollapsed}
        onToggleCollapse={handleSidebarCollapse}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          width: '100%',
          ml: {
            xs: 0,
            md: isMobile ? 0 : sidebarCollapsed ? '64px' : '240px',
          },
          transition: 'margin 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            maxWidth: '100%',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
        </Box>
      </Box>
    </Box>
  );
}

// Create a Home component that shows a landing page instead of redirecting
function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
        <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          🌍 ESG Checklist AI
        </Typography>
        <Typography variant="h5" gutterBottom sx={{ mb: 4, opacity: 0.9 }}>
          Enterprise-Grade ESG Compliance Platform
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem', lineHeight: 1.6 }}>
          AI-powered ESG compliance automation system with advanced analytics, multi-user
          management, and comprehensive audit trails.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <>
              <Box
                component="a"
                href="/dashboard"
                sx={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Go to Dashboard
              </Box>
              <Box
                component="a"
                href="/v1/docs"
                target="_blank"
                sx={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                API Documentation
              </Box>
            </>
          ) : (
            <>
              <Box
                component="a"
                href="/login"
                sx={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Login
              </Box>
              <Box
                component="a"
                href="/v1/docs"
                target="_blank"
                sx={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                API Documentation
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ mt: 4, opacity: 0.8 }}>
          <Typography variant="body2">
            🚀 FastAPI Backend • ⚛️ React Frontend • 🤖 AI-Powered Analysis
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function AppContent() {
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
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* Root route - shows login if not authenticated, dashboard if authenticated */}
            <Route path="/" element={<Home />} />

            {/* Login route - accessible without authentication */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Login />
                </Suspense>
              }
            />

            {/* All protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Checklists />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChecklistDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists/:id/submit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChecklistSubmit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists/:id/upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChecklistUpload />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Reviews />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Analytics />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/advanced"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AdvancedAnalytics />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/checklists"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChecklistManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/system"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SystemAdministration />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SystemConfiguration />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads/advanced"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AdvancedFileUpload />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Catch-all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
