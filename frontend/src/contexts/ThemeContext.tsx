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
        root: {
          borderRadius: '8px',
          textTransform: 'none', // Match dark mode
          fontWeight: 500,
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          backgroundColor: '#B91C1C',
          color: '#FFFFFF',
          boxShadow: '0 2px 6px rgba(185, 28, 28, 0.25)',
          '&:hover': {
            backgroundColor: '#991B1B',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(185, 28, 28, 0.3)',
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
          color: '#1F2937',
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#B91C1C',
            backgroundColor: 'rgba(185, 28, 28, 0.04)',
            transform: 'translateY(-1px)',
          },
        },
        text: {
          color: '#1F2937',
          '&:hover': {
            backgroundColor: 'rgba(31, 41, 55, 0.04)',
            transform: 'translateY(-1px)',
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

// Modern soft dark theme - e& brand compliant
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E53E3E', // Perfect middle ground - e& red but refined
      light: '#F56565',
      dark: '#C53030',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#9CA3AF',
      light: '#D1D5DB',
      dark: '#6B7280',
    },
    background: {
      default: '#0A0A0B', // Pure neutral dark
      paper: '#161618', // Neutral dark for cards
    },
    text: {
      primary: '#F8F9FA', // Clean white
      secondary: '#9CA3AF', // Neutral gray
    },
    divider: '#2D2D30', // Soft neutral divider
    grey: {
      50: '#26262A',
      100: '#161618', // Neutral dark for boxes
      200: '#2D2D30',
      300: '#3F3F42',
      400: '#6B6B70',
      500: '#9CA3AF',
      600: '#B5B5BA',
      700: '#D1D5DB',
      800: '#E5E7EB',
      900: '#F8F9FA',
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
          backgroundColor: '#161618', // Neutral dark card background
          border: 'none', // Remove harsh borders
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)', // Balanced dual shadow
          borderRadius: '12px', // Softer corners
          transition: 'box-shadow 0.2s ease, transform 0.15s ease', // Smooth transitions
          '&:hover': {
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25)', // Enhanced hover
            transform: 'translateY(-3px)', // Noticeable lift
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#161618', // Match card background
          backgroundImage: 'none',
          border: 'none', // Remove borders
        },
        elevation1: {
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.25)',
        },
        elevation2: {
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)',
        },
        elevation3: {
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          backgroundColor: '#E53E3E',
          color: '#FFFFFF',
          boxShadow: '0 3px 10px rgba(229, 62, 62, 0.25)',
          '&:hover': {
            backgroundColor: '#C53030',
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 18px rgba(229, 62, 62, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        outlined: {
          borderColor: '#3F3F42',
          color: '#F8F9FA',
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#E53E3E',
            backgroundColor: 'rgba(229, 62, 62, 0.08)',
            transform: 'translateY(-1px)',
          },
        },
        text: {
          color: '#F8F9FA',
          '&:hover': {
            backgroundColor: 'rgba(248, 249, 250, 0.08)',
            transform: 'translateY(-1px)',
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
          backgroundColor: '#161618',
          color: '#F8F9FA',
          borderBottom: '1px solid #2D2D30', // Bottom outline that connects with sidebar
          boxShadow: 'none', // Remove shadow
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#161618',
          borderRight: '1px solid #2D2D30', // Restore sidebar outline to connect with navbar
          boxShadow: 'none',
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
          color: '#F8F9FA',
        },
        secondary: {
          color: '#D1D5DB', // Much brighter for better readability
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#A8A8AA',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#A8A8AA',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)', // Even more subtle hover
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          border: 'none', // Remove all borders from alerts
          borderRadius: '8px',
        },
        standardInfo: {
          backgroundColor: 'rgba(45, 125, 185, 0.08)', // Very subtle blue background
          color: '#A8A8AA',
          '& .MuiAlert-icon': {
            color: '#7BA7D1', // Softer blue icon
          },
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 149, 0, 0.08)', // Very subtle orange
          color: '#A8A8AA',
          '& .MuiAlert-icon': {
            color: '#D4A574', // Softer orange icon
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2A2A2C', // Darker background for better visibility
          color: '#F8F9FA', // Bright white text
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)', // Strong shadow for dark mode
          border: '1px solid #3F3F42', // Subtle border for definition
        },
        arrow: {
          color: '#2A2A2C', // Match tooltip background
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