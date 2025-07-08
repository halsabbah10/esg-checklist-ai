/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Professional, soothing light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#B91C1C', // Softer, more professional red
      light: '#DC2626',
      dark: '#991B1B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#64748B', // Professional slate blue
      light: '#94A3B8',
      dark: '#475569',
    },
    background: {
      default: '#FAFAFA', // Very light gray instead of pure white
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937', // Dark gray instead of pure black
      secondary: '#6B7280', // Medium gray
    },
    divider: '#E5E7EB',
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 700, color: '#1F2937' },
    h2: { fontWeight: 600, color: '#1F2937' },
    h3: { fontWeight: 600, color: '#1F2937' },
    h4: { fontWeight: 600, color: '#1F2937' },
    h5: { fontWeight: 600, color: '#1F2937' },
    h6: { fontWeight: 600, color: '#1F2937' },
    body1: { color: '#1F2937' },
    body2: { color: '#6B7280' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#B91C1C',
          '&:hover': {
            backgroundColor: '#991B1B',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1F2937',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
        },
      },
    },
  },
});

// True dark theme - proper black/dark gray
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#EF4444', // Softer red for dark mode
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#9CA3AF',
      light: '#D1D5DB',
      dark: '#6B7280',
    },
    background: {
      default: '#111111', // True dark background
      paper: '#1A1A1A', // Slightly lighter dark for cards/papers
    },
    text: {
      primary: '#FFFFFF', // Pure white text
      secondary: '#D1D5DB', // Light gray
    },
    divider: '#374151',
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 700, color: '#FFFFFF' },
    h2: { fontWeight: 600, color: '#FFFFFF' },
    h3: { fontWeight: 600, color: '#FFFFFF' },
    h4: { fontWeight: 600, color: '#FFFFFF' },
    h5: { fontWeight: 600, color: '#FFFFFF' },
    h6: { fontWeight: 600, color: '#FFFFFF' },
    body1: { color: '#FFFFFF' },
    body2: { color: '#D1D5DB' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1A', // Dark card background
          border: '1px solid #374151',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1A', // Dark paper background
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#EF4444',
          '&:hover': {
            backgroundColor: '#DC2626',
          },
        },
        outlined: {
          borderColor: '#6B7280',
          color: '#FFFFFF',
          '&:hover': {
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF', // Light background for text fields in dark mode
            color: '#1F2937', // Dark text in light fields
            '& fieldset': {
              borderColor: '#D1D5DB',
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#EF4444', // Same red as Sign In button
            },
            '& input': {
              color: '#1F2937', // Ensure input text is dark
            },
            '& input::placeholder': {
              color: '#6B7280', // Darker placeholder for better contrast
              opacity: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#374151', // Darker label for better contrast against white fields
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#EF4444', // Same red as Sign In button
            },
            '&.MuiInputLabel-shrink': {
              color: '#374151', // Dark color for contrast against white background
              backgroundColor: '#FFFFFF', // White rounded background
              padding: '2px 6px', // Padding around the text
              borderRadius: '4px', // Rounded corners
              border: 'none', // No border
            },
            '&.Mui-focused.MuiInputLabel-shrink': {
              color: '#EF4444', // Same red as Sign In button
              backgroundColor: '#FFFFFF', // Same white background
              padding: '2px 6px',
              borderRadius: '4px',
              border: 'none', // No border even when focused
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          borderBottom: '1px solid #374151',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A1A1A',
          borderRight: '1px solid #374151',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
            },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: '#FFFFFF',
        },
        secondary: {
          color: '#D1D5DB',
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#D1D5DB',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#D1D5DB',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardInfo: {
          backgroundColor: '#1E293B', // Darker blue-gray background
          border: '1px solid #334155',
          color: '#E2E8F0', // Light text
          '& .MuiAlert-icon': {
            color: '#60A5FA', // Light blue icon
          },
        },
      },
    },
  },
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('darkMode');
      return savedTheme ? JSON.parse(savedTheme) : false;
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  };

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};