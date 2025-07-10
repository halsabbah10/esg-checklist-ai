import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
} from '@mui/material';
import { Search, CheckCircle, Error, Pending, Comment, Visibility } from '@mui/icons-material';
import { reviewsAPI, uploadsAPI, aiAPI } from '../services/api';

interface ReviewItem {
  id: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewer?: string;
  comments?: string[];
  ai_score?: number;
}

interface UploadData {
  id: string;
  filename?: string;
  status?: string;
  created_at?: string;
  ai_score?: number;
}

export const Reviews: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch AI analysis for selected file
  const { data: aiAnalysis, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-analysis', selectedReview?.id],
    queryFn: () => aiAPI.getResultByUpload(selectedReview!.id),
    enabled: !!selectedReview && viewDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch review items
  const {
    data: reviews = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reviews', statusFilter, searchTerm],
    queryFn: async () => {
      try {
        // Get uploads for reviews (since reviews are based on file uploads)
        const uploadsResponse = await uploadsAPI.search({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          filename: searchTerm || undefined,
          limit: 100, // Increase limit to get more results
        });

        console.log('Uploads API response:', uploadsResponse);

        // Check if response has data and results
        const results = uploadsResponse.data?.results || [];
        console.log('Upload results:', results);

        return results.map((upload: unknown) => {
          const uploadData = upload as UploadData;
          return {
            id: uploadData.id,
            filename: uploadData.filename || `Document ${uploadData.id}`,
            status: (uploadData.status || 'pending') as 'pending' | 'approved' | 'rejected',
            uploaded_at: uploadData.created_at || new Date().toISOString(),
            ai_score: uploadData.ai_score,
            comments: [],
          };
        });
      } catch (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3, // Retry failed requests
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const filteredReviews = reviews.filter((review: ReviewItem) => {
    const matchesSearch = review.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle color="success" />;
      case 'rejected':
        return <Error color="error" />;
      default:
        return <Pending color="warning" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const queryClient = useQueryClient();

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ reviewId, comment }: { reviewId: string; comment?: string }) =>
      reviewsAPI.approve(reviewId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      refetch();
    },
    onError: error => {
      console.error('Failed to approve:', error);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ reviewId, comment }: { reviewId: string; comment: string }) =>
      reviewsAPI.reject(reviewId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      refetch();
    },
    onError: error => {
      console.error('Failed to reject:', error);
    },
  });

  const handleApprove = (reviewId: string) => {
    approveMutation.mutate({
      reviewId,
      comment: 'Document approved for compliance',
    });
  };

  const handleReject = (reviewId: string) => {
    rejectMutation.mutate({
      reviewId,
      comment: 'Document requires additional information',
    });
  };

  const handleViewDetails = (review: ReviewItem) => {
    setSelectedReview(review);
    setViewDialogOpen(true);
  };

  const handleAddComment = (review: ReviewItem) => {
    setSelectedReview(review);
    setCommentDialogOpen(true);
  };

  const handleCommentSubmit = () => {
    if (selectedReview && newComment.trim()) {
      // Add comment logic here - for now just close the dialog
      setCommentDialogOpen(false);
      setNewComment('');
      setSelectedReview(null);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Failed to load reviews. Please try again later.</Alert>
      </Container>
    );
  }

  const pendingCount = reviews.filter((r: ReviewItem) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r: ReviewItem) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r: ReviewItem) => r.status === 'rejected').length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Document Reviews
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Review and approve ESG compliance documents submitted for analysis.
      </Typography>

      {/* Summary Cards */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
        gap={2}
        sx={{ mb: 4 }}
      >
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Pending Reviews
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Approved
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Rejected
            </Typography>
            <Typography variant="h4" color="error.main">
              {rejectedCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ minWidth: 250 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Tabs
              value={statusFilter}
              onChange={(_, value) => setStatusFilter(value)}
              sx={{ ml: 2 }}
            >
              <Tab label="All" value="all" />
              <Tab label="Pending" value="pending" />
              <Tab label="Approved" value="approved" />
              <Tab label="Rejected" value="rejected" />
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Review Queue ({filteredReviews.length})
          </Typography>

          {filteredReviews.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No documents found for review.
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredReviews.map((review: ReviewItem, index: number) => (
                <React.Fragment key={review.id}>
                  <ListItem sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" mr={2}>
                      {getStatusIcon(review.status)}
                    </Box>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">{review.filename}</Typography>
                          <Chip
                            label={review.status}
                            color={getStatusColor(review.status)}
                            size="small"
                          />
                          {review.ai_score && (
                            <Chip
                              label={`AI Score: ${review.ai_score}%`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Uploaded: {new Date(review.uploaded_at).toLocaleDateString()}
                          {review.reviewer && ` • Reviewed by: ${review.reviewer}`}
                        </Typography>
                      }
                    />

                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(review)}
                      >
                        View
                      </Button>

                      {review.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleApprove(review.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleReject(review.id)}
                            disabled={rejectMutation.isPending}
                          >
                            {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </>
                      )}

                      <Button
                        size="small"
                        startIcon={<Comment />}
                        onClick={() => handleAddComment(review)}
                      >
                        Comment
                      </Button>
                    </Box>
                  </ListItem>
                  {index < filteredReviews.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh', maxHeight: '800px' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">AI Analysis Results</Typography>
            <Chip 
              label={selectedReview?.status} 
              color={selectedReview ? getStatusColor(selectedReview.status) : 'default'} 
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedReview && (
            <Stack spacing={3}>
              {/* File Information */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  📄 Document Information
                </Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Filename:</Typography>
                    <Typography variant="body1" fontWeight={500}>{selectedReview.filename}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Upload Date:</Typography>
                    <Typography variant="body1">{new Date(selectedReview.uploaded_at).toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Paper>

              {/* AI Analysis Results */}
              {aiLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2 }}>Loading AI analysis...</Typography>
                </Box>
              ) : aiAnalysis?.data?.results?.length > 0 ? (
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    🤖 AI Analysis Results
                  </Typography>
                  {aiAnalysis.data.results.map((result: any, index: number) => (
                    <Box key={index} sx={{ mb: 3 }}>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Typography variant="h4" color="success.main" fontWeight="bold">
                          {Math.round((result.score || result.overall_score || 0) * 100)}%
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          Compliance Score
                        </Typography>
                      </Box>
                      
                      {result.analysis && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Analysis Summary:</Typography>
                          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {result.analysis}
                            </Typography>
                          </Paper>
                        </Box>
                      )}

                      <Box mt={2} display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2}>
                        <Box textAlign="center" p={1}>
                          <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                          <Typography variant="body1" fontWeight={500}>{result.status || 'Completed'}</Typography>
                        </Box>
                        <Box textAlign="center" p={1}>
                          <Typography variant="subtitle2" color="text.secondary">Analyzed</Typography>
                          <Typography variant="body1">{new Date(result.created_at).toLocaleDateString()}</Typography>
                        </Box>
                        <Box textAlign="center" p={1}>
                          <Typography variant="subtitle2" color="text.secondary">Checklist ID</Typography>
                          <Typography variant="body1">{result.checklist_id}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              ) : (
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Alert severity="warning">
                    No AI analysis results found for this document. The analysis may still be processing.
                  </Alert>
                </Paper>
              )}

              {/* Comments Section */}
              {selectedReview.comments && selectedReview.comments.length > 0 && (
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    💬 Review Comments
                  </Typography>
                  {selectedReview.comments.map((comment, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                      <Typography variant="body2">{comment}</Typography>
                    </Paper>
                  ))}
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setViewDialogOpen(false);
              // Could add approve/reject functionality here
            }}
          >
            Review Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Stack spacing={2}>
              <Typography variant="body2">
                Adding comment to: {selectedReview.filename}
              </Typography>
              <TextField
                label="Comment"
                multiline
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                fullWidth
                placeholder="Enter your comment here..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCommentSubmit}
            variant="contained"
            disabled={!newComment.trim()}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
