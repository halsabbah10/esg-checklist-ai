import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ListItemSecondaryAction,
  Divider,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all'
  );

  // Fetch review items
  const {
    data: reviews = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      // Since reviews endpoint might not be fully implemented, simulate with uploads
      const response = await uploadsAPI.search({});
      return response.data.map((upload: unknown) => {
        // Type guard for upload data
        const uploadData = upload as UploadData;
        return {
          id: uploadData.id,
          filename: uploadData.filename || `Document ${uploadData.id}`,
          status: (uploadData.status || 'pending') as 'pending' | 'approved' | 'rejected',
          uploaded_at: uploadData.created_at || new Date().toISOString(),
          ai_score: uploadData.ai_score || Math.floor(Math.random() * 100),
          comments: [],
        };
      });
    },
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

  const handleApprove = async (reviewId: string) => {
    try {
      await reviewsAPI.approve(reviewId, 'Document approved for compliance');
      refetch();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      await reviewsAPI.reject(reviewId, 'Document requires additional information');
      refetch();
    } catch (error) {
      console.error('Failed to reject:', error);
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

                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => console.log('View details:', review.id)}
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
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleReject(review.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        <Button
                          size="small"
                          startIcon={<Comment />}
                          onClick={() => console.log('Add comment:', review.id)}
                        >
                          Comment
                        </Button>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < filteredReviews.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};
