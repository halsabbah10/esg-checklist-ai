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
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationDropdown } from './Notifications';
import { GlobalSearch } from './GlobalSearch';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Checklists', path: '/checklists' },
    { label: 'Reports', path: '/reports' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ height: '64px', justifyContent: 'space-between' }}>
        {/* Mobile menu button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            e& ESG
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4, alignItems: 'center', flex: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: location.pathname === item.path ? 'underline' : 'none',
                textDecorationColor: 'primary.main',
                textUnderlineOffset: '4px',
                '&:hover': {
                  textDecoration: 'underline',
                  textDecorationColor: 'primary.main',
                  textUnderlineOffset: '4px',
                  backgroundColor: 'transparent',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          
          {/* Global Search */}
          <Box sx={{ ml: 'auto', mr: 2 }}>
            <GlobalSearch />
          </Box>
        </Box>

        {/* Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <NotificationDropdown />
          
          <IconButton
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
            aria-label="account menu"
          >
            {user?.name ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircle sx={{ fontSize: 32 }} />
            )}
          </IconButton>

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
                mt: 1,
                minWidth: 200,
                border: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <MenuItem disabled sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body1" fontWeight="medium">
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/help'); }}>
              Help
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
