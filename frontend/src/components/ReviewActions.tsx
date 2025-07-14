import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Comment as CommentIcon,
  AssessmentOutlined,
} from '@mui/icons-material';
import { uploadsAPI, aiAPI } from '../services/api';

interface ReviewActionsProps {
  open: boolean;
  onClose: () => void;
  uploadId: number;
  filename: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

interface AIAnalysis {
  id: number;
  overall_score: number;
  analysis: string;
  created_at: string;
  status: string;
  feedback?: any;
}

export const ReviewActions: React.FC<ReviewActionsProps> = ({
  open,
  onClose,
  uploadId,
  filename,
  currentStatus,
  onStatusChange,
}) => {
  const [comment, setComment] = useState('');
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open && uploadId) {
      fetchAIAnalysis();
    }
  }, [open, uploadId]);

  const fetchAIAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.getResultByUpload(uploadId.toString());
      console.log('AI Analysis response in ReviewActions:', response);
      
      if (response?.data?.results && response.data.results.length > 0) {
        setAIAnalysis(response.data.results[0]);
      } else {
        setAIAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAIAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'approved' | 'rejected') => {
    if (!comment.trim()) {
      setError('Please provide a comment for your review decision.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Update the upload status
      await uploadsAPI.updateStatus(uploadId, {
        status: newStatus,
        comment: comment.trim(),
        reviewer_notes: comment.trim(),
      });

      // Call the callback if provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      // Close the dialog
      onClose();
      setComment('');
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update review status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      setError('Please provide a comment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await uploadsAPI.addComment(uploadId, {
        comment: comment.trim(),
        comment_type: 'reviewer_note',
      });

      setComment('');
      setError(null);
      // Optionally refresh data or show success message
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'processing': return 'info';
      default: return 'default';
    }
  };

  const formatScore = (score: any): string => {
    if (score === null || score === undefined) return '0%';
    
    // Handle both overall_score and score fields
    const scoreValue = score.overall_score || score.score || score;
    
    if (isNaN(scoreValue)) return '0%';
    const numScore = typeof scoreValue === 'string' ? parseFloat(scoreValue) : scoreValue;
    if (isNaN(numScore)) return '0%';
    
    // Handle both 0-1 and 0-100 scale
    const percentage = numScore <= 1 ? Math.round(numScore * 100) : Math.round(numScore);
    return `${percentage}%`;
  };

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 0.7) return 'success';
    if (score >= 0.5) return 'warning';
    return 'error';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Review Actions</Typography>
          <Chip 
            label={currentStatus.toUpperCase()} 
            color={getStatusColor(currentStatus) as any}
            size="small" 
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {filename}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* AI Analysis Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            AI Analysis Results
          </Typography>
          
          {loading ? (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">Loading AI analysis...</Typography>
            </Box>
          ) : aiAnalysis ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  icon={<AssessmentOutlined />}
                  label={`AI Score: ${formatScore(aiAnalysis.overall_score)}`}
                  color={getScoreColor(aiAnalysis.overall_score)}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Analyzed: {aiAnalysis.created_at || aiAnalysis.updated_at ? 
                    new Date(aiAnalysis.created_at || aiAnalysis.updated_at).toLocaleDateString() : 
                    'Unknown date'}
                </Typography>
              </Box>
              
              {aiAnalysis.analysis && (
                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2">
                    {aiAnalysis.analysis}
                  </Typography>
                </Box>
              )}

              {aiAnalysis.feedback && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Detailed Feedback:
                  </Typography>
                  <List dense>
                    {Object.entries(aiAnalysis.feedback).map(([key, value]) => (
                      <ListItem key={key} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          secondary={String(value)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              No AI analysis available for this upload yet.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Review Actions Section */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Review Decision
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Review Comments"
            placeholder="Provide your review comments and decision rationale..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 2 }}
            required
          />

          <Typography variant="caption" color="text.secondary">
            Comments are required for approval or rejection decisions.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentStatus !== 'approved' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleStatusChange('approved')}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? <CircularProgress size={20} /> : 'Approve'}
            </Button>
          )}
          
          {currentStatus !== 'rejected' && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={() => handleStatusChange('rejected')}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? <CircularProgress size={20} /> : 'Reject'}
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<CommentIcon />}
            onClick={handleAddComment}
            disabled={submitting || !comment.trim()}
          >
            Add Comment
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};