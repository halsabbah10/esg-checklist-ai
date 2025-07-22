import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useNavigate } from 'react-router-dom'; // Removed unused
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
  Stack,
} from '@mui/material';
import { Search, CheckCircle, Error, Pending, Comment, Visibility } from '@mui/icons-material';
import { reviewsAPI, uploadsAPI } from '../services/api';
import { TabbedDocumentViewer } from '../components/TabbedDocumentViewer';
import { PageTransition } from '../components/ui';
import { ReviewActions } from '../components/ReviewActions';

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
  // const navigate = useNavigate(); // Removed unused
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [reviewActionsOpen, setReviewActionsOpen] = useState(false);


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

        // Remove duplicates by ID and return mapped results
        const uniqueResults = results.filter((upload: unknown, index: number, self: unknown[]) => {
          const uploadData = upload as UploadData;
          return self.findIndex((u: unknown) => (u as UploadData).id === uploadData.id) === index;
        });

        return uniqueResults.map((upload: unknown) => {
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
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchInterval: false, // Disable automatic refresh to prevent duplicates
    retry: 2, // Reduce retry attempts
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
    setDocumentViewerOpen(true);
  };

  const handleAddComment = (review: ReviewItem) => {
    setSelectedReview(review);
    setReviewActionsOpen(true);
  };


  const handleStatusChange = (newStatus: string) => {
    console.log(`Status changed to: ${newStatus}`);
    // Refresh data after status change
    refetch();
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
    <PageTransition in={true} variant="fade" duration={500}>
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
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />

                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(review)}
                        variant="contained"
                        sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.75rem' }}
                      >
                        View
                      </Button>


                      {review.status === 'pending' && (
                        <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleApprove(review.id)}
                            disabled={approveMutation.isPending}
                            sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.75rem' }}
                          >
                            {approveMutation.isPending ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleReject(review.id)}
                            disabled={rejectMutation.isPending}
                            sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.75rem' }}
                          >
                            {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </Stack>
                      )}

                      <Button
                        size="small"
                        startIcon={<Comment />}
                        onClick={() => handleAddComment(review)}
                        variant="outlined"
                        color="primary"
                        sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.75rem' }}
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

      {/* Enhanced Tabbed Document Viewer */}
      {selectedReview && (
        <TabbedDocumentViewer
          key={`tabbed-viewer-${selectedReview.id}`}
          open={documentViewerOpen}
          onClose={() => setDocumentViewerOpen(false)}
          uploadId={parseInt(selectedReview.id)}
          filename={selectedReview.filename}
        />
      )}

      {/* Enhanced Review Actions */}
      {selectedReview && (
        <ReviewActions
          open={reviewActionsOpen}
          onClose={() => setReviewActionsOpen(false)}
          uploadId={parseInt(selectedReview.id)}
          filename={selectedReview.filename}
          currentStatus={selectedReview.status}
          onStatusChange={handleStatusChange}
        />
      )}
      </Container>
    </PageTransition>
  );
};
