import React, { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  AssessmentOutlined,
  FileDownload,
  Timeline,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  BarChart,
  PieChart,
  Refresh,
} from '@mui/icons-material';
import { analyticsAPI } from '../../services/api';

interface DashboardData {
  metrics: {
    overallScore: number;
    passedAudits: number;
    failedAudits: number;
    pendingReviews: number;
    avgProcessingTime: number;
    esgCategories: Array<{ category: string; score: number }>;
  };
  aiResults: Array<{
    id: number;
    overall_score: number;
    file_upload_id?: number;
    created_at?: string;
  }>;
  uploads: Array<{
    id: number;
    filename: string;
    uploaded_at?: string;
    status: string;
  }>;
  totalAiResults: number;
  totalUploads: number;
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={2}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={600} color={`${color}.main`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box color={`${color}.main`}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

interface ComplianceScoreProps {
  category: string;
  score: number;
  maxScore?: number;
}

const ComplianceScore: React.FC<ComplianceScoreProps> = ({ category, score, maxScore = 100 }) => {
  const percentage = (score / maxScore) * 100;
  const getColor = () => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" fontWeight={500}>
          {category}
        </Typography>
        <Typography variant="body2" color={`${getColor()}.main`}>
          {score.toFixed(1)}/{maxScore}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={getColor()}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

export const OptimizedAuditorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Optimized: Single API call for all dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    refetch,
    error 
  } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard-data', 'auditor'],
    queryFn: () => analyticsAPI.getDashboardData(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>Loading Dashboard...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load dashboard data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  const data = dashboardData?.data || {
    metrics: {
      overallScore: 0,
      passedAudits: 0,
      failedAudits: 0,
      pendingReviews: 0,
      avgProcessingTime: 0,
      esgCategories: []
    },
    aiResults: [],
    uploads: [],
    totalAiResults: 0,
    totalUploads: 0
  };

  const { metrics, aiResults, uploads } = data;

  // Calculate warning audits (scores between 0.5 and 0.7)
  const warningAudits = aiResults.filter((result) => {
    const score = result.overall_score || 0;
    return score >= 0.5 && score < 0.7;
  }).length;

  // Manual refresh function
  const handleRefresh = async () => {
    await refetch();
    setLastRefresh(new Date());
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            Auditor Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ESG compliance monitoring and audit analytics
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Key Metrics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatsCard
          title="Overall Compliance"
          value={`${Math.round(metrics.overallScore * 100)}%`}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Passed Audits"
          value={metrics.passedAudits}
          icon={<CheckCircle fontSize="large" />}
          color="success"
          subtitle="Score ≥ 70%"
        />
        <StatsCard
          title="Failed Audits"
          value={metrics.failedAudits}
          icon={<ErrorIcon fontSize="large" />}
          color="error"
          subtitle="Score < 50%"
        />
        <StatsCard
          title="Warnings"
          value={warningAudits}
          icon={<Warning fontSize="large" />}
          color="warning"
          subtitle="Score 50-69%"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* ESG Compliance Scores */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ESG Compliance Scores
            </Typography>
            {metrics.esgCategories.map((item) => (
              <ComplianceScore key={item.category} category={item.category} score={item.score} />
            ))}
          </CardContent>
        </Card>

        {/* Recent Audit Results */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Audit Results
            </Typography>
            {aiResults.length === 0 ? (
              <Alert severity="info">No audit results available</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File Upload</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aiResults.slice(0, 5).map((result) => {
                      const score = (result.overall_score || 0) * 100;
                      const status = score >= 70 ? 'Pass' : score >= 50 ? 'Warning' : 'Fail';
                      const statusColor =
                        score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error';

                      return (
                        <TableRow key={result.id}>
                          <TableCell>
                            <Typography variant="body2">
                              Upload ID: {result.file_upload_id || result.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} color={statusColor === 'success' ? 'success.main' : statusColor === 'error' ? 'error.main' : 'warning.main'}>
                              {score.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={status} color={statusColor} size="small" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mt: 3 }}
      >
        {/* Recent Activity */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Upload Activity
            </Typography>
            {uploads.length === 0 ? (
              <Alert severity="info">No upload data available</Alert>
            ) : (
              <List>
                {uploads.slice(0, 6).map((upload, index) => (
                  <React.Fragment key={upload.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Assignment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={upload.filename}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Upload ID: {upload.id}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Uploaded: {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={upload.status}
                        color={
                          upload.status === 'approved'
                            ? 'success'
                            : upload.status === 'rejected'
                              ? 'error'
                              : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                    {index < uploads.length - 1 && (
                      <Box
                        component="hr"
                        sx={{ border: 'none', borderTop: 1, borderColor: 'divider', my: 1 }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Audit Statistics */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Audit Statistics
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Total Audits</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {data.totalAiResults}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Pass Rate</Typography>
                <Typography variant="body2" fontWeight={500} color="success.main">
                  {data.totalAiResults > 0
                    ? Math.round((metrics.passedAudits / data.totalAiResults) * 100)
                    : 0}
                  %
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Avg Processing Time</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {metrics.avgProcessingTime > 0 ? `${metrics.avgProcessingTime} min` : 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Button variant="outlined" fullWidth sx={{ mt: 2 }} startIcon={<FileDownload />}>
              Export Audit Report
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions */}
      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<FileDownload />}
            onClick={() => navigate('/analytics/reports')}
          >
            Generate Report
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<BarChart />}
            onClick={() => navigate('/analytics')}
          >
            View Analytics
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Timeline />}
            onClick={() => navigate('/analytics/advanced')}
          >
            Trend Analysis
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<PieChart />}
            onClick={() => navigate('/analytics/advanced')}
          >
            Category Breakdown
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};