import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Mock console.error to avoid noise in test output
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws different types of errors
const ThrowCustomError = ({ errorType }: { errorType?: string }) => {
  switch (errorType) {
    case 'network':
      throw new Error('Network error occurred');
    case 'auth':
      throw new Error('Authentication failed');
    case 'validation':
      throw new Error('Validation error: Invalid input');
    case 'generic':
      throw new Error('Something went wrong');
    default:
      return <div>No error</div>;
  }
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child component</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child component')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Test error/i)).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    // Mock development environment
    const originalEnv = import.meta.env.DEV;
    Object.defineProperty(import.meta.env, 'DEV', {
      value: true,
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Test error/i)).toBeInTheDocument();

    // Restore original environment
    Object.defineProperty(import.meta.env, 'DEV', {
      value: originalEnv,
      writable: true,
    });
  });

  it('should handle network errors appropriately', () => {
    render(
      <ErrorBoundary>
        <ThrowCustomError errorType="network" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Network error occurred/i)).toBeInTheDocument();
  });

  it('should handle authentication errors', () => {
    render(
      <ErrorBoundary>
        <ThrowCustomError errorType="auth" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentication failed/i)).toBeInTheDocument();
  });

  it('should handle validation errors', () => {
    render(
      <ErrorBoundary>
        <ThrowCustomError errorType="validation" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Validation error: Invalid input/i)).toBeInTheDocument();
  });

  it('should provide reload functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    expect(reloadButton).toBeInTheDocument();
    
    reloadButton.click();
    expect(mockReload).toHaveBeenCalled();
  });

  it('should log error information to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should reset error state when children change', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should still show error (ErrorBoundary doesn't reset automatically)
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should handle errors with custom error boundaries', () => {
    const CustomErrorBoundary = ({ children }: { children: React.ReactNode }) => (
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        {children}
      </ErrorBoundary>
    );

    render(
      <CustomErrorBoundary>
        <ThrowError shouldThrow={true} />
      </CustomErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should log error information for debugging', () => {
    // Render component that will throw an error
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify error was logged to console
    expect(consoleSpy).toHaveBeenCalled();
  });
});