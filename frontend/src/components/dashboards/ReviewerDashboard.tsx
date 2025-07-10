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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assignment,
  CloudUpload,
  CheckCircle,
  Comment,
  Visibility,
  PendingActions,
  AssignmentTurnedIn,
  AssessmentOutlined,
} from '@mui/icons-material';
import { uploadsAPI, aiAPI, analyticsAPI } from '../../services/api';

interface Upload {
  id: number;
  filename: string;
  user_id: number;
  uploaded_at: string;
  status: 'approved' | 'rejected' | 'pending' | 'processing';
  file_size?: number;
  ai_score?: number;
}

interface AIResult {
  id: number;
  checklist_id: number;
  overall_score: number;
  score?: number;
  analysis: string;
  created_at: string;
  updated_at: string;
  status: string;
  upload_id?: number;
  filename?: string;
  file_upload_id?: number;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
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
        </Box>
        <Box color={`${color}.main`}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

export const ReviewerDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch pending reviews
  const {
    data: pendingUploads,
    isLoading: uploadsLoading,
    error: uploadsError,
  } = useQuery<{ data: { results: Upload[] } }>({
    queryKey: ['uploads', 'pending'],
    queryFn: () => uploadsAPI.search({ status: 'pending', limit: 20 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch reviewer analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading,
    error: analyticsError 
  } = useQuery({
    queryKey: ['analytics', 'reviewer'],
    queryFn: () => analyticsAPI.getAuditorMetrics(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Fetch AI results
  const { 
    data: aiResults, 
    isLoading: aiLoading,
    error: aiError 
  } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'recent'],
    queryFn: () => aiAPI.getResults({ limit: 10 }),
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const isLoading = uploadsLoading && analyticsLoading && aiLoading;
  const hasError = uploadsError || analyticsError || aiError;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (hasError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load dashboard data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  const uploads = pendingUploads?.data?.results || [];
  const stats = analytics?.data || {};
  const aiResultsData = aiResults?.data?.results || [];

  const pendingCount = uploads.filter((u: Upload) => u.status === 'pending').length;
  const completedToday = uploads.filter(
    (u: Upload) =>
      u.status !== 'pending' && 
      new Date(u.uploaded_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Reviewer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and evaluate file uploads and AI analysis results
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
          title="Pending Reviews"
          value={pendingCount}
          icon={<PendingActions fontSize="large" />}
          color="warning"
        />
        <StatsCard
          title="Completed Today"
          value={completedToday}
          icon={<AssignmentTurnedIn fontSize="large" />}
          color="success"
        />
        <StatsCard
          title="AI Analyses"
          value={aiResultsData.length}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Total Reviews"
          value={stats.pendingReviews || 0}
          icon={<CloudUpload fontSize="large" />}
          color="secondary"
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Pending Reviews Queue */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Reviews Queue
            </Typography>
            {uploads.length === 0 ? (
              <Alert severity="info">No pending reviews at this time</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File Name</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploads.slice(0, 8).map((upload: Upload) => (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {upload.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            User ID: {upload.user_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(upload.uploaded_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" color="primary" title="View File Details">
                              <Visibility />
                            </IconButton>
                            <IconButton size="small" color="secondary" title="Review File">
                              <Comment />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent AI Analysis
            </Typography>
            {aiResultsData.length === 0 ? (
              <Alert severity="info">No AI results available</Alert>
            ) : (
              <List>
                {aiResultsData.slice(0, 5).map((result: AIResult) => (
                  <ListItem key={result.id}>
                    <ListItemIcon>
                      <AssessmentOutlined color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`AI Score: ${Math.round((result.score || result.overall_score || 0) * 100)}%`}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            File ID: {result.file_upload_id || result.id}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {new Date(result.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
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
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<Assignment />}
            onClick={() => navigate('/reviews')}
          >
            Review Queue
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<AssessmentOutlined />}
            onClick={() => navigate('/analytics')}
          >
            AI Analytics
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Comment />}
            onClick={() => navigate('/reports')}
          >
            Reports
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};