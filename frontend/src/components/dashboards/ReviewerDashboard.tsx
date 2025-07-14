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
  Comment,
  Visibility,
  PendingActions,
  AssignmentTurnedIn,
  AssessmentOutlined,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { uploadsAPI, aiAPI } from '../../services/api';
import { TabbedDocumentViewer } from '../TabbedDocumentViewer';
import { ReviewActions } from '../ReviewActions';

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
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [reviewActionsOpen, setReviewActionsOpen] = useState(false);

  // Use the same successful approach as Reviews page
  const {
    data: uploadsData,
    isLoading: uploadsLoading,
    error: uploadsError,
  } = useQuery<{ data: { results: Upload[] } }>({
    queryKey: ['uploads', 'all-for-reviewer'],
    queryFn: () => uploadsAPI.search({ limit: 100 }), // Same as Reviews page
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Get AI results for analysis display
  const {
    data: aiResultsData,
    isLoading: aiLoading,
  } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'all-for-reviewer'],
    queryFn: () => aiAPI.getResults({ limit: 50 }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const isLoading = uploadsLoading || aiLoading;
  const hasError = uploadsError;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>Loading Reviews...</Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (hasError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load dashboard data. Please try refreshing the page.
          {uploadsError?.message && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Error: {uploadsError.message}
            </Typography>
          )}
        </Alert>
      </Container>
    );
  }

  // Process data like the Reviews page does
  const uploads = uploadsData?.data?.results || [];
  const aiResults = aiResultsData?.data?.results || [];
  
  // Calculate metrics from the actual data
  const totalUploads = uploads.length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const approvedCount = uploads.filter(u => u.status === 'approved').length;
  const rejectedCount = uploads.filter(u => u.status === 'rejected').length;
  
  // Calculate metrics with proper score handling
  const validScores = aiResults
    .map(r => {
      const score = r.overall_score || r.score || 0;
      const numScore = typeof score === 'string' ? parseFloat(score) : score;
      return isNaN(numScore) ? 0 : (numScore <= 1 ? numScore : numScore / 100);
    })
    .filter(score => score > 0);

  const metrics = {
    overallScore: validScores.length > 0 ? 
      validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0,
    passedAudits: validScores.filter(score => score >= 0.7).length,
    failedAudits: validScores.filter(score => score < 0.7).length,
    pendingReviews: pendingCount,
    avgProcessingTime: 0,
    esgCategories: []
  };

  // Helper function to format AI scores consistently
  const formatAIScore = (score: any): number => {
    if (score === null || score === undefined || isNaN(score)) return 0;
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return 0;
    // Handle both 0-1 and 0-100 scale
    return numScore <= 1 ? Math.round(numScore * 100) : Math.round(numScore);
  };

  // Calculate reviewer-specific stats from real data
  const pendingUploads = uploads.filter(u => u.status === 'pending');
  const completedToday = uploads.filter(
    (u) =>
      u.status !== 'pending' && 
      u.uploaded_at &&
      new Date(u.uploaded_at).toDateString() === new Date().toDateString()
  );

  // Handle upload actions
  const handleViewDocument = (upload: Upload) => {
    setSelectedUpload(upload);
    setDocumentViewerOpen(true);
  };

  const handleReviewActions = (upload: Upload) => {
    setSelectedUpload(upload);
    setReviewActionsOpen(true);
  };

  const handleStatusChange = (newStatus: string) => {
    console.log(`Status changed to: ${newStatus}`);
    // Update local state optimistically if needed
    if (selectedUpload) {
      // Could update local state here based on newStatus
      console.log(`Upload ${selectedUpload.id} status changed to ${newStatus}`);
    }
    // Refresh data after status change
    window.location.reload(); // Simple refresh - could be optimized with query invalidation
  };

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
          value={pendingUploads.length}
          icon={<PendingActions fontSize="large" />}
          color="warning"
        />
        <StatsCard
          title="Completed Today"
          value={completedToday.length}
          icon={<AssignmentTurnedIn fontSize="large" />}
          color="success"
        />
        <StatsCard
          title="AI Analyses"
          value={aiResults.length}
          icon={<AssessmentOutlined fontSize="large" />}
          color="primary"
        />
        <StatsCard
          title="Total Uploads"
          value={totalUploads}
          icon={<CloudUpload fontSize="large" />}
          color="secondary"
        />
        <StatsCard
          title="Approved"
          value={approvedCount}
          icon={<CheckCircle fontSize="large" />}
          color="success"
        />
        <StatsCard
          title="Rejected"
          value={rejectedCount}
          icon={<Cancel fontSize="large" />}
          color="error"
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
                      <TableCell>User</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingUploads.slice(0, 8).map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {upload.filename || `Document ${upload.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {upload.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            User {upload.user_id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleDateString() : 'N/A'}
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
                            <IconButton 
                              size="small" 
                              color="primary" 
                              title="View Document"
                              onClick={() => handleViewDocument(upload)}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="secondary" 
                              title="Review Actions"
                              onClick={() => handleReviewActions(upload)}
                            >
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
            {aiResults.length === 0 ? (
              <Alert severity="info">No AI results available</Alert>
            ) : (
              <List>
                {aiResults.slice(0, 4).map((result) => (
                  <ListItem key={result.id}>
                    <ListItemIcon>
                      <AssessmentOutlined color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`AI Score: ${formatAIScore(result.overall_score || result.score)}%`}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            File ID: {result.file_upload_id || result.id}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {result.created_at ? new Date(result.created_at).toLocaleDateString() : 'N/A'}
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

      {/* Summary Statistics */}
      <Card elevation={2} sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Review Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Average AI Score
              </Typography>
              <Typography variant="h5" color="primary.main">
                {formatAIScore(metrics.overallScore)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Pass Rate
              </Typography>
              <Typography variant="h5" color="success.main">
                {aiResults.length > 0 ? Math.round((metrics.passedAudits / aiResults.length) * 100) : 0}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Pending Queue
              </Typography>
              <Typography variant="h5" color="warning.main">
                {pendingUploads.length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

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

      {/* Tabbed Document Viewer Modal */}
      {selectedUpload && (
        <TabbedDocumentViewer
          open={documentViewerOpen}
          onClose={() => setDocumentViewerOpen(false)}
          uploadId={selectedUpload.id}
          filename={selectedUpload.filename || `Document ${selectedUpload.id}`}
          fileSize={selectedUpload.file_size}
        />
      )}

      {/* Review Actions Modal */}
      {selectedUpload && (
        <ReviewActions
          open={reviewActionsOpen}
          onClose={() => setReviewActionsOpen(false)}
          uploadId={selectedUpload.id}
          filename={selectedUpload.filename || `Document ${selectedUpload.id}`}
          currentStatus={selectedUpload.status}
          onStatusChange={handleStatusChange}
        />
      )}
    </Container>
  );
};