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
  TrendingUp,
  AssessmentOutlined,
  FileDownload,
  Timeline,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  BarChart,
  PieChart,
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
  trend?: number;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend, subtitle }) => (
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
          {trend && (
            <Box display="flex" alignItems="center" mt={0.5}>
              <TrendingUp fontSize="small" color={trend > 0 ? 'success' : 'error'} />
              <Typography
                variant="caption"
                color={trend > 0 ? 'success.main' : 'error.main'}
                sx={{ ml: 0.5 }}
              >
                {trend > 0 ? '+' : ''}
                {trend}%
              </Typography>
            </Box>
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

export const AuditorDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Fetch auditor-specific metrics
  const { data: auditorMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics', 'auditor-metrics'],
    queryFn: () => analyticsAPI.getAuditorMetrics(),
  });

  // Fetch score trends
  const { isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'score-trends'],
    queryFn: () => analyticsAPI.getScoreTrends(),
  });

  // Fetch AI results for compliance scoring
  const { data: aiResults, isLoading: aiLoading } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'compliance'],
    queryFn: () => aiAPI.getResults({ limit: 20 }),
  });

  // Fetch recent submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery<{ data: Submission[] }>({
    queryKey: ['submissions', 'recent'],
    queryFn: () => submissionsAPI.getAll(),
  });

  if (metricsLoading || trendsLoading || aiLoading || submissionsLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const aiResultsData = aiResults?.data?.results || [];
  const submissionsData = submissions?.data || [];
  const metrics = auditorMetrics?.data || {};

  // Use real metrics from backend
  const overallScore = metrics.overallScore || 0;
  const passedAudits = metrics.passedAudits || 0;
  const failedAudits = metrics.failedAudits || 0;
  const pendingReviews = metrics.pendingReviews || 0;
  const avgProcessingTime = metrics.avgProcessingTime || 0;
  const esgCategories = metrics.esgCategories || [];

  // Calculate warning audits (scores between 0.5 and 0.7)
  const warningAudits = aiResultsData.filter((result: AIResult) => {
    const score = result.overall_score || 0;
    return score >= 0.5 && score < 0.7;
  }).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Auditor Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ESG compliance monitoring and audit analytics
        </Typography>
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
          value={`${Math.round(overallScore * 100)}%`}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Passed Audits"
          value={passedAudits}
          icon={<CheckCircle fontSize="large" />}
          color="success"
          subtitle="Score ≥ 70%"
        />
        <StatsCard
          title="Failed Audits"
          value={failedAudits}
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
            {esgCategories.map((item: any) => (
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
                    {aiResultsData.slice(0, 6).map((result: AIResult) => {
                      const score = (result.overall_score || 0) * 100;
                      const status = score >= 70 ? 'Pass' : score >= 50 ? 'Warning' : 'Fail';
                      const statusColor =
                        score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error';

                      return (
                        <TableRow key={result.id}>
                          <TableCell>
                            <Typography variant="body2">
                              Upload ID: {result.file_upload_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
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
        {/* Compliance Trends */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Activity Overview
            </Typography>
            {submissionsData.length === 0 ? (
              <Alert severity="info">No submission data available</Alert>
            ) : (
              <List>
                {submissionsData.slice(0, 8).map((submission: Submission, index: number) => (
                  <React.Fragment key={submission.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Assignment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Checklist ID: ${submission.checklist_id}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              User ID: {submission.user_id}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Submitted:{' '}
                              {submission.submitted_at
                                ? new Date(submission.submitted_at).toLocaleDateString()
                                : 'N/A'}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={submission.status}
                        color={
                          submission.status === 'approved'
                            ? 'success'
                            : submission.status === 'rejected'
                              ? 'error'
                              : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                    {index < submissionsData.length - 1 && (
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

        {/* System Performance */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Audit Statistics
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Total Audits</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {aiResultsData.length}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Pass Rate</Typography>
                <Typography variant="body2" fontWeight={500} color="success.main">
                  {aiResultsData.length > 0
                    ? Math.round((passedAudits / aiResultsData.length) * 100)
                    : 0}
                  %
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Avg Processing Time</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {avgProcessingTime > 0 ? `${avgProcessingTime} min` : 'N/A'}
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
