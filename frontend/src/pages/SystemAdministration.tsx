import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Security,
  Storage,
  Speed,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Person,
} from '@mui/icons-material';
import { auditAPI, analyticsAPI } from '../services/api';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed';
}

interface SystemHealth {
  api_status: 'healthy' | 'degraded' | 'down';
  database_status: 'healthy' | 'degraded' | 'down';
  storage_usage: number;
  memory_usage: number;
  cpu_usage: number;
  active_users: number;
  response_time: number;
}

export const SystemAdministration: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch system health
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['audit', 'system-health'],
    queryFn: () => auditAPI.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['audit', 'logs'],
    queryFn: () => auditAPI.getAuditLogs(),
  });

  // Fetch security events
  const { data: securityEvents, isLoading: securityLoading } = useQuery({
    queryKey: ['audit', 'security-events'],
    queryFn: () => auditAPI.getSecurityEvents(),
  });

  // Fetch analytics summary
  const { data: analytics } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  const health: SystemHealth = systemHealth?.data || {};
  const logs: AuditLog[] = auditLogs?.data || [];
  const security: AuditLog[] = securityEvents?.data || [];
  const stats = analytics?.data || {};

  const getHealthColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'down':
        return <ErrorIcon color="error" />;
      default:
        return <Info />;
    }
  };

  const getUsageColor = (usage: number): 'success' | 'warning' | 'error' => {
    if (usage < 60) return 'success';
    if (usage < 80) return 'warning';
    return 'error';
  };

  const SystemHealthTab = () => (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
        {/* System Status Cards */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">API Status</Typography>
              {getHealthIcon(health.api_status)}
            </Box>
            <Chip
              label={health.api_status?.toUpperCase() || 'UNKNOWN'}
              color={getHealthColor(health.api_status)}
              size="small"
            />
            {health.response_time && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Response Time: {health.response_time}ms
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Database</Typography>
              {getHealthIcon(health.database_status)}
            </Box>
            <Chip
              label={health.database_status?.toUpperCase() || 'UNKNOWN'}
              color={getHealthColor(health.database_status)}
              size="small"
            />
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Active Users</Typography>
              <Person color="primary" />
            </Box>
            <Typography variant="h4" color="primary.main">
              {health.active_users || stats.totalUsers || 0}
            </Typography>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Storage Usage</Typography>
              <Storage />
            </Box>
            <LinearProgress
              variant="determinate"
              value={health.storage_usage || 0}
              color={getUsageColor(health.storage_usage || 0)}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {health.storage_usage || 0}% used
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Memory Usage</Typography>
              <Speed />
            </Box>
            <LinearProgress
              variant="determinate"
              value={health.memory_usage || 0}
              color={getUsageColor(health.memory_usage || 0)}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {health.memory_usage || 0}% used
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">CPU Usage</Typography>
              <Speed />
            </Box>
            <LinearProgress
              variant="determinate"
              value={health.cpu_usage || 0}
              color={getUsageColor(health.cpu_usage || 0)}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {health.cpu_usage || 0}% used
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const AuditLogsTab = () => (
    <Box sx={{ mt: 3 }}>
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Audit Logs
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(log => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.user_id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        color={log.status === 'success' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{log.ip_address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={logs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );

  const SecurityTab = () => (
    <Box sx={{ mt: 3 }}>
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Security Events
          </Typography>
          {security.length === 0 ? (
            <Alert severity="info">No security events found</Alert>
          ) : (
            <List>
              {security.map(event => (
                <ListItem key={event.id}>
                  <ListItemIcon>
                    <Security color={event.status === 'success' ? 'success' : 'error'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${event.action} - ${event.resource}`}
                    secondary={`${new Date(event.timestamp).toLocaleString()} | IP: ${event.ip_address}`}
                  />
                  <Chip
                    label={event.status}
                    color={event.status === 'success' ? 'success' : 'error'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  if (healthLoading || logsLoading || securityLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          System Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor system health, audit logs, and security events
        </Typography>
      </Box>

      <Paper elevation={1}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="System Health" />
          <Tab label="Audit Logs" />
          <Tab label="Security Events" />
        </Tabs>

        {tabValue === 0 && <SystemHealthTab />}
        {tabValue === 1 && <AuditLogsTab />}
        {tabValue === 2 && <SecurityTab />}
      </Paper>
    </Container>
  );
};
