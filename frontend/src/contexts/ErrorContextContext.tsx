import * as React from 'react';
import type { ErrorContextType } from './ErrorContextType.tsx';

export const ErrorContext = React.createContext<ErrorContextType | undefined>(undefined);
