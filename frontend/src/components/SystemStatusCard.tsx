import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Info,
  Storage,
  Speed,
  NetworkCheck,
  Refresh,
} from '@mui/icons-material';
import { auditAPI } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  environment: string;
  api_version: string;
  uptime_seconds: number;
  checks: {
    database: string;
    api: string;
    ai_services: string;
    file_system: {
      uploads_directory: string;
      logs_directory: string;
    };
  };
  metrics: {
    cpu_percent: number;
    memory_percent: number;
    disk_usage_percent: number;
  };
}

export const SystemStatusCard: React.FC = () => {
  const {
    data: systemHealth,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => auditAPI.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
    select: response => response.data as SystemHealth,
  });

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'primary' => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'success';
      case 'warning':
      case 'degraded':
        return 'warning';
      case 'critical':
      case 'down':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <CheckCircle color="success" />;
      case 'warning':
      case 'degraded':
        return <Warning color="warning" />;
      case 'critical':
      case 'down':
        return <Error color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const formatUptime = (uptimeSeconds: number) => {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getMetricStatus = (value: number, type: string) => {
    if (type.includes('cpu') || type.includes('memory')) {
      if (value > 90) return 'critical';
      if (value > 70) return 'warning';
      return 'healthy';
    }
    if (type.includes('disk')) {
      if (value > 95) return 'critical';
      if (value > 85) return 'warning';
      return 'healthy';
    }
    return 'healthy';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <LoadingSpinner message="Loading system status..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">Failed to load system status. Please try again.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!systemHealth) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">System Status</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={getStatusIcon(systemHealth.status)}
              label={systemHealth.status.toUpperCase()}
              color={getStatusColor(systemHealth.status)}
              size="small"
            />
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()} size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} mb={3}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Uptime
            </Typography>
            <Typography variant="h6">{formatUptime(systemHealth.uptime_seconds)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Version
            </Typography>
            <Typography variant="h6">{systemHealth.version}</Typography>
          </Box>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          System Metrics
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
          gap={2}
          mb={3}
        >
          {Object.entries(systemHealth.metrics).map(([key, value]) => {
            const status = getMetricStatus(value, key);
            const displayName = key
              .replace(/_/g, ' ')
              .replace(/percent/g, '')
              .trim();
            return (
              <Box key={key}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {displayName.charAt(0).toUpperCase() + displayName.slice(1)}
                  </Typography>
                  <Chip label={status} color={getStatusColor(status)} size="small" />
                </Box>
                <Typography variant="h6">{value.toFixed(1)}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={value}
                  color={getStatusColor(status)}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </Box>
            );
          })}
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Service Checks
        </Typography>
        <List dense>
          {Object.entries(systemHealth.checks).map(([key, value]) => {
            if (typeof value === 'object') {
              // Handle file_system which is nested
              return Object.entries(value).map(([subKey, subValue]) => (
                <ListItem key={`${key}.${subKey}`}>
                  <ListItemIcon>
                    <Storage />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${key.replace(/_/g, ' ')} - ${subKey.replace(/_/g, ' ')}`}
                    secondary={`Status: ${subValue}`}
                  />
                  <Chip
                    icon={getStatusIcon(subValue)}
                    label={subValue.toUpperCase()}
                    color={getStatusColor(subValue)}
                    size="small"
                  />
                </ListItem>
              ));
            } else {
              return (
                <ListItem key={key}>
                  <ListItemIcon>
                    {key.includes('database') ? (
                      <Storage />
                    ) : key.includes('api') ? (
                      <NetworkCheck />
                    ) : (
                      <Speed />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      key.replace(/_/g, ' ').charAt(0).toUpperCase() +
                      key.replace(/_/g, ' ').slice(1)
                    }
                    secondary={`Status: ${value}`}
                  />
                  <Chip
                    icon={getStatusIcon(value)}
                    label={value.toUpperCase()}
                    color={getStatusColor(value)}
                    size="small"
                  />
                </ListItem>
              );
            }
          })}
        </List>
      </CardContent>
    </Card>
  );
};

export default SystemStatusCard;
