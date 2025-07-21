import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { TabbedDocumentViewer } from '../components/TabbedDocumentViewer';
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

export const Reviews: React.FC = () => {
  const queryClient = useQueryClient();
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
    queryKey: ['reviews'],
    queryFn: async () => {
      const response = await uploadsAPI.search({ limit: 100 });
      return response.data.results.map((upload: any) => ({
        id: upload.id.toString(),
        filename: upload.filename,
        status: upload.status,
        uploaded_at: upload.uploaded_at,
        ai_score: upload.ai_score,
      }));
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter reviews based on search and status
  const filteredReviews = reviews.filter((review: ReviewItem) => {
    const matchesSearch = review.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mutations for approve/reject
  const approveMutation = useMutation({
    mutationFn: (data: { reviewId: string; comment?: string }) => 
      reviewsAPI.approve(data.reviewId, data.comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      refetch();
    },
    onError: (error) => {
      console.error('Approve error:', error);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { reviewId: string; comment?: string }) => 
      reviewsAPI.reject(data.reviewId, data.comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      refetch();
    },
    onError: (error) => {
      console.error('Reject error:', error);
    },
  });

  const handleApprove = (reviewId: string) => {
    approveMutation.mutate({
      reviewId,
      comment: 'Document meets compliance requirements',
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
      console.log(`Adding comment "${newComment}" to ${selectedReview.filename}`);
      setNewComment('');
      setCommentDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Error />;
      case 'pending': return <Pending />;
      default: return <Pending />;
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load reviews. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reviews
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Review Queue ({filteredReviews.length} items)
          </Typography>
          
          {filteredReviews.length === 0 ? (
            <Alert severity="info">No reviews found matching your criteria.</Alert>
          ) : (
            <List>
              {filteredReviews.map((review, index) => (
                <React.Fragment key={review.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(review.status)}
                          <Typography variant="subtitle1" fontWeight={500}>
                            {review.filename}
                          </Typography>
                          <Chip
                            label={review.status}
                            color={getStatusColor(review.status) as any}
                            size="small"
                          />
                          {review.ai_score && (
                            <Chip
                              label={`AI Score: ${Math.round(review.ai_score * 100)}%`}
                              color="primary"
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Uploaded: {new Date(review.uploaded_at).toLocaleDateString()}
                          {review.reviewer && ` • Reviewed by: ${review.reviewer}`}
                        </Typography>
                      }
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
                autoFocus
                multiline
                rows={4}
                fullWidth
                variant="outlined"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
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
  );
};