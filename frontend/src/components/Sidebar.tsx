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
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  ChecklistRtl,
  Assessment,
  Logout,
  ChevronLeft,
  ChevronRight,
  Settings,
  Security,
  RateReview,
  SettingsApplications,
  Search,
  TrendingUp,
  InsertChart,
  FileUpload,
  AdminPanelSettings,
  ManageAccounts,
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

export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
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
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
        description: 'Overview and key metrics',
      },
      {
        text: 'Search',
        icon: <Search />,
        path: '/search',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
        description: 'Global search across all content',
      },
      {
        text: 'Checklists',
        icon: <ChecklistRtl />,
        path: '/checklists',
        roles: ['admin', 'super_admin', 'reviewer', 'auditor'],
        description: 'Manage ESG compliance checklists',
      },
      {
        text: 'Reviews',
        icon: <RateReview />,
        path: '/reviews',
        roles: ['admin', 'super_admin', 'reviewer'],
        description: 'Review submissions and assessments',
      },
      {
        text: 'Analytics',
        icon: <TrendingUp />,
        path: '/analytics',
        roles: ['admin', 'super_admin', 'reviewer'],
        description: 'Data insights and trends',
      },
      {
        text: 'Advanced Analytics',
        icon: <InsertChart />,
        path: '/analytics/advanced',
        roles: ['admin', 'super_admin'],
        description: 'Deep dive analytics and reports',
      },
      {
        text: 'Reports',
        icon: <Assessment />,
        path: '/reports',
        roles: ['admin', 'super_admin', 'reviewer'],
        description: 'Generate and view reports',
      },
      {
        text: 'File Upload',
        icon: <FileUpload />,
        path: '/checklists/1/upload',
        roles: ['admin', 'super_admin', 'auditor'],
        description: 'Upload and manage documents',
      },
    ];

    const adminMenuItems = [
      {
        text: 'User Management',
        icon: <ManageAccounts />,
        path: '/admin/users',
        roles: ['admin', 'super_admin'],
        description: 'Manage user accounts and roles',
      },
      {
        text: 'Checklist Management',
        icon: <SettingsApplications />,
        path: '/admin/checklists',
        roles: ['admin', 'super_admin'],
        description: 'Configure checklist templates',
      },
      {
        text: 'System Administration',
        icon: <AdminPanelSettings />,
        path: '/admin/system',
        roles: ['admin', 'super_admin'],
        description: 'System settings and maintenance',
      },
      {
        text: 'System Configuration',
        icon: <Security />,
        path: '/admin/config',
        roles: ['admin', 'super_admin'],
        description: 'Advanced system configuration',
      },
    ];

    const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role || ''));
    const filteredAdminItems = adminMenuItems.filter(item => item.roles.includes(user?.role || ''));

    const handleNavigation = (path: string) => {
      navigate(path);
      if (isMobile) {
        onClose();
      }
    };

    const handleLogout = async () => {
      try {
        await logout();
        if (isMobile) {
          onClose();
        }
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
        if (isMobile) {
          onClose();
        }
        navigate('/login');
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
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Box>
          )}
        </Toolbar>

        <List sx={{ px: 1 }}>
          {filteredMenuItems.map(item => {
            const isActive = location.pathname === item.path;

            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip
                  title={isCollapsed ? `${item.text}: ${item.description}` : item.description}
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    selected={isActive}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: '0.5rem',
                      minHeight: 44,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      px: isCollapsed ? 1 : 2,
                      color: 'text.secondary',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          transform: 'scale(1.1)',
                        },
                      },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderLeft: '4px solid',
                        borderLeftColor: 'secondary.main',
                        ml: isCollapsed ? 0 : -1,
                        pl: isCollapsed ? 1 : 1,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: isCollapsed ? 'auto' : 40,
                        color: 'inherit',
                        mr: isCollapsed ? 0 : 1,
                        transition: 'transform 0.2s ease-in-out',
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
                            fontWeight: 600,
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <>
            <Divider sx={{ mx: 2, my: 1 }} />
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  px: 3,
                  py: 1,
                  color: 'text.disabled',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Administration
              </Typography>
            )}
            <List sx={{ px: 1 }}>
              {filteredAdminItems.map(item => {
                const isActive = location.pathname === item.path;

                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <Tooltip
                      title={isCollapsed ? `${item.text}: ${item.description}` : item.description}
                      placement="right"
                      arrow
                    >
                      <ListItemButton
                        selected={isActive}
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          borderRadius: '0.5rem',
                          minHeight: 44,
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          px: isCollapsed ? 1 : 2,
                          color: 'text.secondary',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'warning.light',
                            color: 'warning.contrastText',
                            transform: 'translateX(4px)',
                            '& .MuiListItemIcon-root': {
                              transform: 'scale(1.1)',
                            },
                          },
                          '&.Mui-selected': {
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            borderLeft: '4px solid',
                            borderLeftColor: 'error.main',
                            ml: isCollapsed ? 0 : -1,
                            pl: isCollapsed ? 1 : 1,
                            '&:hover': {
                              bgcolor: 'warning.dark',
                            },
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: isCollapsed ? 'auto' : 40,
                            color: 'inherit',
                            mr: isCollapsed ? 0 : 1,
                            transition: 'transform 0.2s ease-in-out',
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
                                fontWeight: 600,
                              },
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}

        {/* Settings Section */}
        <Divider sx={{ mx: 2, my: 1 }} />
        <List sx={{ px: 1, pb: 2 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <Tooltip
              title={isCollapsed ? 'Settings: Manage your preferences' : 'Manage your preferences'}
              placement="right"
              arrow
            >
              <ListItemButton
                selected={location.pathname === '/settings'}
                onClick={() => handleNavigation('/settings')}
                sx={{
                  borderRadius: '0.5rem',
                  minHeight: 44,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1 : 2,
                  color: 'text.secondary',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                    transform: 'translateX(4px)',
                    '& .MuiListItemIcon-root': {
                      transform: 'scale(1.1)',
                    },
                  },
                  '&.Mui-selected': {
                    bgcolor: 'info.main',
                    color: 'info.contrastText',
                    borderLeft: '4px solid',
                    borderLeftColor: 'success.main',
                    ml: isCollapsed ? 0 : -1,
                    pl: isCollapsed ? 1 : 1,
                    '&:hover': {
                      bgcolor: 'info.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 'auto' : 40,
                    color: 'inherit',
                    mr: isCollapsed ? 0 : 1,
                    transition: 'transform 0.2s ease-in-out',
                  }}
                >
                  <Settings />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary="Settings"
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: 14,
                        fontWeight: 600,
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <List sx={{ px: 1, pb: 2 }}>
          <ListItem disablePadding>
            <Tooltip
              title={isCollapsed ? 'Logout: Sign out of your account' : 'Sign out of your account'}
              placement="right"
              arrow
            >
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  borderRadius: '0.5rem',
                  minHeight: 44,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1 : 2,
                  color: 'text.secondary',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    transform: 'translateX(4px)',
                    '& .MuiListItemIcon-root': {
                      transform: 'scale(1.1)',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isCollapsed ? 'auto' : 40,
                    color: 'inherit',
                    mr: isCollapsed ? 0 : 1,
                    transition: 'transform 0.2s ease-in-out',
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
                        fontWeight: 600,
                      },
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
          width: isMobile ? drawerWidth : isCollapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          transition: 'width 0.3s ease',
          '& .MuiDrawer-paper': {
            width: isMobile ? drawerWidth : isCollapsed ? collapsedWidth : drawerWidth,
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
  }
);
