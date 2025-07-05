import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import { CloudUpload, Assessment } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { checklistsAPI, realtimeAnalyticsAPI } from '../services/api';

interface UploadStatus {
  uploadId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  score?: number;
  feedback?: string;
  error?: string;
}

export const FileUploader: React.FC = () => {
  const { checklistId } = useParams<{ checklistId: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!checklistId) {
        setError('No checklist ID provided');
        setShowError(true);
        return;
      }

      if (acceptedFiles.length === 0) {
        setError('No files selected');
        setShowError(true);
        return;
      }

      const file = acceptedFiles[0];

      try {
        setIsUploading(true);
        setError(null);
        setUploadStatus(null);

        console.log('Uploading file:', file.name, 'to checklist:', checklistId);
        console.log('File size:', file.size, 'bytes');

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);

        console.log('Starting file upload and AI analysis - this may take up to 3 minutes...');

        // Upload file with extended timeout
        const uploadResponse = await checklistsAPI.upload(checklistId, formData);

        if (uploadResponse.status === 200) {
          // Backend processes file synchronously and returns result immediately
          const { file_id, filename, ai_score, ai_feedback } = uploadResponse.data;
          console.log('Upload completed successfully:', { file_id, filename, ai_score });

          // Track the upload event for real-time analytics
          try {
            await realtimeAnalyticsAPI.trackEvent({
              action_type: 'file_upload',
              action_description: `File uploaded successfully: ${filename}`,
              resource_type: 'file',
              resource_id: file_id.toString(),
              metadata: {
                filename,
                ai_score,
                file_size: file.size,
                checklist_id: checklistId,
              },
            });
            console.log('📊 Tracked file upload event for real-time analytics');
          } catch (trackError) {
            console.warn('Failed to track upload event:', trackError);
            // Don't fail the upload if tracking fails
          }

          // Set final status immediately since processing is done
          setUploadStatus({
            uploadId: file_id.toString(),
            status: 'done',
            score: ai_score,
            feedback: ai_feedback,
          });
        } else {
          throw new Error(`Unexpected response status: ${uploadResponse.status}`);
        }
      } catch (error: unknown) {
        console.error('Upload error:', error);
        let errorMessage = 'Upload failed';

        const axiosError = error as {
          code?: string;
          message?: string;
          response?: {
            status?: number;
            data?: { message?: string; detail?: string };
          };
        };

        if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
          errorMessage =
            'Upload timed out. Please try again with a smaller file or check your internet connection.';
        } else if (axiosError.response?.status === 413) {
          errorMessage = 'File too large. Please try a smaller file.';
        } else if (axiosError.response?.status === 422) {
          errorMessage = 'Invalid file format. Please upload a PDF, DOCX, TXT, CSV, or XLSX file.';
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }

        setError(errorMessage);
        setShowError(true);
      } finally {
        setIsUploading(false);
      }
    },
    [checklistId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  const renderUploadArea = () => (
    <Paper
      {...getRootProps()}
      elevation={2}
      sx={{
        border: `2px dashed ${isDragActive ? 'primary.main' : 'grey.300'}`,
        borderRadius: 2,
        padding: 4,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'action.hover',
        },
      }}
    >
      <input {...getInputProps()} />
      <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {isDragActive ? 'Drop the file here' : 'Upload ESG Document'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Drag and drop a file here, or click to select
      </Typography>
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        Supported formats: PDF, DOCX, TXT, CSV, XLSX
      </Typography>
    </Paper>
  );

  const renderProcessing = () => (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="h6">
            {uploadStatus?.status === 'pending' ? 'Uploading...' : 'Processing Document...'}
          </Typography>
        </Box>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Our AI is analyzing your document for ESG compliance. This may take up to 3 minutes.
        </Typography>
      </CardContent>
    </Card>
  );

  const renderResults = () => {
    if (!uploadStatus || uploadStatus.status !== 'done') return null;

    return (
      <Card elevation={3} sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Assessment sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
            <Typography variant="h5" component="h2">
              AI Analysis Complete
            </Typography>
          </Box>

          {/* Score Display */}
          <Box textAlign="center" mb={3}>
            <Typography variant="h2" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {uploadStatus.score !== undefined
                ? `${Math.round(uploadStatus.score * 100)}%`
                : 'N/A'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              ESG Compliance Score
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Score: {uploadStatus.score !== undefined ? uploadStatus.score.toFixed(3) : 'N/A'} /
              1.000
            </Typography>
          </Box>

          {/* Feedback Section */}
          {uploadStatus.feedback && (
            <Paper
              elevation={1}
              sx={{
                p: 3,
                backgroundColor: 'grey.50',
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              <Typography variant="h6" gutterBottom>
                AI Feedback & Recommendations
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {uploadStatus.feedback}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderError = () => {
    if (!uploadStatus || uploadStatus.status !== 'error') return null;

    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Processing Failed</Typography>
        <Typography variant="body2">
          {uploadStatus.error || 'An error occurred while processing your document'}
        </Typography>
      </Alert>
    );
  };

  if (!checklistId) {
    return (
      <Alert severity="error">
        No checklist ID provided. Please navigate from a valid checklist.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Document Upload & AI Analysis
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload your ESG-related documents for AI-powered compliance analysis
      </Typography>

      {!isUploading && !uploadStatus && renderUploadArea()}

      {(isUploading ||
        (uploadStatus && uploadStatus.status !== 'done' && uploadStatus.status !== 'error')) &&
        renderProcessing()}

      {renderResults()}
      {renderError()}

      {/* Reset button */}
      {uploadStatus && (
        <Box mt={3} textAlign="center">
          <Button
            variant="outlined"
            onClick={() => {
              setUploadStatus(null);
              setError(null);
            }}
          >
            Upload Another Document
          </Button>
        </Box>
      )}

      {/* Error Snackbar */}
      <Snackbar open={showError} autoHideDuration={6000} onClose={() => setShowError(false)}>
        <Alert onClose={() => setShowError(false)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};
