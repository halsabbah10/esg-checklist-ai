import React from 'react';
import { Box, Typography, Card, CardContent, Paper } from '@mui/material';
import {
  Assignment as ChecklistIcon,
  Upload as UploadIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextNew';
import { AdminDashboard, ReviewerDashboard, AuditorDashboard } from '../components/dashboards';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user has a specific role, show role-based dashboard
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'reviewer') {
    return <ReviewerDashboard />;
  }

  if (user?.role === 'auditor') {
    return <AuditorDashboard />;
  }

  // Default dashboard for users without specific roles or as fallback
  const quickActions = [
    {
      title: 'Upload Document',
      description: 'Upload ESG documents for AI analysis',
      icon: <UploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => navigate('/checklists/1/upload'), // Default to checklist 1
    },
    {
      title: 'View Checklists',
      description: 'Manage ESG compliance checklists',
      icon: <ChecklistIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => navigate('/checklists'),
    },
    {
      title: 'Analytics',
      description: 'View compliance analytics and reports',
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => navigate('/analytics'),
    },
  ];

  return (
    <Box>
      {/* Welcome Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom color="primary">
          Welcome to ESG Checklist AI
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Hello, {user?.email} ({user?.role})
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Streamline your ESG compliance with AI-powered document analysis
        </Typography>
      </Paper>

      {/* Quick Actions */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Quick Actions
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {quickActions.map((action, index) => (
          <Card
            key={index}
            elevation={2}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme => theme.shadows[8],
              },
            }}
            onClick={action.action}
          >
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
              <Box sx={{ mb: 2 }}>{action.icon}</Box>
              <Typography variant="h6" gutterBottom>
                {action.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {action.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Stats Section */}
      <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3 }}>
        System Overview
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
        }}
      >
        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
              12
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Checklists
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
              48
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Documents Analyzed
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
              92%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Compliance Score
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
              24
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Reviews
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Activity */}
      <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3 }}>
        Recent Activity
      </Typography>

      <Card elevation={1}>
        <CardContent>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Activity feed coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
