import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  // Fetch auditor analytics
  const { isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'auditor'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  // Fetch score trends
  const { isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'score-trends'],
    queryFn: () => analyticsAPI.getScoreTrends(),
  });

  // Fetch AI results for compliance scoring
  const { data: aiResults, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-results', 'compliance'],
    queryFn: () => aiAPI.getResults({ limit: 20 }),
  });

  // Fetch recent submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['submissions', 'recent'],
    queryFn: () => submissionsAPI.getAll(),
  });

  if (analyticsLoading || trendsLoading || aiLoading || submissionsLoading) {
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

  // Calculate compliance metrics
  const overallScore = aiResultsData.length > 0 
    ? aiResultsData.reduce((sum: number, result: any) => sum + (result.overall_score || 0), 0) / aiResultsData.length 
    : 0;

  const passedAudits = aiResultsData.filter((result: any) => (result.overall_score || 0) >= 0.7).length;
  const failedAudits = aiResultsData.filter((result: any) => (result.overall_score || 0) < 0.5).length;
  const warningAudits = aiResultsData.filter((result: any) => {
    const score = result.overall_score || 0;
    return score >= 0.5 && score < 0.7;
  }).length;

  // Mock ESG category scores (in a real app, this would come from the backend)
  const esgCategories = [
    { category: 'Environmental', score: overallScore * 85 },
    { category: 'Social', score: overallScore * 78 },
    { category: 'Governance', score: overallScore * 92 },
    { category: 'Risk Management', score: overallScore * 88 },
    { category: 'Compliance', score: overallScore * 82 },
  ];

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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <StatsCard
          title="Overall Compliance"
          value={`${Math.round(overallScore * 100)}%`}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
          trend={3}
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
            {esgCategories.map((item) => (
              <ComplianceScore
                key={item.category}
                category={item.category}
                score={item.score}
              />
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
                    {aiResultsData.slice(0, 6).map((result: any) => {
                      const score = (result.overall_score || 0) * 100;
                      const status = score >= 70 ? 'Pass' : score >= 50 ? 'Warning' : 'Fail';
                      const statusColor = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error';
                      
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
                            <Chip
                              label={status}
                              color={statusColor}
                              size="small"
                            />
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mt: 3 }}>
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
                {submissionsData.slice(0, 8).map((submission: any, index: number) => (
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
                              Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={submission.status}
                        color={
                          submission.status === 'approved' ? 'success' :
                          submission.status === 'rejected' ? 'error' : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                    {index < submissionsData.length - 1 && <Box component="hr" sx={{ border: 'none', borderTop: 1, borderColor: 'divider', my: 1 }} />}
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
                  {aiResultsData.length > 0 ? Math.round((passedAudits / aiResultsData.length) * 100) : 0}%
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Avg Processing Time</Typography>
                <Typography variant="body2" fontWeight={500}>
                  2.3 min
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Button variant="contained" fullWidth startIcon={<FileDownload />}>
            Generate Report
          </Button>
          <Button variant="outlined" fullWidth startIcon={<BarChart />}>
            View Analytics
          </Button>
          <Button variant="outlined" fullWidth startIcon={<Timeline />}>
            Trend Analysis
          </Button>
          <Button variant="outlined" fullWidth startIcon={<PieChart />}>
            Category Breakdown
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
