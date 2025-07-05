import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  CloudUpload,
  Speed,
  Refresh,
  Notifications,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { realtimeAnalyticsAPI, notificationsAPI, uploadsAPI } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';

interface ApiResponse<T> {
  data: T;
}

interface UploadResult {
  id: string;
  filename: string;
  user_name?: string;
  uploaded_at: string;
  status: string;
}

interface NotificationResult {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: string;
}

interface ActivityResult {
  id: string;
  action_type: string;
  action_description?: string;
  timestamp: string;
  user_name?: string;
  status: string;
}

interface RealTimeStat {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'submission' | 'review' | 'user_activity';
  title: string;
  subtitle: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user: string;
}

export const RealTimeDashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { isConnected, error: wsError } = useWebSocket('dashboard', {
    onMessage: (data: unknown) => {
      console.log('📊 Real-time dashboard update:', data);

      // Type guard for data structure
      const message = data as { type?: string };

      // Invalidate relevant queries to trigger refetch with fresh data
      if (message.type === 'metrics_update') {
        queryClient.invalidateQueries({ queryKey: ['live-metrics'] });
      } else if (message.type === 'activity_update') {
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      } else if (message.type === 'upload_update') {
        queryClient.invalidateQueries({ queryKey: ['recent-uploads'] });
      } else {
        // General update - refresh dashboard data
        queryClient.invalidateQueries({ queryKey: ['realtime-dashboard'] });
      }

      setLastUpdate(new Date());
    },
    onError: error => {
      console.error('WebSocket error:', error);
    },
    onOpen: () => {
      console.log('✅ Dashboard WebSocket connected');
    },
    onClose: () => {
      console.log('🔌 Dashboard WebSocket disconnected');
    },
  });

  // Real-time stats
  const { data: stats } = useQuery({
    queryKey: ['realtime-dashboard'],
    queryFn: () => realtimeAnalyticsAPI.getDashboard().then(res => res.data),
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Live metrics
  const { data: liveMetrics } = useQuery({
    queryKey: ['live-metrics'],
    queryFn: () => realtimeAnalyticsAPI.getLiveMetrics().then(res => res.data),
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => realtimeAnalyticsAPI.getActivity({ limit: 10 }).then(res => res.data),
    refetchInterval: 15000, // Update every 15 seconds
  });

  // Recent uploads
  const { data: recentUploads } = useQuery({
    queryKey: ['recent-uploads'],
    queryFn: () =>
      uploadsAPI
        .search({ limit: 5 })
        .then((res: ApiResponse<{ results: UploadResult[] }>) => res.data),
    refetchInterval: 15000, // Update every 15 seconds
  });

  // Notifications
  const { data: notifications } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: () =>
      notificationsAPI
        .getAll()
        .then((res: ApiResponse<{ results: NotificationResult[] }>) => res.data),
    refetchInterval: 20000, // Update every 20 seconds
  });

  // Auto-refresh mechanism
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      queryClient.invalidateQueries({ queryKey: ['realtime-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    }, 30000); // Force refresh every 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  const realTimeStats: RealTimeStat[] = [
    {
      label: 'Active Users',
      value: liveMetrics?.active_users || stats?.active_users || 0,
      change: liveMetrics?.active_users_change || stats?.active_users_change || 0,
      changeType:
        (liveMetrics?.active_users_change || stats?.active_users_change || 0) > 0
          ? 'increase'
          : (liveMetrics?.active_users_change || stats?.active_users_change || 0) < 0
            ? 'decrease'
            : 'neutral',
      icon: <People />,
      color: 'primary',
    },
    {
      label: "Today's Uploads",
      value: liveMetrics?.todays_uploads || stats?.todays_uploads || 0,
      change: liveMetrics?.todays_uploads_change || stats?.todays_uploads_change || 0,
      changeType:
        (liveMetrics?.todays_uploads_change || stats?.todays_uploads_change || 0) > 0
          ? 'increase'
          : (liveMetrics?.todays_uploads_change || stats?.todays_uploads_change || 0) < 0
            ? 'decrease'
            : 'neutral',
      icon: <CloudUpload />,
      color: 'success',
    },
    {
      label: 'Pending Reviews',
      value: liveMetrics?.pending_reviews || stats?.pending_reviews || 0,
      change: liveMetrics?.pending_reviews_change || stats?.pending_reviews_change || 0,
      changeType:
        (liveMetrics?.pending_reviews_change || stats?.pending_reviews_change || 0) > 0
          ? 'increase'
          : (liveMetrics?.pending_reviews_change || stats?.pending_reviews_change || 0) < 0
            ? 'decrease'
            : 'neutral',
      icon: <Assignment />,
      color: 'warning',
    },
    {
      label: 'System Load',
      value: liveMetrics?.system_load || stats?.system_load || 0,
      change: liveMetrics?.system_load_change || stats?.system_load_change || 0,
      changeType:
        (liveMetrics?.system_load_change || stats?.system_load_change || 0) > 0
          ? 'increase'
          : (liveMetrics?.system_load_change || stats?.system_load_change || 0) < 0
            ? 'decrease'
            : 'neutral',
      icon: <Speed />,
      color:
        (liveMetrics?.system_load || stats?.system_load || 0) > 80
          ? 'error'
          : (liveMetrics?.system_load || stats?.system_load || 0) > 60
            ? 'warning'
            : 'success',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <CloudUpload />;
      case 'submission':
        return <Assignment />;
      case 'review':
        return <CheckCircle />;
      case 'user_activity':
        return <People />;
      default:
        return <Notifications />;
    }
  };

  const getActivityColor = (status: string): 'success' | 'warning' | 'error' | 'primary' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['realtime-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['live-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    queryClient.invalidateQueries({ queryKey: ['recent-uploads'] });
    queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
    setLastUpdate(new Date());
  };

  const combinedActivities: ActivityItem[] = [
    // Activities from the real-time activity API
    ...(recentActivities?.activities || []).map((activity: ActivityResult) => ({
      id: activity.id,
      type: activity.action_type as 'upload' | 'submission' | 'review' | 'user_activity',
      title: activity.action_description || `${activity.action_type} action`,
      subtitle: `by ${activity.user_name || 'Unknown User'}`,
      timestamp: activity.timestamp,
      status:
        activity.status === 'success'
          ? 'success'
          : activity.status === 'error'
            ? 'error'
            : ('info' as const),
      user: activity.user_name || 'Unknown',
    })),
    // File uploads
    ...(recentUploads?.results || []).map((upload: UploadResult) => ({
      id: upload.id,
      type: 'upload' as const,
      title: `File uploaded: ${upload.filename}`,
      subtitle: `by ${upload.user_name || 'Unknown User'}`,
      timestamp: upload.uploaded_at,
      status:
        upload.status === 'approved'
          ? 'success'
          : upload.status === 'rejected'
            ? 'error'
            : ('warning' as const),
      user: upload.user_name || 'Unknown',
    })),
    // Notifications
    ...(notifications?.results || []).map((notification: NotificationResult) => ({
      id: notification.id,
      type: 'user_activity' as const,
      title: notification.title,
      subtitle: notification.message,
      timestamp: notification.created_at,
      status:
        notification.type === 'error'
          ? 'error'
          : notification.type === 'warning'
            ? 'warning'
            : ('info' as const),
      user: 'System',
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Real-time Dashboard
            <Chip
              size="small"
              label={isConnected ? 'Live' : 'Offline'}
              color={isConnected ? 'success' : 'error'}
              sx={{ ml: 2 }}
            />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
            {wsError && (
              <Typography component="span" color="error" sx={{ ml: 1 }}>
                • {wsError}
              </Typography>
            )}
          </Typography>
        </Box>
        <Tooltip title="Refresh All Data">
          <IconButton onClick={refreshAll}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Real-time Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 3,
          mb: 4,
        }}
      >
        {realTimeStats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" color={`${stat.color}.main`}>
                    {stat.value.toLocaleString()}
                    {stat.label === 'System Load' && '%'}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {stat.changeType === 'increase' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : stat.changeType === 'decrease' ? (
                      <TrendingDown color="error" fontSize="small" />
                    ) : null}
                    <Typography
                      variant="body2"
                      color={
                        stat.changeType === 'increase'
                          ? 'success.main'
                          : stat.changeType === 'decrease'
                            ? 'error.main'
                            : 'text.secondary'
                      }
                      sx={{ ml: 0.5 }}
                    >
                      {stat.change > 0 ? '+' : ''}
                      {stat.change}
                      {stat.changeType !== 'neutral' && ' from yesterday'}
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: `${stat.color}.main`, width: 56, height: 56 }}>
                  {stat.icon}
                </Avatar>
              </Box>
              {stat.label === 'System Load' && (
                <LinearProgress
                  variant="determinate"
                  value={stat.value}
                  color={stat.color}
                  sx={{ mt: 2, height: 8, borderRadius: 4 }}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Recent Activities */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Activities</Typography>{' '}
              <Badge badgeContent={combinedActivities.length} color="primary">
                <Notifications />
              </Badge>
            </Box>
            <List>
              {combinedActivities.map(activity => (
                <ListItem key={activity.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${getActivityColor(activity.status)}.main` }}>
                      {getActivityIcon(activity.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{activity.title}</Typography>
                        <Chip
                          label={activity.status}
                          size="small"
                          color={getActivityColor(activity.status)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {activity.subtitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(activity.timestamp)} • {activity.user}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}{' '}
              {combinedActivities.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No recent activities"
                    secondary="Activities will appear here as they happen"
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>

        {/* Quick Alerts */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Alerts
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              {(liveMetrics?.system_load || stats?.system_load || 0) > 80 && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  p={2}
                  bgcolor="error.light"
                  borderRadius={1}
                >
                  <Warning color="error" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      High System Load
                    </Typography>
                    <Typography variant="caption">
                      Current load: {liveMetrics?.system_load || stats?.system_load || 0}%
                    </Typography>
                  </Box>
                </Box>
              )}
              {(liveMetrics?.pending_reviews || stats?.pending_reviews || 0) > 10 && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  p={2}
                  bgcolor="warning.light"
                  borderRadius={1}
                >
                  <Warning color="warning" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Many Pending Reviews
                    </Typography>
                    <Typography variant="caption">
                      {liveMetrics?.pending_reviews || stats?.pending_reviews || 0} items awaiting
                      review
                    </Typography>
                  </Box>
                </Box>
              )}
              {(liveMetrics?.active_users || stats?.active_users || 0) > 0 && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  p={2}
                  bgcolor="success.light"
                  borderRadius={1}
                >
                  <CheckCircle color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      System Operational
                    </Typography>
                    <Typography variant="caption">
                      {liveMetrics?.active_users || stats?.active_users || 0} active users online
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default RealTimeDashboard;
