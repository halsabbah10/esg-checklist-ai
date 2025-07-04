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
  useTheme,
  useMediaQuery,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  ChecklistRtl,
  Assessment,
  Logout,
  ChevronLeft,
  ChevronRight,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;
const collapsedWidth = 64;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
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
      text: 'Reports',
      icon: <Assessment />,
      path: '/reports',
      roles: ['admin', 'reviewer'],
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
      roles: ['admin', 'reviewer', 'user'],
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
      <Toolbar>
        {!isMobile && (
          <Box display="flex" justifyContent="flex-end" width="100%" pr={1}>
            <IconButton 
              onClick={onToggleCollapse} 
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Box>
        )}
      </Toolbar>
      
      <List sx={{ px: 1 }}>
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem 
              key={item.text} 
              disablePadding 
              sx={{ mb: 0.5 }}
            >
              <Tooltip 
                title={isCollapsed ? item.text : ''} 
                placement="right"
                arrow
              >
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: '0.25rem',
                    minHeight: 40,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    px: isCollapsed ? 1 : 2,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'grey.100',
                      color: 'text.primary',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'transparent',
                      color: 'text.primary',
                      borderLeft: '4px solid',
                      borderLeftColor: 'primary.main',
                      ml: isCollapsed ? 0 : -1,
                      pl: isCollapsed ? 1 : 1,
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: isCollapsed ? 'auto' : 40,
                      color: 'inherit',
                      mr: isCollapsed ? 0 : 1,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText 
                      primary={item.text}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: 14,
                          fontWeight: 500,
                        }
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <List sx={{ px: 1, pb: 2 }}>
        <ListItem disablePadding>
          <Tooltip 
            title={isCollapsed ? 'Logout' : ''} 
            placement="right"
            arrow
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: '0.25rem',
                minHeight: 40,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                px: isCollapsed ? 1 : 2,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'grey.100',
                  color: 'text.primary',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: isCollapsed ? 'auto' : 40,
                  color: 'inherit',
                  mr: isCollapsed ? 0 : 1,
                }}
              >
                <Logout />
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText 
                  primary="Logout"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: 14,
                      fontWeight: 500,
                    }
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
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
        width: isMobile ? drawerWidth : (isCollapsed ? collapsedWidth : drawerWidth),
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: isMobile ? drawerWidth : (isCollapsed ? collapsedWidth : drawerWidth),
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      {drawer}
    </Drawer>
  );
};
