import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

export interface LoadingStateProps {
  /** The type of loading state to display */
  variant?: 'spinner' | 'skeleton' | 'inline' | 'full-page' | 'overlay';
  /** Custom loading message */
  message?: string;
  /** Size of the loading indicator */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the loading message */
  showMessage?: boolean;
  /** Minimum height for the loading container */
  minHeight?: string | number;
  /** Custom children to render instead of default loading state */
  children?: React.ReactNode;
  /** Number of skeleton lines to show (for skeleton variant) */
  skeletonLines?: number;
  /** Width for skeleton variant */
  skeletonWidth?: string | number;
  /** Whether this is a critical loading state that should announce to screen readers */
  critical?: boolean;
}

/**
 * Standardized loading state component with multiple variants
 * Provides consistent loading UX across the application
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  message = 'Loading...',
  size = 'medium',
  showMessage = true,
  minHeight = 200,
  children,
  skeletonLines = 3,
  skeletonWidth = '100%',
  critical = false,
}) => {
  // Size mappings for consistent sizing
  const sizeMap = {
    small: { spinner: 24, typography: '0.875rem' },
    medium: { spinner: 40, typography: '1rem' },
    large: { spinner: 56, typography: '1.125rem' },
  };

  const currentSize = sizeMap[size];

  // Spinner variant - most common
  if (variant === 'spinner') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={minHeight}
        role="status"
        aria-live={critical ? 'assertive' : 'polite'}
        aria-label={message}
      >
        <CircularProgress 
          size={currentSize.spinner} 
          aria-label="Loading"
          sx={{ mb: showMessage ? 2 : 0 }}
        />
        {showMessage && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ 
              fontSize: currentSize.typography,
              textAlign: 'center',
              maxWidth: 300,
            }}
            aria-live="polite"
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Skeleton variant - for content loading
  if (variant === 'skeleton') {
    return (
      <Box
        sx={{ width: skeletonWidth, minHeight }}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        {Array.from({ length: skeletonLines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            sx={{
              fontSize: currentSize.typography,
              mb: 1,
              width: index === skeletonLines - 1 ? '75%' : '100%', // Last line shorter
            }}
          />
        ))}
      </Box>
    );
  }

  // Inline variant - small loading for buttons, etc.
  if (variant === 'inline') {
    return (
      <Box
        display="inline-flex"
        alignItems="center"
        gap={1}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <CircularProgress size={currentSize.spinner} />
        {showMessage && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: currentSize.typography }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Full page variant - covers entire viewport
  if (variant === 'full-page') {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bgcolor="background.default"
        zIndex={9999}
        role="status"
        aria-live={critical ? 'assertive' : 'polite'}
        aria-label={message}
      >
        <CircularProgress 
          size={currentSize.spinner} 
          sx={{ mb: showMessage ? 2 : 0 }}
        />
        {showMessage && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ 
              fontSize: currentSize.typography,
              textAlign: 'center',
              maxWidth: 300,
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Overlay variant - semi-transparent overlay
  if (variant === 'overlay') {
    return (
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bgcolor="rgba(0, 0, 0, 0.5)"
        zIndex={1000}
        role="status"
        aria-live={critical ? 'assertive' : 'polite'}
        aria-label={message}
      >
        <Box
          bgcolor="background.paper"
          borderRadius={2}
          p={3}
          display="flex"
          flexDirection="column"
          alignItems="center"
          boxShadow={3}
        >
          <CircularProgress 
            size={currentSize.spinner} 
            sx={{ mb: showMessage ? 2 : 0 }}
          />
          {showMessage && (
            <Typography
              variant="body1"
              color="text.primary"
              sx={{ 
                fontSize: currentSize.typography,
                textAlign: 'center',
                maxWidth: 250,
              }}
            >
              {message}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Custom children
  if (children) {
    return (
      <Box
        role="status"
        aria-live={critical ? 'assertive' : 'polite'}
        aria-label={message}
        minHeight={minHeight}
      >
        {children}
      </Box>
    );
  }

  // Fallback to spinner
  return (
    <LoadingState
      variant="spinner"
      message={message}
      size={size}
      showMessage={showMessage}
      minHeight={minHeight}
      critical={critical}
    />
  );
};

/**
 * Hook for consistent loading states
 */
export const useLoadingState = (isLoading: boolean, message?: string) => {
  return {
    isLoading,
    LoadingComponent: isLoading ? (
      <LoadingState message={message} />
    ) : null,
    SkeletonComponent: isLoading ? (
      <LoadingState variant="skeleton" message={message} />
    ) : null,
    InlineLoader: isLoading ? (
      <LoadingState variant="inline" message={message} size="small" />
    ) : null,
  };
};

export default LoadingState;