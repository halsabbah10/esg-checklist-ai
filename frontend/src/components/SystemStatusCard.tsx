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

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold?: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: string;
  version: string;
  last_check: string;
  metrics: {
    cpu_usage: SystemMetric;
    memory_usage: SystemMetric;
    disk_usage: SystemMetric;
    database_connections: SystemMetric;
    api_response_time: SystemMetric;
  };
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    last_check: string;
  }>;
}

export const SystemStatusCard: React.FC = () => {
  const { data: systemHealth, isLoading, error, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => auditAPI.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (response) => response.data as SystemHealth,
  });

  const getStatusColor = (status: string) => {
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
        return 'default';
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

  const formatUptime = (uptime: string) => {
    // Assume uptime is in seconds
    const seconds = parseInt(uptime);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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
          <Alert severity="error">
            Failed to load system status. Please try again.
          </Alert>
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
              color={getStatusColor(systemHealth.status) as any}
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
            <Typography variant="h6">
              {formatUptime(systemHealth.uptime)}
            </Typography>
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
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={2} mb={3}>
          {Object.entries(systemHealth.metrics).map(([key, metric]) => (
            <Box key={key}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {metric.name}
                </Typography>
                <Chip
                  label={metric.status}
                  color={getStatusColor(metric.status) as any}
                  size="small"
                />
              </Box>
              <Typography variant="h6">
                {metric.value}
                {metric.unit}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metric.value}
                color={getStatusColor(metric.status) as any}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </Box>
          ))}
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Services
        </Typography>
        <List dense>
          {systemHealth.services.map((service) => (
            <ListItem key={service.name}>
              <ListItemIcon>
                {service.name.includes('database') ? (
                  <Storage />
                ) : service.name.includes('api') ? (
                  <NetworkCheck />
                ) : (
                  <Speed />
                )}
              </ListItemIcon>
              <ListItemText
                primary={service.name}
                secondary={`Last check: ${new Date(service.last_check).toLocaleString()}`}
              />
              <Chip
                icon={getStatusIcon(service.status)}
                label={service.status.toUpperCase()}
                color={getStatusColor(service.status) as any}
                size="small"
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default SystemStatusCard;
