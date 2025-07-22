import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Button,
  Tooltip,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
  ListItemAvatar,
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  Settings, 
  Help, 
  ExitToApp,
  LightMode,
  DarkMode,
  Close,
  Dashboard,
  Analytics,
  Assessment,
  SmartToy,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationDropdown } from './Notifications';
import { GlobalSearch } from './GlobalSearch';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      handleMenuClose();
      setMobileNavOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still close menu and redirect even if logout fails
      handleMenuClose();
      setMobileNavOpen(false);
      navigate('/login');
    }
  }, [logout, navigate]);

  const handleMobileNavToggle = useCallback(() => {
    setMobileNavOpen(prev => !prev);
  }, []);

  const handleMobileNavClose = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const handleMobileNavigation = useCallback((path: string) => {
    navigate(path);
    setMobileNavOpen(false);
  }, [navigate]);

  // Role-based navigation items with icons
  const getNavItems = useCallback(() => {
    const baseItems = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
        icon: <Dashboard />,
      },
      {
        label: 'AI Analysis',
        path: '/ai-analysis',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
        icon: <SmartToy />,
      },
      { 
        label: 'Analytics', 
        path: '/analytics', 
        roles: ['admin', 'super_admin', 'reviewer'],
        icon: <Analytics />,
      },
      { 
        label: 'Reports', 
        path: '/reports', 
        roles: ['admin', 'super_admin', 'reviewer'],
        icon: <Assessment />,
      },
    ];

    if (user?.role === 'admin' || user?.role === 'super_admin') {
      baseItems.push({ 
        label: 'Admin', 
        path: '/admin', 
        roles: ['admin', 'super_admin'],
        icon: <AdminPanelSettings />,
      });
    }

    return baseItems.filter(item => item.roles.includes(user?.role || ''));
  }, [user?.role]);

  const navItems = getNavItems();

  // Mobile Navigation Drawer Component
  const MobileNavDrawer = React.memo(() => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Focus management for mobile drawer
    useEffect(() => {
      if (mobileNavOpen && closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, [mobileNavOpen]);

    // Handle escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && mobileNavOpen) {
          handleMobileNavClose();
        }
      };

      if (mobileNavOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [mobileNavOpen]);

    return (
      <Drawer
        ref={drawerRef}
        anchor="left"
        open={mobileNavOpen}
        onClose={handleMobileNavClose}
        aria-label="Main navigation menu"
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        slotProps={{
          paper: {
            role: 'navigation',
            'aria-label': 'Main navigation',
            sx: {
              width: 280,
              bgcolor: 'background.paper',
              borderRadius: 0,
            },
          },
        }}
      >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Mobile Nav Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            ESG AI
          </Typography>
          <IconButton
            ref={closeButtonRef}
            onClick={handleMobileNavClose}
            sx={{ 
              color: 'primary.contrastText',
              minHeight: 44,
              minWidth: 44,
            }}
            aria-label="Close navigation menu"
            tabIndex={0}
          >
            <Close />
          </IconButton>
        </Box>

        {/* User Info Section */}
        {user && (
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                }}
              >
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="bold" noWrap>
                  {user.name || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={user.role?.toUpperCase() || 'USER'}
              size="small"
              color="primary"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        )}

        {/* Navigation Items */}
        <List sx={{ flex: 1, pt: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleMobileNavigation(item.path)}
                  selected={isActive}
                  aria-label={`Navigate to ${item.label}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  sx={{
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    minHeight: 48,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 'bold' : 'medium',
                      fontSize: '0.95rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Mobile Actions */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isDarkMode ? <LightMode /> : <DarkMode />}
                </ListItemIcon>
                <ListItemText 
                  primary={`${isDarkMode ? 'Light' : 'Dark'} Mode`}
                  primaryTypographyProps={{ fontSize: '0.95rem' }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation('/settings')}
                aria-label="Navigate to settings"
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Settings />
                </ListItemIcon>
                <ListItemText 
                  primary="Settings"
                  primaryTypographyProps={{ fontSize: '0.95rem' }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleLogout}
                aria-label="Logout from application"
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout"
                  primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 'medium' }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Box>
      </Drawer>
    );
  });

  return (
    <>
      {/* Skip Navigation Link for Accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          padding: '8px 16px',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          fontSize: '1rem',
          fontWeight: 'bold',
          borderRadius: '0 0 4px 0',
          '&:focus': {
            left: 0,
            top: 0,
          },
        }}
        onClick={(e) => {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView();
          }
        }}
      >
        Skip to main content
      </Box>
      
      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer />
      
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} role="banner">
        <Toolbar sx={{ height: '64px', justifyContent: 'space-between' }}>
          {/* Mobile menu button - Enhanced */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton 
              color="inherit" 
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"} 
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation-drawer"
              edge="start" 
              onClick={isMobile ? handleMobileNavToggle : onMenuClick}
              sx={{
                minWidth: 44,
                minHeight: 44,
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

        {/* Logo - Enhanced for mobile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
              cursor: 'pointer',
              minHeight: 44, // Touch target
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                opacity: 0.8,
              },
              transition: 'opacity 0.2s ease-in-out',
            }}
            onClick={() => navigate('/dashboard')}
          >
            ESG AI
          </Typography>

          {/* Role indicator - Responsive */}
          <Chip
            label={user?.role?.toUpperCase() || 'USER'}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{
              fontWeight: 'bold',
              fontSize: { xs: '0.65rem', sm: '0.7rem' },
              display: { xs: 'none', sm: 'flex' },
              height: { xs: 24, sm: 'auto' },
            }}
          />
        </Box>

        {/* Desktop Navigation - Optimized */}
        <Box 
          component="nav" 
          aria-label="Main navigation"
          sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center', flex: 1 }}
        >
          {navItems.map(item => (
            <Tooltip key={item.path} title={`Navigate to ${item.label}`} arrow>
              <Button
                onClick={() => navigate(item.path)}
                startIcon={item.icon}
                aria-label={item.label}
                aria-current={location.pathname.startsWith(item.path) ? 'page' : undefined}
                sx={{
                  color: location.pathname.startsWith(item.path) ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname.startsWith(item.path) ? 700 : 500,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: { md: 1.5, lg: 2 },
                  py: 1,
                  minWidth: 'auto',
                  minHeight: 40,
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'translateY(-1px)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                  '&:after': location.pathname.startsWith(item.path)
                    ? {
                        content: '""',
                        position: 'absolute',
                        bottom: -2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80%',
                        height: 2,
                        backgroundColor: 'primary.main',
                        borderRadius: 1,
                      }
                    : {},
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {item.label}
              </Button>
            </Tooltip>
          ))}

          {/* Global Search - Responsive */}
          <Box sx={{ 
            ml: 'auto',
            mr: { md: 1, lg: 2 },
            width: { md: 240, lg: 300, xl: 320 },
            maxWidth: 320,
            minWidth: 200,
            display: { xs: 'none', md: 'block' },
          }}>
            <GlobalSearch />
          </Box>
        </Box>

        {/* Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Dark Mode Toggle */}
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`} arrow>
            <IconButton
              onClick={toggleTheme}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              sx={{
                color: 'text.secondary',
                position: 'relative',
                '&:hover': {
                  color: 'primary.main',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LightMode
                  sx={{
                    position: 'absolute',
                    opacity: isDarkMode ? 1 : 0,
                    transform: isDarkMode ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0.8)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                <DarkMode
                  sx={{
                    position: 'absolute',
                    opacity: isDarkMode ? 0 : 1,
                    transform: isDarkMode ? 'rotate(-180deg) scale(0.8)' : 'rotate(0deg) scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </Box>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Avatar with enhanced styling */}
          <Tooltip title={`${user?.name || 'User'} (${user?.role || 'role'})`} arrow>
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0.5,
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s ease-in-out',
                },
              }}
              aria-label="Open user account menu"
              aria-controls="account-menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
            >
              {user?.name ? (
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    border: '2px solid',
                    borderColor: 'primary.light',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              ) : (
                <AccountCircle sx={{ fontSize: 36, color: 'primary.main' }} />
              )}
            </IconButton>
          </Tooltip>

          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  minWidth: 220,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  boxShadow: (theme) => theme.shadows[8],
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 1.5,
                    gap: 1,
                    borderRadius: 1,
                    mx: 1,
                    my: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  },
                },
              },
            }}
          >
            <MenuItem
              disabled
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: 'grey.50',
                borderRadius: 1,
                mx: 1,
                my: 1,
              }}
            >
              <Typography variant="body1" fontWeight="bold">
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Chip
                label={user?.role?.toUpperCase() || 'USER'}
                size="small"
                color="primary"
                sx={{ mt: 0.5, fontSize: '0.7rem' }}
              />
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/settings');
              }}
            >
              <Settings fontSize="small" />
              Settings
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/help');
              }}
            >
              <Help fontSize="small" />
              Help & Support
            </MenuItem>

            <MenuItem
              onClick={handleLogout}
              sx={{
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'error.contrastText',
                },
              }}
            >
              <ExitToApp fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  </>
  );
});

export default Navbar;
