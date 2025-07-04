import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  ChecklistRtl,
  RateReview,
  Analytics,
  Assessment,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['admin', 'reviewer', 'user'],
    },
    {
      text: 'Checklists',
      icon: <ChecklistRtl />,
      path: '/checklists',
      roles: ['admin', 'reviewer', 'user'],
    },
    {
      text: 'Reviews',
      icon: <RateReview />,
      path: '/reviews',
      roles: ['admin', 'reviewer'],
    },
    {
      text: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
      roles: ['admin', 'reviewer'],
    },
    {
      text: 'Reports',
      icon: <Assessment />,
      path: '/reports',
      roles: ['admin', 'reviewer'],
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    if (isMobile) {
      onClose();
    }
  };

  const drawer = (
    <>
      <Toolbar />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isOpen}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
    >
      {drawer}
    </Drawer>
  );
};
