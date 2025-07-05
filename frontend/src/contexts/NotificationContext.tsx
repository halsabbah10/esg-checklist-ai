/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  showNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarNotification, setSnackbarNotification] = useState<Notification | null>(null);
  const queryClient = useQueryClient();

  // Disable notifications polling to prevent auth issues
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll().then(res => res.data.results || []),
    enabled: false, // Disable automatic fetching for now
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 25000, // Consider data fresh for 25 seconds
    select: (data: Notification[]) =>
      data.sort(
        (a: Notification, b: Notification) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
  });

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const showNotification = (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      read: false,
    };
    setSnackbarNotification(newNotification);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setTimeout(() => setSnackbarNotification(null), 150);
  };

  // Remove problematic useEffect that was causing infinite reloads
  // In a real app, new notification detection would be handled via WebSocket

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        showNotification,
      }}
    >
      {children}

      {/* Toast Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarNotification?.type || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          <AlertTitle>{snackbarNotification?.title}</AlertTitle>
          {snackbarNotification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
