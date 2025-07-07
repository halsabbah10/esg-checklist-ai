import * as React from 'react';
import { ErrorContext } from './ErrorContextContext';

export const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = React.useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export { ErrorContext };
