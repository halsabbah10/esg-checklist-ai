import React, { Suspense, type ReactNode } from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Enhanced loading spinner with contextual information
 */
interface LoadingSpinnerProps {
  message?: string;
  context?: string;
  showProgress?: boolean;
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(
  ({ message = 'Loading...', context, showProgress = false, size = 48 }) => (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="300px"
      flexDirection="column"
      gap={2}
      sx={{
        p: 4,
        textAlign: 'center',
      }}
    >
      <CircularProgress size={size} color="primary" />

      <Box>
        <Typography variant="h6" color="text.primary" gutterBottom>
          {message}
        </Typography>

        {context && (
          <Typography variant="body2" color="text.secondary">
            {context}
          </Typography>
        )}

        {showProgress && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This may take a few moments...
          </Typography>
        )}
      </Box>
    </Box>
  )
);

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * Fallback component for chunk loading errors
 */
interface ChunkErrorFallbackProps {
  onRetry: () => void;
  error?: Error;
}

const ChunkErrorFallback: React.FC<ChunkErrorFallbackProps> = React.memo(({ onRetry, error }) => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
    flexDirection="column"
    gap={3}
    sx={{ p: 4, textAlign: 'center' }}
  >
    <Alert severity="error" sx={{ maxWidth: 500 }}>
      <Typography variant="h6" gutterBottom>
        Failed to Load Component
      </Typography>
      <Typography variant="body2" paragraph>
        There was an issue loading this part of the application. This could be due to a network
        problem or a temporary server issue.
      </Typography>
      {error?.message && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>
          Error: {error.message}
        </Typography>
      )}
    </Alert>

    <Button variant="contained" startIcon={<Refresh />} onClick={onRetry} size="large">
      Retry Loading
    </Button>
  </Box>
));

ChunkErrorFallback.displayName = 'ChunkErrorFallback';

/**
 * Enhanced Suspense boundary with error handling and retry logic
 */
interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingMessage?: string;
  loadingContext?: string;
}

export const SuspenseBoundary: React.FC<SuspenseBoundaryProps> = React.memo(
  ({ children, fallback, loadingMessage = 'Loading...', loadingContext }) => {
    const handleRetry = React.useCallback(() => {
      // Force re-import of the failed chunk
      window.location.reload();
    }, []);

    const defaultFallback = (
      <LoadingSpinner message={loadingMessage} context={loadingContext} showProgress={true} />
    );

    return (
      <ErrorBoundary
        fallback={
          <ChunkErrorFallback onRetry={handleRetry} error={new Error('Component failed to load')} />
        }
      >
        <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>
      </ErrorBoundary>
    );
  }
);

SuspenseBoundary.displayName = 'SuspenseBoundary';

/**
 * Specialized suspense boundary for route-level components
 */
interface RouteSuspenseBoundaryProps {
  children: ReactNode;
  routeName?: string;
}

export const RouteSuspenseBoundary: React.FC<RouteSuspenseBoundaryProps> = React.memo(
  ({ children, routeName }) => (
    <SuspenseBoundary
      loadingMessage={routeName ? `Loading ${routeName}...` : 'Loading page...'}
      loadingContext="Preparing your content"
    >
      {children}
    </SuspenseBoundary>
  )
);

RouteSuspenseBoundary.displayName = 'RouteSuspenseBoundary';

/**
 * Suspense boundary for component-level lazy loading
 */
interface ComponentSuspenseBoundaryProps {
  children: ReactNode;
  componentName?: string;
  minimal?: boolean;
}

export const ComponentSuspenseBoundary: React.FC<ComponentSuspenseBoundaryProps> = React.memo(
  ({ children, componentName, minimal = false }) => {
    const fallback = minimal ? (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    ) : (
      <LoadingSpinner
        message={componentName ? `Loading ${componentName}...` : 'Loading component...'}
        size={32}
      />
    );

    return <SuspenseBoundary fallback={fallback}>{children}</SuspenseBoundary>;
  }
);

ComponentSuspenseBoundary.displayName = 'ComponentSuspenseBoundary';

export default SuspenseBoundary;
