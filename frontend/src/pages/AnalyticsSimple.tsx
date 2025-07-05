import React from 'react';
import { Container, Typography, Box, Card, CardContent, Alert, Button } from '@mui/material';
import { Analytics as AnalyticsIcon, TrendingUp, Assessment, BarChart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const AnalyticsSimple: React.FC = () => {
  const navigate = useNavigate();

  const analyticsFeatures = [
    {
      title: 'Score Trends',
      description: 'Track compliance scores over time',
      icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => console.log('Score trends clicked'),
    },
    {
      title: 'Category Breakdown',
      description: 'Analyze performance by ESG categories',
      icon: <BarChart sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => console.log('Category breakdown clicked'),
    },
    {
      title: 'User Performance',
      description: 'Compare user and team performance',
      icon: <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => console.log('User performance clicked'),
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AnalyticsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom color="primary">
            Analytics Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Comprehensive ESG compliance analytics and insights
          </Typography>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body1">
            Analytics features are being enhanced. Sample data and visualizations will be available
            soon.
          </Typography>
        </Alert>

        {/* Analytics Features Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3,
            mb: 4,
          }}
        >
          {analyticsFeatures.map((feature, index) => (
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
              onClick={feature.action}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Sample Statistics */}
        <Typography variant="h4" sx={{ mt: 6, mb: 3 }} color="primary">
          Quick Stats Overview
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
                87%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Compliance Score
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                156
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documents Analyzed
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                23
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Checklists
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                +12%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score Improvement
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button variant="contained" size="large" onClick={() => navigate('/reports')}>
            View Reports
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
