import React, { useState, lazy, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Box, Toolbar, useMediaQuery, useTheme as useMuiTheme, CircularProgress, Typography } from '@mui/material';
import { useScrollLock } from './hooks/useScrollLock';

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
const AnalysisHistory = lazy(() => import('./pages/AnalysisHistory'));
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
const AIAnalysis = lazy(() => import('./pages/AIAnalysis'));
const Help = lazy(() => import('./pages/Help'));
const Documentation = lazy(() => 
  import('./pages/Documentation').then(module => ({ default: module.Documentation }))
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default to collapsed
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [hasOpenModal, setHasOpenModal] = useState(false); // Track if any modal is open
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  // Global scroll lock for modals/dialogs - only when explicitly requested
  useScrollLock(hasOpenModal);

  // Debug modal state
  useEffect(() => {
    console.log('Modal state changed:', hasOpenModal);
  }, [hasOpenModal]);

  // Global modal state management
  useEffect(() => {
    const handleModalStateChange = (event: CustomEvent<{ isOpen: boolean }>) => {
      setHasOpenModal(event.detail.isOpen);
    };

    // Listen for global modal state changes
    window.addEventListener('modalStateChange', handleModalStateChange as EventListener);
    
    return () => {
      window.removeEventListener('modalStateChange', handleModalStateChange as EventListener);
    };
  }, []);

  // Prevent scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  // Determine if sidebar should show expanded (either manually expanded or hovered)
  const isExpanded = !isMobile && (!sidebarCollapsed || sidebarHovered);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSidebarHover = (hovered: boolean) => {
    setSidebarHovered(hovered);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={handleSidebarToggle} />
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={!isMobile && sidebarCollapsed}
        onToggleCollapse={handleSidebarCollapse}
        isExpanded={isExpanded}
        onHover={handleSidebarHover}
      />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // Dynamic width based on expanded state
          width: `calc(100% - ${
            isMobile ? 0 : isExpanded ? 240 : 64
          }px)`,
          transition: 'width 0.25s ease', // Slightly faster transition
          // Prevent scroll when modal is open
          overflow: hasOpenModal ? 'hidden' : 'auto',
          // Handle touch events properly
          '&:focus-within': {
            outline: 'none',
          },
        }}
        onScroll={(e) => {
          // Prevent scroll bubbling when modals are open
          if (hasOpenModal) {
            e.preventDefault();
            e.stopPropagation();
          }
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
    return <Navigate to="/login" replace />;
  }

  // If fully authenticated, redirect to dashboard
  return <Navigate to="/dashboard" replace />;
}

function AppContent() {
  // Scroll navigation prevention removed to restore normal scrolling

  // Minimal global styles reset
  const globalStylesReset = `
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    #root {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      width: 100%;
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
                path="/analysis-history"
                element={
                  <ProtectedRouteWithSuspense routeName="Analysis History">
                    <AnalysisHistory />
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
                path="/ai-analysis"
                element={
                  <ProtectedRouteWithSuspense routeName="AI Analysis">
                    <AIAnalysis />
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
              <Route
                path="/documentation"
                element={
                  <ProtectedRouteWithSuspense routeName="Documentation">
                    <Documentation />
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
