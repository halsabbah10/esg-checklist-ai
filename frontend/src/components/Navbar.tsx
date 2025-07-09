import React, { useState } from 'react';
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
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  Settings, 
  Help, 
  ExitToApp,
  LightMode,
  DarkMode 
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still close menu and redirect even if logout fails
      handleMenuClose();
      navigate('/login');
    }
  };

  // Role-based navigation items
  const getNavItems = () => {
    const baseItems = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
      },
      {
        label: 'Checklists',
        path: '/checklists',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
      },
      { label: 'Analytics', path: '/analytics', roles: ['admin', 'super_admin', 'reviewer'] },
      { label: 'Reports', path: '/reports', roles: ['admin', 'super_admin', 'reviewer'] },
    ];

    if (user?.role === 'admin' || user?.role === 'super_admin') {
      baseItems.push({ label: 'Admin', path: '/admin', roles: ['admin', 'super_admin'] });
    }

    return baseItems.filter(item => item.roles.includes(user?.role || ''));
  };

  const navItems = getNavItems();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ height: '64px', justifyContent: 'space-between' }}>
        {/* Mobile menu button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            🌍 ESG AI
          </Typography>

          {/* Role indicator */}
          <Chip
            label={user?.role?.toUpperCase() || 'USER'}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{
              fontWeight: 'bold',
              fontSize: '0.7rem',
              display: { xs: 'none', sm: 'flex' },
            }}
          />
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center', flex: 1 }}>
          {navItems.map(item => (
            <Tooltip key={item.path} title={`Navigate to ${item.label}`} arrow>
              <Button
                onClick={() => navigate(item.path)}
                sx={{
                  color: location.pathname.startsWith(item.path) ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname.startsWith(item.path) ? 700 : 500,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 2,
                  py: 1,
                  minWidth: 'auto',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transform: 'translateY(-1px)',
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
                }}
              >
                {item.label}
              </Button>
            </Tooltip>
          ))}

          {/* Global Search */}
          <Box sx={{ ml: 'auto', mr: 2, maxWidth: 300, minWidth: 200 }}>
            <GlobalSearch />
          </Box>
        </Box>

        {/* Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Dark Mode Toggle */}
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`} arrow>
            <IconButton
              onClick={toggleTheme}
              sx={{
                color: 'text.secondary',
                position: 'relative',
                '&:hover': {
                  color: 'primary.main',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
              aria-label="toggle dark mode"
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
              aria-label="account menu"
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
            PaperProps={{
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
  );
});
