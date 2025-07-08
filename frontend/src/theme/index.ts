import { createTheme, PaletteMode } from '@mui/material/styles';

// Enhanced brand tokens with dark mode support
const brandTokens = {
  colors: {
    light: {
      primaryRed: '#E40523',
      primaryRedHover: '#CC0420',
      textPrimary: '#1A1A1A',
      textSecondary: '#4A4A4A',
      textDisabled: '#9E9E9E',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundMuted: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      border: '#E0E0E0',
      borderLight: '#F0F0F0',
      success: '#28A745',
      warning: '#FFC107',
      error: '#DC3545',
      info: '#17A2B8',
    },
    dark: {
      primaryRed: '#FF4757',
      primaryRedHover: '#E84057',
      textPrimary: '#FFFFFF',
      textSecondary: '#B3B3B3',
      textDisabled: '#6C6C6C',
      background: '#0D1117',
      backgroundSecondary: '#161B22',
      backgroundMuted: '#21262D',
      surface: '#161B22',
      surfaceElevated: '#21262D',
      border: '#30363D',
      borderLight: '#21262D',
      success: '#28A745',
      warning: '#FFC107',
      error: '#F85149',
      info: '#58A6FF',
    },
  },
  spacing: {
    base: 16,
  },
  radius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  shadows: {
    light: {
      small: '0 1px 2px rgba(0, 0, 0, 0.05)',
      medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
      large: '0 8px 16px rgba(0, 0, 0, 0.15)',
    },
    dark: {
      small: '0 1px 2px rgba(0, 0, 0, 0.3)',
      medium: '0 4px 8px rgba(0, 0, 0, 0.4)',
      large: '0 8px 16px rgba(0, 0, 0, 0.5)',
    },
  },
};

const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';
  const colors = isDark ? brandTokens.colors.dark : brandTokens.colors.light;
  const shadows = isDark ? brandTokens.shadows.dark : brandTokens.shadows.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primaryRed,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: colors.textSecondary,
      },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
        disabled: colors.textDisabled,
      },
      divider: colors.border,
      success: {
        main: colors.success,
      },
      warning: {
        main: colors.warning,
      },
      error: {
        main: colors.error,
      },
      info: {
        main: colors.info,
      },
      grey: {
        50: isDark ? colors.backgroundMuted : '#FAFAFA',
        100: isDark ? colors.backgroundSecondary : brandTokens.colors.light.backgroundMuted,
        200: isDark ? colors.border : '#EEEEEE',
        300: isDark ? colors.border : brandTokens.colors.light.border,
        400: isDark ? colors.textDisabled : '#BDBDBD',
        500: isDark ? colors.textSecondary : '#9E9E9E',
        600: isDark ? colors.textSecondary : brandTokens.colors.light.textSecondary,
        700: isDark ? colors.textPrimary : '#616161',
        800: isDark ? colors.textPrimary : '#424242',
        900: isDark ? colors.textPrimary : brandTokens.colors.light.textPrimary,
      },
    },
    typography: {
      fontFamily: brandTokens.fontFamily,
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: colors.textPrimary,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        color: colors.textPrimary,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
        color: colors.textPrimary,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
        color: colors.textPrimary,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
        color: colors.textPrimary,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.5,
        color: colors.textSecondary,
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: '0.02em',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.4,
        color: colors.textSecondary,
      },
    },
    shape: {
      borderRadius: brandTokens.radius.small,
    },
    spacing: brandTokens.spacing.base / 4,
    shadows: [
      'none',
      shadows.small,
      shadows.small,
      shadows.medium,
      shadows.medium,
      shadows.medium,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
      shadows.large,
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.background,
            color: colors.textPrimary,
            fontFamily: brandTokens.fontFamily,
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} transparent`,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: colors.border,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: colors.textDisabled,
              },
            },
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: colors.border,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: colors.textDisabled,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: brandTokens.radius.medium,
            padding: '10px 20px',
            fontWeight: 500,
            transition: 'all 200ms ease-in-out',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: shadows.medium,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            backgroundColor: colors.primaryRed,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: colors.primaryRedHover,
            },
          },
          outlined: {
            borderColor: colors.border,
            color: colors.textPrimary,
            '&:hover': {
              borderColor: colors.primaryRed,
              backgroundColor: isDark ? 'rgba(255, 71, 87, 0.08)' : 'rgba(228, 5, 35, 0.04)',
            },
          },
          text: {
            color: colors.textPrimary,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: brandTokens.radius.large,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            boxShadow: shadows.small,
            transition: 'all 200ms ease-in-out',
            '&:hover': {
              boxShadow: shadows.medium,
              borderColor: isDark ? colors.border : colors.borderLight,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: shadows.small,
          },
          elevation2: {
            boxShadow: shadows.medium,
          },
          elevation3: {
            boxShadow: shadows.large,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: brandTokens.radius.medium,
              backgroundColor: colors.surface,
              transition: 'all 200ms ease-in-out',
              '& fieldset': {
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: colors.textSecondary,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primaryRed,
                borderWidth: '2px',
              },
              '&.Mui-disabled': {
                backgroundColor: colors.backgroundMuted,
              },
            },
            '& .MuiInputLabel-root': {
              color: colors.textSecondary,
              '&.Mui-focused': {
                color: colors.primaryRed,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: brandTokens.radius.medium,
            backgroundColor: colors.surface,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: colors.textPrimary,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(255, 71, 87, 0.12)' : 'rgba(228, 5, 35, 0.08)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 71, 87, 0.16)' : 'rgba(228, 5, 35, 0.12)',
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            color: colors.textPrimary,
          },
          head: {
            backgroundColor: colors.backgroundSecondary,
            fontWeight: 600,
            color: colors.textPrimary,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: colors.backgroundMuted,
              cursor: 'pointer',
            },
            '&:nth-of-type(even)': {
              backgroundColor: colors.backgroundSecondary,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            boxShadow: `0 1px 0 ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            height: '64px',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            width: '240px',
            borderRight: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            borderRadius: brandTokens.radius.medium,
            margin: '2px 8px',
            color: colors.textPrimary,
            transition: 'all 200ms ease-in-out',
            '&:hover': {
              backgroundColor: colors.backgroundMuted,
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(255, 71, 87, 0.12)' : 'rgba(228, 5, 35, 0.08)',
              borderLeft: `4px solid ${colors.primaryRed}`,
              borderRadius: `0 ${brandTokens.radius.medium}px ${brandTokens.radius.medium}px 0`,
              marginLeft: '8px',
              paddingLeft: '12px',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 71, 87, 0.16)' : 'rgba(228, 5, 35, 0.12)',
              },
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: colors.textPrimary,
            fontWeight: 500,
          },
          secondary: {
            color: colors.textSecondary,
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: colors.textSecondary,
            minWidth: '40px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: colors.backgroundMuted,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            fontSize: '0.75rem',
            fontWeight: 500,
            '&.MuiChip-colorPrimary': {
              backgroundColor: isDark ? 'rgba(255, 71, 87, 0.12)' : 'rgba(228, 5, 35, 0.08)',
              color: colors.primaryRed,
              border: `1px solid ${colors.primaryRed}`,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 48,
            height: 24,
            padding: 0,
            '& .MuiSwitch-switchBase': {
              padding: 2,
              '&.Mui-checked': {
                transform: 'translateX(24px)',
                color: '#fff',
                '& + .MuiSwitch-track': {
                  backgroundColor: colors.primaryRed,
                  opacity: 1,
                  border: 0,
                },
              },
            },
            '& .MuiSwitch-thumb': {
              width: 20,
              height: 20,
              backgroundColor: '#fff',
            },
            '& .MuiSwitch-track': {
              borderRadius: 12,
              backgroundColor: colors.border,
              opacity: 1,
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: colors.textSecondary,
            '&.Mui-selected': {
              color: colors.primaryRed,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: colors.primaryRed,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: brandTokens.radius.medium,
          },
          standardSuccess: {
            backgroundColor: isDark ? 'rgba(40, 167, 69, 0.12)' : 'rgba(40, 167, 69, 0.08)',
            color: colors.success,
          },
          standardError: {
            backgroundColor: isDark ? 'rgba(248, 81, 73, 0.12)' : 'rgba(220, 53, 69, 0.08)',
            color: colors.error,
          },
          standardWarning: {
            backgroundColor: isDark ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255, 193, 7, 0.08)',
            color: colors.warning,
          },
          standardInfo: {
            backgroundColor: isDark ? 'rgba(88, 166, 255, 0.12)' : 'rgba(23, 162, 184, 0.08)',
            color: colors.info,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: colors.textSecondary,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: colors.border,
          },
        },
      },
    },
  });
};

// Export individual themes
export const theme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
export { brandTokens };

// Export theme creator function for dynamic theme switching
export { createAppTheme };