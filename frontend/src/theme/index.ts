import { createTheme } from '@mui/material/styles';

// Brand tokens as per design specification
const brandTokens = {
  colors: {
    primaryRed: '#E40523',
    textDark: '#1A1A1A',
    textMuted: '#4A4A4A',
    bgLight: '#FFFFFF',
    bgMuted: '#F5F5F5',
    border: '#E0E0E0',
  },
  spacing: {
    base: 16, // 1rem = 16px
  },
  radius: {
    base: 4, // 0.25rem
  },
  fontFamily: "'Inter', sans-serif",
};

const theme = createTheme({
  palette: {
    primary: {
      main: brandTokens.colors.primaryRed,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: brandTokens.colors.textMuted,
    },
    background: {
      default: brandTokens.colors.bgLight,
      paper: brandTokens.colors.bgLight,
    },
    text: {
      primary: brandTokens.colors.textDark,
      secondary: brandTokens.colors.textMuted,
    },
    divider: brandTokens.colors.border,
    grey: {
      100: brandTokens.colors.bgMuted,
      300: brandTokens.colors.border,
      600: brandTokens.colors.textMuted,
      900: brandTokens.colors.textDark,
    },
  },
  typography: {
    fontFamily: brandTokens.fontFamily,
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      color: brandTokens.colors.textDark,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: brandTokens.colors.textDark,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: brandTokens.colors.textDark,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: brandTokens.colors.textDark,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      color: brandTokens.colors.textDark,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: brandTokens.colors.textDark,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      color: brandTokens.colors.textDark,
    },
    body2: {
      fontSize: '0.75rem',
      fontWeight: 400,
      color: brandTokens.colors.textMuted,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: brandTokens.radius.base,
  },
  spacing: brandTokens.spacing.base / 4, // MUI uses 4px as base unit, so 4 * 4 = 16px for spacing(1)
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: brandTokens.radius.base,
          padding: '8px 16px',
          transition: 'all 150ms ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          backgroundColor: brandTokens.colors.primaryRed,
          '&:hover': {
            backgroundColor: '#CC0420', // 10% darker
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: brandTokens.radius.base,
          border: `1px solid ${brandTokens.colors.border}`,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: brandTokens.radius.base,
            '& fieldset': {
              borderColor: brandTokens.colors.border,
            },
            '&:hover fieldset': {
              borderColor: brandTokens.colors.textMuted,
            },
            '&.Mui-focused fieldset': {
              borderColor: brandTokens.colors.primaryRed,
              borderWidth: '2px',
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
          borderBottom: `1px solid ${brandTokens.colors.border}`,
        },
        head: {
          backgroundColor: brandTokens.colors.bgMuted,
          fontWeight: 600,
          color: brandTokens.colors.textDark,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: brandTokens.colors.bgMuted,
            cursor: 'pointer',
          },
          '&:nth-of-type(even)': {
            backgroundColor: '#FAFAFA',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandTokens.colors.bgLight,
          color: brandTokens.colors.textDark,
          boxShadow: `0 1px 0 ${brandTokens.colors.border}`,
          height: '64px',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: '240px',
          borderRight: `1px solid ${brandTokens.colors.border}`,
          backgroundColor: brandTokens.colors.bgLight,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderRadius: 0,
          '&:hover': {
            backgroundColor: brandTokens.colors.bgMuted,
          },
          '&.Mui-selected': {
            backgroundColor: 'transparent',
            borderLeft: `4px solid ${brandTokens.colors.primaryRed}`,
            paddingLeft: '12px',
            '&:hover': {
              backgroundColor: brandTokens.colors.bgMuted,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: brandTokens.colors.bgLight,
          color: brandTokens.colors.primaryRed,
          border: `1px solid ${brandTokens.colors.border}`,
          fontSize: '0.75rem',
          height: '24px',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  ...theme,
  palette: {
    ...theme.palette,
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
});

export { theme, darkTheme, brandTokens };
