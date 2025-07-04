import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Upload,
  Assignment,
  CheckCircle,
  Cancel,
  Visibility,
  Comment,
  Edit,
  Delete,
  Person,
  Refresh,
  MoreVert,
} from '@mui/icons-material';
import { auditAPI } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';

interface ActivityEvent {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  timestamp: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

interface UserActivityFeedProps {
  userId?: string;
  limit?: number;
  showUserInfo?: boolean;
}

export const UserActivityFeed: React.FC<UserActivityFeedProps> = ({
  userId,
  limit = 10,
  showUserInfo = true,
}) => {
  const { data: activities, isLoading, error, refetch } = useQuery({
    queryKey: ['auditLogs', { userId, limit }],
    queryFn: () => auditAPI.getAuditLogs({ user_id: userId, limit }),
    refetchInterval: 60000, // Refresh every minute
    select: (response) => response.data.results as ActivityEvent[],
  });

  const getActionIcon = (action: string, resourceType: string) => {
    switch (action) {
      case 'create':
        if (resourceType === 'upload') return <Upload color="primary" />;
        if (resourceType === 'checklist') return <Assignment color="primary" />;
        if (resourceType === 'user') return <Person color="primary" />;
        return <Edit color="primary" />;
      case 'update':
      case 'edit':
        return <Edit color="warning" />;
      case 'delete':
        return <Delete color="error" />;
      case 'approve':
        return <CheckCircle color="success" />;
      case 'reject':
        return <Cancel color="error" />;
      case 'view':
        return <Visibility color="info" />;
      case 'comment':
        return <Comment color="primary" />;
      default:
        return <MoreVert color="action" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'primary';
      case 'update':
      case 'edit':
        return 'warning';
      case 'delete':
        return 'error';
      case 'approve':
        return 'success';
      case 'reject':
        return 'error';
      case 'view':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatAction = (activity: ActivityEvent) => {
    const { action, resource_type, resource_name } = activity;
    const resourceDisplay = resource_name || `${resource_type} #${activity.resource_id}`;
    
    switch (action) {
      case 'create':
        return `created ${resource_type} "${resourceDisplay}"`;
      case 'update':
      case 'edit':
        return `updated ${resource_type} "${resourceDisplay}"`;
      case 'delete':
        return `deleted ${resource_type} "${resourceDisplay}"`;
      case 'approve':
        return `approved ${resource_type} "${resourceDisplay}"`;
      case 'reject':
        return `rejected ${resource_type} "${resourceDisplay}"`;
      case 'view':
        return `viewed ${resource_type} "${resourceDisplay}"`;
      case 'comment':
        return `commented on ${resource_type} "${resourceDisplay}"`;
      default:
        return `performed ${action} on ${resource_type} "${resourceDisplay}"`;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <LoadingSpinner message="Loading activity feed..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Failed to load activity feed</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {userId ? 'User Activity' : 'Recent Activity'}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {activities && activities.length > 0 ? (
          <List>
            {activities.map((activity) => (
              <ListItem key={activity.id} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'grey.100' }}>
                    {getActionIcon(activity.action, activity.resource_type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {showUserInfo && (
                        <Typography variant="body2" fontWeight="bold">
                          {activity.user_name}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        {formatAction(activity)}
                      </Typography>
                      <Chip
                        label={activity.action}
                        size="small"
                        color={getActionColor(activity.action) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(activity.timestamp)}
                      </Typography>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {Object.entries(activity.details)
                            .slice(0, 2)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No recent activity found
          </Typography>
        )}

        {activities && activities.length >= limit && (
          <Box textAlign="center" mt={2}>
            <Button variant="outlined" size="small">
              View More
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UserActivityFeed;
