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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Skeleton,
} from '@mui/material';
import {
  Assignment,
  CloudUpload,
  CheckCircle,
  Cancel,
  Comment,
  Visibility,
  PendingActions,
  AssignmentTurnedIn,
  AssessmentOutlined,
} from '@mui/icons-material';
import { uploadsAPI, aiAPI, reviewsAPI, analyticsAPI } from '../../services/api';

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
  score?: number; // Alternative score field
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

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  upload: Upload | null;
  onReview: (uploadId: string, action: 'approve' | 'reject', comment?: string) => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({ open, onClose, upload, onReview }) => {
  const [comment, setComment] = React.useState('');
  const [selectedAction, setSelectedAction] = React.useState<'approve' | 'reject' | null>(null);

  const handleSubmit = () => {
    if (selectedAction) {
      onReview(upload?.id?.toString() || '', selectedAction, comment);
      setComment('');
      setSelectedAction(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review File Upload</DialogTitle>
      <DialogContent>
        {upload && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {upload.filename}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Uploaded by User ID: {upload.user_id} on{' '}
              {new Date(upload.uploaded_at).toLocaleString()}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Status:
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
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Review Comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add your review comments here..."
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant={selectedAction === 'approve' ? 'contained' : 'outlined'}
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => setSelectedAction('approve')}
              >
                Approve
              </Button>
              <Button
                variant={selectedAction === 'reject' ? 'contained' : 'outlined'}
                color="error"
                startIcon={<Cancel />}
                onClick={() => setSelectedAction('reject')}
              >
                Reject
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!selectedAction}>
          Submit Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ReviewerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedUpload, setSelectedUpload] = React.useState<Upload | null>(null);

  // Fetch pending reviews with performance optimization and error handling
  const {
    data: pendingUploads,
    isLoading: uploadsLoading,
    error: uploadsError,
    refetch: refetchUploads,
  } = useQuery<{ data: { results: Upload[] } }>({
    queryKey: ['uploads', 'pending'],
    queryFn: () => uploadsAPI.search({ status: 'pending', limit: 20 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    retry: 1, // Reduce retries to avoid hanging
  });

  // Fetch reviewer analytics with performance optimization and error handling
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['analytics', 'reviewer'],
    queryFn: () => analyticsAPI.getAuditorMetrics(),
    staleTime: 10 * 60 * 1000, // 10 minutes (analytics don't change frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Reduce retries to avoid hanging
  });

  // Fetch AI results with performance optimization and error handling
  const { data: aiResults, isLoading: aiLoading, error: aiError, refetch: refetchAIResults } = useQuery<{ data: { results: AIResult[] } }>({
    queryKey: ['ai-results', 'recent'],
    queryFn: () => aiAPI.getResults({ limit: 10 }),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Reduce retries to avoid hanging
  });

  const handleReview = async (uploadId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      if (action === 'approve') {
        await reviewsAPI.approve(uploadId, comment);
      } else {
        await reviewsAPI.reject(uploadId, comment || 'Rejected');
      }
      
      // Refresh all data to reflect changes
      refetchUploads();
      refetchAIResults();
      
      console.log(`Successfully ${action}ed upload ${uploadId}`);
    } catch (error) {
      console.error('Error submitting review:', error);
      // Could add a toast notification here
    }
  };

  const openReviewDialog = (upload: Upload) => {
    setSelectedUpload(upload);
    setReviewDialogOpen(true);
  };

  const openViewDialog = (upload: Upload) => {
    setSelectedUpload(upload);
    setViewDialogOpen(true);
  };

  // Progressive loading - show what's available instead of waiting for everything
  const isInitialLoading = uploadsLoading && analyticsLoading && aiLoading;
  const hasAnyError = uploadsError || analyticsError || aiError;
  
  if (isInitialLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error message if critical data fails to load
  if (hasAnyError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Some data failed to load. This could be due to network issues or insufficient permissions.
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                refetchUploads();
                refetchAIResults();
              }}
            >
              Retry
            </Button>
          </Box>
        </Alert>
        
        {/* Show basic header even if data fails */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            Reviewer Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and evaluate file uploads and AI analysis results
          </Typography>
        </Box>
      </Container>
    );
  }

  // Safe data extraction with null checks
  const uploads = pendingUploads?.data?.results || [];
  const stats = analytics?.data || {};
  const aiResultsData = aiResults?.data?.results || [];
  
  // Debug log to check data structure
  React.useEffect(() => {
    if (aiResultsData.length > 0) {
      console.log('AI Results Data:', aiResultsData[0]);
    }
    if (uploads.length > 0) {
      console.log('Uploads Data:', uploads[0]);
    }
    if (Object.keys(stats).length > 0) {
      console.log('Stats Data:', stats);
    }
  }, [aiResultsData, uploads, stats]);

  // Calculate reviewer-specific stats with safe array operations
  const pendingCount = Array.isArray(uploads) ? uploads.filter((u: Upload) => u?.status === 'pending').length : 0;
  const completedToday = Array.isArray(uploads) ? uploads.filter(
    (u: Upload) =>
      u?.status !== 'pending' && 
      u?.uploaded_at && 
      new Date(u.uploaded_at).toDateString() === new Date().toDateString()
  ).length : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
        {uploadsLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <StatsCard
            title="Pending Reviews"
            value={pendingCount}
            icon={<PendingActions fontSize="large" />}
            color="warning"
          />
        )}
        {uploadsLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <StatsCard
            title="Completed Today"
            value={completedToday}
            icon={<AssignmentTurnedIn fontSize="large" />}
            color="success"
          />
        )}
        {aiLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <StatsCard
            title="AI Analyses"
            value={aiResultsData.length}
            icon={<AssessmentOutlined fontSize="large" />}
            color="primary"
          />
        )}
        {analyticsLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <StatsCard
            title="Pending Reviews"
            value={stats.pendingReviews || 0}
            icon={<CloudUpload fontSize="large" />}
            color="secondary"
          />
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Pending Reviews Queue */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Reviews Queue
            </Typography>
            {uploadsLoading ? (
              <Box>
                <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={40} />
              </Box>
            ) : uploads.length === 0 ? (
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
                            <IconButton
                              size="small"
                              onClick={() => openViewDialog(upload)}
                              color="primary"
                              title="View File Details"
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openReviewDialog(upload)}
                              color="secondary"
                              title="Review File"
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
            {aiLoading ? (
              <Box>
                <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={60} />
              </Box>
            ) : aiResultsData.length === 0 ? (
              <Alert severity="info">No AI results available</Alert>
            ) : (
              <List>
                {aiResultsData.slice(0, 5).map((result: AIResult, index: number) => (
                  <React.Fragment key={result.id}>
                    <ListItem>
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
                            <Rating
                              value={result.score || result.overall_score || 0}
                              precision={0.1}
                              size="small"
                              readOnly
                              max={1}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < aiResultsData.length - 1 && (
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
            onClick={() => navigate('/reviews')}
          >
            Comments History
          </Button>
        </Box>
      </Paper>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>View File Details</DialogTitle>
        <DialogContent>
          {selectedUpload && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedUpload.filename}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Uploaded by User ID: {selectedUpload.user_id} on{' '}
                {new Date(selectedUpload.uploaded_at).toLocaleString()}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Status:
                  <Chip
                    label={selectedUpload.status}
                    color={
                      selectedUpload.status === 'approved'
                        ? 'success'
                        : selectedUpload.status === 'rejected'
                          ? 'error'
                          : 'warning'
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>

              {selectedUpload.file_size && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  File Size: {(selectedUpload.file_size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}

              {selectedUpload.ai_score && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    AI Analysis Score: {Math.round(selectedUpload.ai_score * 100)}%
                  </Typography>
                  <Rating
                    value={selectedUpload.ai_score}
                    precision={0.1}
                    size="small"
                    readOnly
                    max={1}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button onClick={() => {
            setViewDialogOpen(false);
            openReviewDialog(selectedUpload!);
          }} variant="contained">
            Review This File
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <ReviewDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        upload={selectedUpload}
        onReview={handleReview}
      />
    </Container>
  );
};
