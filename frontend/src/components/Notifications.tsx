import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  IconButton,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone,
  Circle,
  CheckCircle,
  Warning,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { notificationsAPI } from '../services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle color="success" />;
    case 'warning':
      return <Warning color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    default:
      return <Info color="info" />;
  }
};

const getNotificationColor = (type: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
};

export const NotificationDropdown: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll(),
  });

  // Fetch unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsAPI.getUnreadCount(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const notificationsList: Notification[] = notifications?.data || [];
  const unreadCountValue = unreadCount?.data?.count || 0;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Badge badgeContent={unreadCountValue} color="error">
          {unreadCountValue > 0 ? <NotificationsIcon /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxWidth: 400,
            width: '100%',
            maxHeight: 500,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
            {unreadCountValue > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
          </Box>
          {unreadCountValue > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCountValue} unread notification{unreadCountValue !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {isLoading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading notifications...
            </Typography>
          </Box>
        ) : notificationsList.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNone color="disabled" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
            {notificationsList.slice(0, 10).map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {notification.read ? (
                      getNotificationIcon(notification.type)
                    ) : (
                      <Circle color="primary" sx={{ fontSize: 12 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          fontWeight={notification.read ? 400 : 600}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.type}
                          size="small"
                          color={getNotificationColor(notification.type)}
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < notificationsList.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {notificationsList.length > 10 && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button size="small" onClick={handleClose}>
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export const NotificationsList: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch all notifications
  const {
    data: notifications,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading notifications...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load notifications. Please try again.</Alert>;
  }

  const notificationsList: Notification[] = notifications?.data || [];

  if (notificationsList.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <NotificationsNone color="disabled" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You'll see notifications here when there are updates.
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {notificationsList.map((notification, index) => (
        <React.Fragment key={notification.id}>
          <ListItem
            sx={{
              backgroundColor: notification.read ? 'transparent' : 'action.hover',
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemIcon>{getNotificationIcon(notification.type)}</ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={notification.read ? 400 : 600}>
                    {notification.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={notification.type}
                      size="small"
                      color={getNotificationColor(notification.type)}
                      variant="outlined"
                    />
                    {!notification.read && (
                      <Button
                        size="small"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        Mark as read
                      </Button>
                    )}
                  </Box>
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.created_at).toLocaleString()}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          {index < notificationsList.length - 1 && <Divider sx={{ my: 1 }} />}
        </React.Fragment>
      ))}
    </List>
  );
};
