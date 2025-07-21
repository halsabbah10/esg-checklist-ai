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
  TrendingUp,
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
import { analyticsAPI, aiAPI, uploadsAPI } from '../../services/api';

interface AIResult {
  id: number;
  checklist_id: number;
  overall_score: number;
  score?: number; // Alternative score field used in some contexts
  analysis: string;
  created_at: string;
  updated_at: string;
  status: string;
  upload_id?: number;
  filename?: string;
  file_upload_id?: number;
  metadata?: {
    checklist_completeness?: {
      completion_rate: number;
      total: number;
      completed: number;
      summary?: {
        complete: number;
        incomplete: number;
        missing: number;
        total: number;
      };
    };
    department_context?: any;
    quality_score?: number;
  };
  analysis_metadata?: any; // Fallback for alternative structure
  checklist_completeness?: any; // Direct completeness field fallback
}

interface FileUpload {
  id: number;
  user_id: number;
  filename: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review' | 'processing';
  created_at: string;
  updated_at: string;
  uploaded_at?: string; // Alternative date field
  upload_date?: string; // Alternative date field
  timestamp?: string; // Alternative date field
  ai_result?: {
    overall_score: number;
    status: string;
  };
  review_status?: string;
  file_size?: number;
  content_type?: string;
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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Optimized: Fetch all dashboard data in parallel with better caching
  const { data: auditorMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['analytics', 'auditor-metrics'],
    queryFn: () => analyticsAPI.getAuditorMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 2 * 60 * 1000, // Reduced to 2 minutes
    refetchOnWindowFocus: false,
  });

  // Optimized: Load AI results with reduced limit and better caching
  const { data: aiResults, isLoading: aiLoading, refetch: refetchAIResults } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'compliance'],
    queryFn: () => aiAPI.getResults({ limit: 10 }), // Reduced from 20 to 10
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Reduced refetch interval
    refetchOnWindowFocus: false,
  });

  // Load recent file uploads (the actual submissions in this system)
  const { data: uploads, isLoading: uploadsLoading, error: uploadsError } = useQuery<{ data: { results: FileUpload[] } }>({
    queryKey: ['uploads', 'recent'],
    queryFn: () => uploadsAPI.search({ limit: 20 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Improved loading state - show partial content while loading
  const isInitialLoading = metricsLoading && aiLoading && uploadsLoading;
  
  if (isInitialLoading) {
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

  const aiResultsData = aiResults?.data?.results || [];
  const uploadsData = uploads?.data?.results || [];
  
  // Enhanced debug logging for uploads data
  if (typeof window !== 'undefined') {
    console.log('🔍 Debug: Uploads Data:', {
      uploads,
      uploadsData,
      uploadsError,
      isArray: Array.isArray(uploadsData),
      originalData: uploads?.data,
      uploadsLoading,
      dataLength: uploadsData?.length,
      rawResponse: uploads,
      sampleUpload: uploadsData[0], // Show structure of first upload
      uploadFields: uploadsData[0] ? Object.keys(uploadsData[0]) : []
    });
  }
  const metrics = auditorMetrics?.data || {};

  // Use real metrics from backend
  const overallScore = metrics.overallScore || 0;
  const passedAudits = metrics.passedAudits || 0;
  const failedAudits = metrics.failedAudits || 0;
  const avgProcessingTime = metrics.avgProcessingTime || 0;
  const esgCategories = metrics.esgCategories || [];

  // Calculate warning audits (scores between 0.5 and 0.7)
  const warningAudits = aiResultsData.filter((result: AIResult) => {
    const score = result.overall_score || 0;
    return score >= 0.5 && score < 0.7;
  }).length;

  // Enhanced completeness metrics with proper data handling
  const getCompleteness = (result: any) => {
    // Try multiple possible data structures
    return result.metadata?.checklist_completeness || 
           result.analysis_metadata?.checklist_completeness ||
           result.checklist_completeness ||
           null;
  };

  const getCompletionRate = (result: any): number => {
    const completeness = getCompleteness(result);
    return completeness?.completion_rate || 
           (completeness?.completed && completeness?.total ? completeness.completed / completeness.total : 0);
  };

  const hasCompletenessData = (result: any): boolean => {
    const completeness = getCompleteness(result);
    return !!(completeness && (completeness.completion_rate !== undefined || 
             (completeness.completed !== undefined && completeness.total !== undefined)));
  };

  // Calculate completeness metrics with better data validation
  const resultsWithCompleteness = aiResultsData.filter(hasCompletenessData);
  
  const completeAudits = resultsWithCompleteness.filter((result: any) => {
    return getCompletionRate(result) >= 0.95;
  }).length;

  const incompleteAudits = resultsWithCompleteness.filter((result: any) => {
    const rate = getCompletionRate(result);
    return rate >= 0.5 && rate < 0.95;
  }).length;

  const missingDataAudits = resultsWithCompleteness.filter((result: any) => {
    return getCompletionRate(result) < 0.5;
  }).length;

  const averageCompleteness = resultsWithCompleteness.length > 0 
    ? resultsWithCompleteness.reduce((sum: number, result: any) => {
        return sum + getCompletionRate(result);
      }, 0) / resultsWithCompleteness.length
    : 0;

  // Calculate percentage of audits that have completeness data
  const completenessDataAvailability = aiResultsData.length > 0 
    ? (resultsWithCompleteness.length / aiResultsData.length) * 100 
    : 0;

  // Manual refresh function
  const handleRefresh = async () => {
    await Promise.all([
      refetchMetrics(),
      refetchAIResults(),
    ]);
    setLastRefresh(new Date());
  };

  // Debug logging for all data (remove in production)
  if (typeof window !== 'undefined') {
    // Calculate stats for debugging using consistent logic
    const frontendPassedCount = aiResultsData.filter((r: AIResult) => {
      const scoreValue = r.overall_score || r.score || 0;
      const score = scoreValue > 1 ? scoreValue : scoreValue * 100;
      return score >= 70;
    }).length;
    const frontendFailedCount = aiResultsData.filter((r: AIResult) => {
      const scoreValue = r.overall_score || r.score || 0;
      const score = scoreValue > 1 ? scoreValue : scoreValue * 100;
      return score < 50;
    }).length;
    const frontendWarningCount = aiResultsData.filter((r: AIResult) => {
      const scoreValue = r.overall_score || r.score || 0;
      const score = scoreValue > 1 ? scoreValue : scoreValue * 100;
      return score >= 50 && score < 70;
    }).length;

    console.log('🔍 Debug: Dashboard Data Structure:', {
      metrics: metrics,
      aiResultsData: aiResultsData,
      uploadsData: uploadsData,
      sampleAIResult: aiResultsData[0],
      backendMetrics: {
        passedAudits: passedAudits,
        failedAudits: failedAudits,
        overallScore: overallScore
      },
      frontendCalculatedMetrics: {
        passedCount: frontendPassedCount,
        failedCount: frontendFailedCount,
        warningCount: frontendWarningCount,
        total: aiResultsData.length,
        passRate: aiResultsData.length > 0 ? Math.round((frontendPassedCount / aiResultsData.length) * 100) : 0
      },
      completenessData: {
        resultsWithCompleteness: resultsWithCompleteness.length,
        completeAudits: completeAudits,
        incompleteAudits: incompleteAudits,
        missingDataAudits: missingDataAudits
      }
    });
  }

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
          disabled={metricsLoading || aiLoading || uploadsLoading}
        >
          Refresh Data
        </Button>
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
          value={resultsWithCompleteness.length > 0 ? `${Math.round(averageCompleteness * 100)}%` : 'N/A'}
          icon={<Assignment fontSize="large" />}
          color={resultsWithCompleteness.length > 0 ? "primary" : "warning"}
          subtitle={resultsWithCompleteness.length > 0 ? `${resultsWithCompleteness.length} audits` : 'No data available'}
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
          value={missingDataAudits}
          icon={<ErrorIcon fontSize="large" />}
          color="error"
          subtitle="Rate < 50%"
        />
      </Box>

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

      {/* Row 1: ESG Compliance Scores and Completeness Breakdown (smaller boxes) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* ESG Compliance Scores */}
        <Card elevation={2}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
              ESG Compliance Scores
            </Typography>
            {esgCategories.map((item: any) => (
              <ComplianceScore key={item.category} category={item.category} score={item.score} />
            ))}
          </CardContent>
        </Card>

        {/* Completeness Breakdown */}
        <Card elevation={2}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
              Completeness Breakdown
            </Typography>
            {aiResultsData.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: '0.85rem' }}>No audit data available</Alert>
            ) : resultsWithCompleteness.length === 0 ? (
              <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                No completeness data available. This data is generated by newer AI analysis versions.
              </Alert>
            ) : (
              <Box>
                <ComplianceScore 
                  category="Complete (≥95%)" 
                  score={completeAudits} 
                  maxScore={resultsWithCompleteness.length}
                />
                <ComplianceScore 
                  category="Incomplete (50-94%)" 
                  score={incompleteAudits} 
                  maxScore={resultsWithCompleteness.length}
                />
                <ComplianceScore 
                  category="Missing (<50%)" 
                  score={missingDataAudits} 
                  maxScore={resultsWithCompleteness.length}
                />
                <Box sx={{ 
                  mt: 1, 
                  p: 1.5, 
                  bgcolor: 'grey.200', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.75rem',
                    color: 'grey.700',
                    fontWeight: 500
                  }}>
                    Data availability: {resultsWithCompleteness.length}/{aiResultsData.length} audits 
                    ({completenessDataAvailability.toFixed(0)}%)
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Row 2: Recent Audit Results - Full Width Large Box Below */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Audit Results
          </Typography>
          {aiResultsData.length === 0 ? (
            <Alert severity="info">No audit results available</Alert>
          ) : (
            <TableContainer data-scrollable="true" sx={{ maxHeight: 400, overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '35%', maxWidth: '200px' }}>File Upload</TableCell>
                    <TableCell sx={{ width: '15%', textAlign: 'center' }}>Compliance</TableCell>
                    <TableCell sx={{ width: '15%', textAlign: 'center' }}>Completeness</TableCell>
                    <TableCell sx={{ width: '35%', textAlign: 'center' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiResultsData.slice(0, 10).map((result: AIResult) => {
                    // Try multiple possible score fields and handle different formats
                    const scoreValue = result.overall_score || (result as any).score || 0;
                    const score = scoreValue > 1 ? scoreValue : scoreValue * 100;
                    const status = score >= 70 ? 'Pass' : score >= 50 ? 'Warning' : 'Fail';
                    const statusColor =
                      score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error';

                    // Get completeness data using our enhanced functions
                    const completenessRate = getCompletionRate(result);
                    const hasCompleteness = hasCompletenessData(result);
                    const completenessStatus = hasCompleteness 
                      ? (completenessRate >= 0.95 ? 'Complete' : 
                         completenessRate >= 0.5 ? 'Incomplete' : 'Missing')
                      : 'No Data';
                    const completenessColor = hasCompleteness 
                      ? (completenessRate >= 0.95 ? 'success' : 
                         completenessRate >= 0.5 ? 'warning' : 'error')
                      : 'default';

                    return (
                      <TableRow key={result.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {(result as any).filename || 
                             (result as any).file_info?.filename || 
                             `Analysis ${result.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {result.file_upload_id || result.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color={statusColor === 'success' ? 'success.main' : statusColor === 'error' ? 'error.main' : 'warning.main'}>
                            {score.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {hasCompleteness ? (
                            <Typography variant="body2" fontWeight={500} color={completenessColor === 'success' ? 'success.main' : completenessColor === 'error' ? 'error.main' : 'warning.main'}>
                              {Math.round(completenessRate * 100)}%
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip label={status} color={statusColor} size="small" />
                            <Chip 
                              label={completenessStatus} 
                              color={completenessColor} 
                              size="small" 
                              variant={hasCompleteness ? "outlined" : "filled"}
                            />
                          </Box>
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

      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mt: 3 }}
      >
        {/* Compliance Trends */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Activity Overview
            </Typography>
            {uploadsLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={30} />
              </Box>
            ) : uploadsError ? (
              <Alert severity="error">
                Error loading file uploads: {uploadsError?.message || 'Unknown error'}
              </Alert>
            ) : uploadsData.length === 0 ? (
              <Alert severity="info">
                No document submissions available. This could mean:
                <br />• No documents have been uploaded yet
                <br />• Files are still being processed
                <br />• Check browser console for API errors
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {uploadsData
                  .filter((upload: FileUpload, index: number, self: FileUpload[]) => {
                    // Remove duplicates based on filename and user_id combination
                    const key = `${upload.filename}-${upload.user_id}`;
                    return self.findIndex(u => `${u.filename}-${u.user_id}` === key) === index;
                  })
                  .slice(0, 20)
                  .map((upload: FileUpload, index: number) => (
                  <React.Fragment key={upload.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Assignment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2">
                            {upload.filename || `Document ${upload.id}`}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="caption" display="block" color="text.secondary" component="span">
                              Uploaded by User {upload.user_id}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary" component="span">
                              {(() => {
                                // Try multiple possible date fields and formats
                                const dateValue = upload.created_at || upload.uploaded_at || upload.upload_date || upload.timestamp;
                                if (dateValue) {
                                  try {
                                    const date = new Date(dateValue);
                                    // Check if date is valid
                                    if (!isNaN(date.getTime())) {
                                      return date.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    }
                                  } catch (error) {
                                    console.warn('Date parsing error:', error, dateValue);
                                  }
                                }
                                return 'Date not available';
                              })()}
                            </Typography>
                            {upload.ai_result?.overall_score && (
                              <Typography variant="caption" display="block" color="primary.main" component="span">
                                AI Score: {Math.round(upload.ai_result.overall_score * 100)}%
                              </Typography>
                            )}
                            {upload.file_size && (
                              <Typography variant="caption" display="block" color="text.secondary" component="span">
                                Size: {(upload.file_size / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                      <Chip
                        label={upload.status || upload.review_status || 'Processing'}
                        color={
                          upload.status === 'approved' || upload.review_status === 'approved'
                            ? 'success'
                            : upload.status === 'rejected' || upload.review_status === 'rejected'
                              ? 'error'
                              : 'warning'
                        }
                        size="small"
                      />
                    </ListItem>
                    {index < uploadsData.length - 1 && (
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
                  {(() => {
                    if (aiResultsData.length === 0) return 'N/A';
                    
                    // Calculate pass rate using same logic as "Recent Audit Results" table
                    const passedCount = aiResultsData.filter((r: AIResult) => {
                      const scoreValue = r.overall_score || r.score || 0;
                      const score = scoreValue > 1 ? scoreValue : scoreValue * 100;
                      return score >= 70; // Same threshold as table status logic
                    }).length;
                    
                    const passRate = Math.round((passedCount / aiResultsData.length) * 100);
                    
                    return Math.min(passRate, 100); // Cap at 100%
                  })()}%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Completion Rate</Typography>
                <Typography variant="body2" fontWeight={500} color="info.main">
                  {resultsWithCompleteness.length > 0
                    ? Math.round((completeAudits / resultsWithCompleteness.length) * 100)
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

            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Data Availability</Typography>
                <Typography variant="body2" fontWeight={500} color={completenessDataAvailability >= 50 ? "success.main" : "warning.main"}>
                  {completenessDataAvailability.toFixed(0)}%
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
