import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
} from '@mui/material';
import {
  People,
  Assignment,
  CloudUpload,
  Assessment,
  TrendingUp,
  Settings,
  Security,
} from '@mui/icons-material';
import { analyticsAPI, uploadsAPI, searchAPI } from '../../services/api';
import { SystemStatusCard } from '../SystemStatusCard';
import { UserActivityFeed } from '../UserActivityFeed';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => (
  <Card elevation={2}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={600} color={`${color}.main`}>
            {value.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {trend && (
            <Box display="flex" alignItems="center" mt={0.5}>
              <TrendingUp 
                fontSize="small" 
                color={trend > 0 ? 'success' : 'error'} 
              />
              <Typography 
                variant="caption" 
                color={trend > 0 ? 'success.main' : 'error.main'}
                sx={{ ml: 0.5 }}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box color={`${color}.main`}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Re-enable analytics query - test 1
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'admin'],
    queryFn: () => analyticsAPI.getSummary(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Re-enable uploads query - test 2
  const { data: recentUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['uploads', 'recent'],
    queryFn: () => uploadsAPI.search({ limit: 5 }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Re-enable checklist stats query - test 3
  const { isLoading: checklistLoading } = useQuery({
    queryKey: ['checklists', 'stats'],
    queryFn: () => searchAPI.checklists({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (analyticsLoading || uploadsLoading || checklistLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const stats = analytics?.data || {};
  const uploads = recentUploads?.data?.results || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Administrator Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive system overview and management console
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <StatsCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={<People fontSize="large" />}
          color="primary"
          trend={5}
        />
        <StatsCard
          title="Active Checklists"
          value={stats.totalChecklists || 0}
          icon={<Assignment fontSize="large" />}
          color="secondary"
          trend={2}
        />
        <StatsCard
          title="Files Uploaded"
          value={stats.totalUploads || 0}
          icon={<CloudUpload fontSize="large" />}
          color="success"
          trend={12}
        />
        <StatsCard
          title="Avg AI Score"
          value={Math.round((stats.averageScore || 0) * 100)}
          icon={<Assessment fontSize="large" />}
          color="warning"
          trend={-1}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 4 }}>
        {/* User Activity Feed */}
        <UserActivityFeed limit={5} showUserInfo={true} />

        {/* System Health */}
        <SystemStatusCard />
      </Box>

      {/* Recent File Uploads */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent File Uploads & AI Analysis
          </Typography>
          {uploads.length === 0 ? (
            <Alert severity="info">No recent uploads found</Alert>
          ) : (
            <List>
              {uploads.map((upload: any, index: number) => (
                <React.Fragment key={upload.id}>
                  <ListItem>
                    <ListItemIcon>
                      <CloudUpload color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={upload.filename}
                      secondary={`User ID: ${upload.user_id} • ${new Date(upload.uploaded_at).toLocaleString()}`}
                    />
                    <Chip
                      label={upload.status}
                      color={
                        upload.status === 'approved' ? 'success' :
                        upload.status === 'rejected' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  </ListItem>
                  {index < uploads.length - 1 && <Box component="hr" sx={{ border: 'none', borderTop: 1, borderColor: 'divider', my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<People />}
            onClick={() => navigate('/admin/users')}
          >
            Manage Users
          </Button>
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<Assignment />}
            onClick={() => navigate('/admin/checklists')}
          >
            Manage Checklists
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Assessment />}
            onClick={() => navigate('/analytics')}
          >
            Basic Analytics
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<TrendingUp />}
            onClick={() => navigate('/analytics/advanced')}
          >
            Advanced Analytics
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Security />}
            onClick={() => navigate('/admin/system')}
          >
            System Admin
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Settings />}
            onClick={() => navigate('/settings')}
          >
            Settings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
