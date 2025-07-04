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
        <Box color={`${color}.main`}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  upload: any;
  onReview: (uploadId: string, action: 'approve' | 'reject', comment?: string) => void;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({ open, onClose, upload, onReview }) => {
  const [comment, setComment] = React.useState('');
  const [selectedAction, setSelectedAction] = React.useState<'approve' | 'reject' | null>(null);

  const handleSubmit = () => {
    if (selectedAction) {
      onReview(upload?.id, selectedAction, comment);
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
            <Typography variant="body2" color="text.secondary" paragraph>
              Uploaded by User ID: {upload.user_id} on {new Date(upload.uploaded_at).toLocaleString()}
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Status: 
                <Chip 
                  label={upload.status} 
                  color={upload.status === 'approved' ? 'success' : upload.status === 'rejected' ? 'error' : 'warning'}
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
              onChange={(e) => setComment(e.target.value)}
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
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!selectedAction}
        >
          Submit Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ReviewerDashboard: React.FC = () => {
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [selectedUpload, setSelectedUpload] = React.useState<any>(null);

  // Fetch pending reviews
  const { data: pendingUploads, isLoading: uploadsLoading, refetch: refetchUploads } = useQuery({
    queryKey: ['uploads', 'pending'],
    queryFn: () => uploadsAPI.search({ status: 'pending', limit: 20 }),
  });

  // Fetch reviewer analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'reviewer'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  // Fetch AI results for analysis
  const { data: aiResults, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-results', 'recent'],
    queryFn: () => aiAPI.getResults({ limit: 10 }),
  });

  const handleReview = async (uploadId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      if (action === 'approve') {
        await reviewsAPI.approve(uploadId, comment);
      } else {
        await reviewsAPI.reject(uploadId, comment || 'Rejected');
      }
      refetchUploads();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const openReviewDialog = (upload: any) => {
    setSelectedUpload(upload);
    setReviewDialogOpen(true);
  };

  if (uploadsLoading || analyticsLoading || aiLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const uploads = pendingUploads?.data?.results || [];
  const stats = analytics?.data || {};
  const aiResultsData = aiResults?.data?.results || [];

  // Calculate reviewer-specific stats
  const pendingCount = uploads.filter((u: any) => u.status === 'pending').length;
  const completedToday = uploads.filter((u: any) => 
    u.status !== 'pending' && 
    new Date(u.uploaded_at).toDateString() === new Date().toDateString()
  ).length;

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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
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
          title="Total Files"
          value={stats.totalUploads || 0}
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
                    {uploads.slice(0, 8).map((upload: any) => (
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
                              upload.status === 'approved' ? 'success' :
                              upload.status === 'rejected' ? 'error' : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => openReviewDialog(upload)}
                              color="primary"
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openReviewDialog(upload)}
                              color="secondary"
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
            {aiResultsData.length === 0 ? (
              <Alert severity="info">No AI results available</Alert>
            ) : (
              <List>
                {aiResultsData.slice(0, 5).map((result: any, index: number) => (
                  <React.Fragment key={result.id}>
                    <ListItem>
                      <ListItemIcon>
                        <AssessmentOutlined color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`AI Score: ${Math.round((result.overall_score || 0) * 100)}%`}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              File ID: {result.file_upload_id}
                            </Typography>
                            <Rating 
                              value={result.overall_score || 0} 
                              precision={0.1} 
                              size="small" 
                              readOnly 
                              max={1}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < aiResultsData.length - 1 && <Box component="hr" sx={{ border: 'none', borderTop: 1, borderColor: 'divider', my: 1 }} />}
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <Button variant="contained" fullWidth startIcon={<Assignment />}>
            Review Queue
          </Button>
          <Button variant="outlined" fullWidth startIcon={<AssessmentOutlined />}>
            AI Analytics
          </Button>
          <Button variant="outlined" fullWidth startIcon={<Comment />}>
            Comments History
          </Button>
        </Box>
      </Paper>

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
