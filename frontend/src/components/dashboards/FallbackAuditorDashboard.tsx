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
  CheckCircle,
  FileDownload,
  Timeline,
  Warning,
  Error as ErrorIcon,
  BarChart,
  PieChart,
  Refresh,
} from '@mui/icons-material';
import { analyticsAPI, aiAPI, submissionsAPI } from '../../services/api';

interface AIResult {
  id: number;
  checklist_id: number;
  overall_score: number;
  analysis: string;
  created_at: string;
  updated_at: string;
  status: string;
  upload_id?: number;
  filename?: string;
  file_upload_id?: number;
}

interface Submission {
  id: number;
  checklist_id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  created_at: string;
  updated_at: string;
  filename?: string;
  ai_score?: number;
  submitted_at?: string;
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

export const FallbackAuditorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Fallback: Try optimized endpoint first, then fall back to individual endpoints
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard-data', 'auditor'],
    queryFn: () => analyticsAPI.getDashboardData(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once before falling back
  });

  // Fallback queries - only run if optimized endpoint fails
  const { data: auditorMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['analytics', 'auditor-metrics'],
    queryFn: () => analyticsAPI.getAuditorMetrics(),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!dashboardError, // Only run if dashboard endpoint failed
  });

  const { data: aiResults, isLoading: aiLoading, refetch: refetchAIResults } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'compliance'],
    queryFn: () => aiAPI.getResults({ limit: 8 }),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!dashboardError, // Only run if dashboard endpoint failed
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<{ data: Submission[] }>({
    queryKey: ['submissions', 'recent'],
    queryFn: () => submissionsAPI.getAll(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!dashboardError, // Only run if dashboard endpoint failed
  });

  // Determine loading state
  const isLoading = Boolean(dashboardLoading || (dashboardError && (metricsLoading || aiLoading || submissionsLoading)));

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>Loading Dashboard...</Typography>
            {dashboardError && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Using fallback loading...
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    );
  }

  // Handle data from either optimized or fallback endpoints
  let metrics, aiResultsData;

  if (dashboardData && !dashboardError) {
    // Use optimized endpoint data
    const data = dashboardData.data;
    metrics = data.metrics;
    aiResultsData = data.aiResults || [];
  } else {
    // Use fallback endpoint data
    const auditorData = auditorMetrics?.data || {};
    const aiData = aiResults?.data?.results || [];
    
    metrics = {
      overallScore: auditorData.overallScore || 0,
      passedAudits: auditorData.passedAudits || 0,
      failedAudits: auditorData.failedAudits || 0,
      pendingReviews: auditorData.pendingReviews || 0,
      avgProcessingTime: auditorData.avgProcessingTime || 0,
      esgCategories: auditorData.esgCategories || []
    };
    aiResultsData = aiData;
  }

  // Show error if both optimized and fallback failed
  if (dashboardError && (!auditorMetrics && !aiResults && !submissions)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load dashboard data. Please try refreshing the page.
          {dashboardError?.message && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Error: {dashboardError.message}
            </Typography>
          )}
        </Alert>
      </Container>
    );
  }

  // Calculate warning audits
  const warningAudits = aiResultsData.filter((result: any) => {
    const score = result.overall_score || result.score || 0;
    return score >= 0.5 && score < 0.7;
  }).length;

  // Calculate completeness metrics
  const completeAudits = aiResultsData.filter((result: any) => {
    const completeness = result.metadata?.checklist_completeness;
    return completeness && completeness.completion_rate >= 0.95;
  }).length;

  const incompleteAudits = aiResultsData.filter((result: any) => {
    const completeness = result.metadata?.checklist_completeness;
    return completeness && completeness.completion_rate >= 0.5 && completeness.completion_rate < 0.95;
  }).length;

  const averageCompleteness = aiResultsData.length > 0 
    ? aiResultsData.reduce((sum: number, result: any) => {
        const completeness = result.metadata?.checklist_completeness;
        return sum + (completeness?.completion_rate || 0);
      }, 0) / aiResultsData.length
    : 0;

  // Manual refresh function
  const handleRefresh = async () => {
    if (dashboardError) {
      await Promise.all([
        refetchMetrics(),
        refetchAIResults(),
      ]);
    } else {
      // Refresh optimized endpoint (would need to add refetch to that query)
    }
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
            {dashboardError && " (fallback mode)"}
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

      {/* Show warning if using fallback */}
      {dashboardError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Using fallback data loading. Some features may be limited.
        </Alert>
      )}

      {/* Key Metrics - Compliance */}
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
        Compliance Metrics
      </Typography>
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
          value={`${Math.round((metrics.overallScore || 0) * 100)}%`}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Passed Audits"
          value={metrics.passedAudits || 0}
          icon={<CheckCircle fontSize="large" />}
          color="success"
          subtitle="Score ≥ 70%"
        />
        <StatsCard
          title="Failed Audits"
          value={metrics.failedAudits || 0}
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

      {/* Key Metrics - Completeness */}
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
        Completeness Metrics
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3,
          mb: 4,
        }}
      >
        <StatsCard
          title="Overall Completeness"
          value={`${Math.round(averageCompleteness * 100)}%`}
          icon={<Assignment fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Complete Audits"
          value={completeAudits}
          icon={<CheckCircle fontSize="large" />}
          color="success"
          subtitle="Rate ≥ 95%"
        />
        <StatsCard
          title="Incomplete Audits"
          value={incompleteAudits}
          icon={<Warning fontSize="large" />}
          color="warning"
          subtitle="Rate 50-94%"
        />
        <StatsCard
          title="Missing Data"
          value={aiResultsData.length - completeAudits - incompleteAudits}
          icon={<ErrorIcon fontSize="large" />}
          color="error"
          subtitle="Rate < 50%"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* ESG Compliance Scores */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ESG Compliance Scores
            </Typography>
            {metrics.esgCategories && metrics.esgCategories.length > 0 ? (
              metrics.esgCategories.map((item: any) => (
                <ComplianceScore key={item.category} category={item.category} score={item.score} />
              ))
            ) : (
              <Alert severity="info">No ESG category data available</Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Results */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Audit Results
            </Typography>
            {aiResultsData.length === 0 ? (
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
                    {aiResultsData.slice(0, 5).map((result: any) => {
                      const score = ((result.overall_score || result.score || 0) * 100);
                      const status = score >= 70 ? 'Pass' : score >= 50 ? 'Warning' : 'Fail';
                      const statusColor = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error';

                      return (
                        <TableRow key={result.id}>
                          <TableCell>
                            <Typography variant="body2">
                              Upload ID: {result.file_upload_id || result.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontWeight={500} 
                              color={statusColor === 'success' ? 'success.main' : statusColor === 'error' ? 'error.main' : 'warning.main'}
                            >
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