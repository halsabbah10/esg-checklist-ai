import { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Box, Toolbar, useMediaQuery, useTheme, CircularProgress, Typography } from '@mui/material';

// Contexts
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Checklists = lazy(() => import('./pages/Checklists').then(module => ({ default: module.Checklists })));
const ChecklistDetail = lazy(() => import('./pages/ChecklistDetail').then(module => ({ default: module.ChecklistDetail })));
const ChecklistSubmit = lazy(() => import('./pages/ChecklistSubmit').then(module => ({ default: module.ChecklistSubmit })));
const ChecklistUpload = lazy(() => import('./pages/ChecklistUpload').then(module => ({ default: module.ChecklistUpload })));
const Reviews = lazy(() => import('./pages/Reviews').then(module => ({ default: module.Reviews })));
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));

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

function AppContent() {
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
    <Router>
      <Routes>
        <Route path="/login" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Login />
          </Suspense>
        } />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Navbar onMenuClick={handleSidebarToggle} />
                <Sidebar
                  isOpen={isMobile ? sidebarOpen : true}
                  onClose={() => setSidebarOpen(false)}
                  isCollapsed={!isMobile && sidebarCollapsed}
                  onToggleCollapse={handleSidebarCollapse}
                />                <Box
                  component="main"
                  sx={{
                    flexGrow: 1,
                    bgcolor: 'background.default',
                    minHeight: '100vh',
                    width: '100%',
                    ml: { 
                      xs: 0, 
                      md: isMobile ? 0 : (sidebarCollapsed ? '64px' : '240px')
                    },
                    transition: 'margin 0.3s ease',
                  }}
                >
                  <Toolbar />
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/checklists" element={<Checklists />} />
                      <Route path="/checklists/:id" element={<ChecklistDetail />} />
                      <Route path="/checklists/:id/submit" element={<ChecklistSubmit />} />
                      <Route path="/checklists/:id/upload" element={<ChecklistUpload />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                  </Box>
                </Box>
              </Box>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
