import * as React from 'react';

export interface ErrorContextType {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const ErrorContext = React.createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = React.useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = React.useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
