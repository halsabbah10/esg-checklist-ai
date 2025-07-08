import React, { useState, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Box, Toolbar, useMediaQuery, useTheme as useMuiTheme, CircularProgress, Typography } from '@mui/material';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
import { RouteSuspenseBoundary } from './components/SuspenseBoundary';

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
const Search = lazy(() => import('./pages/Search').then(module => ({ default: module.Search })));
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
const Help = lazy(() => import('./pages/Help'));

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
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Helper component for protected routes with suspense
const ProtectedRouteWithSuspense: React.FC<{
  children: React.ReactNode;
  routeName: string;
}> = ({ children, routeName }) => (
  <ProtectedRoute>
    <AppLayout>
      <RouteSuspenseBoundary routeName={routeName}>{children}</RouteSuspenseBoundary>
    </AppLayout>
  </ProtectedRoute>
);

// Layout component for authenticated pages
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

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
          display: 'flex',
          flexDirection: 'column',
          // Remove margin-left and let flex handle the positioning
          width: `calc(100% - ${
            isMobile ? 0 : sidebarCollapsed ? 64 : 240
          }px)`,
          transition: 'width 0.3s ease',
        }}
      >
        <Toolbar />
        {/* Use Container for consistent content width and padding */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 'none', // Remove maxWidth constraint for full-width layout
            px: 0, // Remove default padding to let Container handle it
          }}
        >
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Create a Home component that handles initial routing with enhanced authentication
function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Enhanced authentication check
  const hasValidToken = !!localStorage.getItem('authToken');
  const hasValidUser = !!(user && user.id && user.email);
  const isFullyAuthenticated = isAuthenticated && hasValidToken && hasValidUser;

  if (!isFullyAuthenticated) {
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

  // If fully authenticated, redirect to dashboard
  return <Navigate to="/dashboard" replace />;
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
      <AuthGuard>
        <Router>
          <ErrorBoundaryWithReset>
            <Routes>
              {/* Root route - shows login if not authenticated, dashboard if authenticated */}
              <Route path="/" element={<Home />} />

              {/* Login route - accessible without authentication */}
              <Route
                path="/login"
                element={
                  <RouteSuspenseBoundary routeName="Login">
                    <Login />
                  </RouteSuspenseBoundary>
                }
              />

              {/* All protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRouteWithSuspense routeName="Dashboard">
                    <Dashboard />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/checklists"
                element={
                  <ProtectedRouteWithSuspense routeName="Checklists">
                    <Checklists />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/checklists/:id"
                element={
                  <ProtectedRouteWithSuspense routeName="Checklist Details">
                    <ChecklistDetail />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/checklists/:id/submit"
                element={
                  <ProtectedRouteWithSuspense routeName="Submit Checklist">
                    <ChecklistSubmit />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/checklists/:id/upload"
                element={
                  <ProtectedRouteWithSuspense routeName="Upload Files">
                    <ChecklistUpload />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRouteWithSuspense routeName="Reviews">
                    <Reviews />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRouteWithSuspense routeName="Search">
                    <Search />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRouteWithSuspense routeName="Analytics">
                    <Analytics />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/analytics/advanced"
                element={
                  <ProtectedRouteWithSuspense routeName="Advanced Analytics">
                    <AdvancedAnalytics />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRouteWithSuspense routeName="Reports">
                    <Reports />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRouteWithSuspense routeName="Settings">
                    <Settings />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRouteWithSuspense routeName="User Management">
                    <UserManagement />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/admin/checklists"
                element={
                  <ProtectedRouteWithSuspense routeName="Checklist Management">
                    <ChecklistManagement />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/admin/system"
                element={
                  <ProtectedRouteWithSuspense routeName="System Administration">
                    <SystemAdministration />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/admin/config"
                element={
                  <ProtectedRouteWithSuspense routeName="System Configuration">
                    <SystemConfiguration />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/uploads/advanced"
                element={
                  <ProtectedRouteWithSuspense routeName="Advanced File Upload">
                    <AdvancedFileUpload />
                  </ProtectedRouteWithSuspense>
                }
              />
              <Route
                path="/help"
                element={
                  <ProtectedRouteWithSuspense routeName="Help & Support">
                    <Help />
                  </ProtectedRouteWithSuspense>
                }
              />
              {/* Catch-all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundaryWithReset>
        </Router>
      </AuthGuard>
    </>
  );
}

// ErrorBoundary wrapper that resets on route changes
function ErrorBoundaryWithReset({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <ErrorBoundary 
      resetOnPropsChange={true}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
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
