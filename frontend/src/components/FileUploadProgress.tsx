import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
} from '@mui/material';
import { Description, CheckCircle, Error, Cancel, CloudUpload } from '@mui/icons-material';

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  aiAnalysis?: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    results?: Record<string, unknown>;
  };
}

interface FileUploadProgressProps {
  files: UploadFile[];
  onRemove?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  files,
  onRemove,
  onRetry,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'primary' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
      case 'processing':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (file: UploadFile) => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'uploading':
      case 'processing':
        return <CloudUpload color="primary" />;
      default:
        return <Description />;
    }
  };

  const getProgressValue = (file: UploadFile) => {
    if (file.status === 'completed') return 100;
    if (file.status === 'error') return 0;
    if (file.status === 'processing' && file.aiAnalysis?.progress) {
      return file.aiAnalysis.progress;
    }
    return file.progress;
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'uploading':
        return `Uploading... ${file.progress}%`;
      case 'processing':
        if (file.aiAnalysis?.status === 'processing') {
          return `AI Analysis in progress... ${file.aiAnalysis.progress || 0}%`;
        }
        return 'Processing...';
      case 'completed':
        return 'Upload completed';
      case 'error':
        return file.error || 'Upload failed';
      default:
        return 'Pending...';
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        File Upload Progress
      </Typography>
      <List>
        {files.map(file => (
          <ListItem key={file.id} divider>
            <ListItemIcon>{getStatusIcon(file)}</ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" noWrap>
                    {file.name}
                  </Typography>
                  <Chip
                    label={file.status.toUpperCase()}
                    size="small"
                    color={getStatusColor(file.status)}
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)} • {getStatusText(file)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue(file)}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                    }}
                    color={
                      file.status === 'error'
                        ? 'error'
                        : file.status === 'completed'
                          ? 'success'
                          : 'primary'
                    }
                  />
                  {file.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {file.error}
                    </Alert>
                  )}
                  {file.aiAnalysis?.results &&
                    typeof file.aiAnalysis.results === 'object' &&
                    file.aiAnalysis.results !== null && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="success.main">
                          ✓ AI Analysis completed - {Object.keys(file.aiAnalysis.results).length}{' '}
                          insights found
                        </Typography>
                      </Box>
                    )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              {file.status === 'error' && onRetry && (
                <IconButton onClick={() => onRetry(file.id)} size="small" color="primary">
                  <CloudUpload />
                </IconButton>
              )}
              {onRemove && (
                <IconButton onClick={() => onRemove(file.id)} size="small" color="error">
                  <Cancel />
                </IconButton>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default FileUploadProgress;
