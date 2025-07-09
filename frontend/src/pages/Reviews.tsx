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
import { reviewsAPI, uploadsAPI } from '../services/api';

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
        // First try to get actual reviews
        const reviewsResponse = await reviewsAPI.getAll();
        if (reviewsResponse.data && Array.isArray(reviewsResponse.data)) {
          return reviewsResponse.data.map((review: unknown) => {
            const reviewData = review as UploadData;
            return {
              id: reviewData.id,
              filename: reviewData.filename || `Document ${reviewData.id}`,
              status: (reviewData.status || 'pending') as 'pending' | 'approved' | 'rejected',
              uploaded_at: reviewData.created_at || new Date().toISOString(),
              ai_score: reviewData.ai_score,
              comments: [],
            };
          });
        }
      } catch (reviewError) {
        console.warn('Reviews API not available, falling back to uploads:', reviewError);
      }

      // Fallback to uploads API for review items
      const uploadsResponse = await uploadsAPI.search({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        filename: searchTerm || undefined,
      });

      return (uploadsResponse.data || []).map((upload: unknown) => {
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
    },
    refetchInterval: 30000, // Refresh every 30 seconds
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

      <Typography variant="body1" color="text.secondary" paragraph>
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
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

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Stack spacing={2}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedReview.filename}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uploaded: {new Date(selectedReview.uploaded_at).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: <Chip label={selectedReview.status} color={getStatusColor(selectedReview.status)} size="small" />
                </Typography>
                {selectedReview.ai_score && (
                  <Typography variant="body2" color="text.secondary">
                    AI Score: {Math.round(selectedReview.ai_score * 100)}%
                  </Typography>
                )}
              </Paper>
              
              {selectedReview.comments && selectedReview.comments.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Comments:
                  </Typography>
                  {selectedReview.comments.map((comment, index) => (
                    <Paper key={index} elevation={1} sx={{ p: 1, mb: 1 }}>
                      <Typography variant="body2">{comment}</Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
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
