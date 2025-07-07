import { Component, type ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: unknown;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private prevResetKeys: Array<string | number> = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.prevResetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      // Reset error boundary when navigation occurs (children change)
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
    
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        this.prevResetKeys[index] !== key
      ) || resetKeys.length !== this.prevResetKeys.length;
      
      if (hasResetKeyChanged) {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        this.prevResetKeys = resetKeys;
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={4}
        >
          <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button variant="contained" startIcon={<Refresh />} onClick={this.handleRetry}>
            Try Again
          </Button>
          {import.meta.env.DEV && this.state.error && (
            <Alert severity="error" sx={{ mt: 3, maxWidth: '600px' }}>
              <Typography variant="caption" component="pre">
                {this.state.error.stack}
              </Typography>
            </Alert>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
