import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  Close,
  Download,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  RotateRight,
} from '@mui/icons-material';
import { uploadsAPI } from '../services/api';

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  uploadId: number;
  filename: string;
  fileSize?: number;
}

interface FileData {
  id: number;
  filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  status: string;
  download_url?: string;
  preview_url?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  open,
  onClose,
  uploadId,
  filename,
  fileSize,
}) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && uploadId) {
      fetchFileData();
    }
  }, [open, uploadId]);

  const fetchFileData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use search endpoint to get file data
      const response = await uploadsAPI.search({ limit: 100 });
      const file = response.data?.results?.find((f: any) => f.id === uploadId);
      if (file) {
        setFileData({
          id: file.id,
          filename: file.filename,
          file_size: file.file_size,
          mime_type: file.mime_type,
          uploaded_at: file.uploaded_at,
          status: file.status,
        });
      } else {
        setError('File not found');
      }
    } catch (error) {
      console.error('Error fetching file data:', error);
      setError('File data temporarily unavailable. File viewing will be implemented in a future update.');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
    if (['txt', 'md', 'csv'].includes(extension)) return 'text';
    if (['doc', 'docx'].includes(extension)) return 'document';
    if (['xls', 'xlsx'].includes(extension)) return 'spreadsheet';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    
    return 'unknown';
  };

  const handleDownload = async () => {
    try {
      const response = await uploadsAPI.download(uploadId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            Document Information
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Document viewing functionality is being implemented.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            File: <strong>{filename}</strong>
          </Typography>
          <Typography variant="body2">
            ID: <strong>{uploadId}</strong>
          </Typography>
        </Box>
      );
    }

    if (!fileData) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No file data available
        </Alert>
      );
    }

    const fileType = getFileType(filename);
    const downloadUrl = `/api/v1/uploads/${uploadId}/download`;

    switch (fileType) {
      case 'pdf':
        return (
          <Box sx={{ height: '600px', width: '100%' }}>
            <iframe
              src={`${downloadUrl}#zoom=${zoom}&rotate=${rotation}`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={filename}
            />
          </Box>
        );

      case 'image':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              maxHeight: '600px',
              overflow: 'auto'
            }}
          >
            <img
              src={downloadUrl}
              alt={filename}
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>
        );

      case 'text':
        return (
          <Paper sx={{ p: 2, maxHeight: '600px', overflow: 'auto' }}>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: `${zoom}%` }}>
              <FileContentLoader uploadId={uploadId} />
            </Typography>
          </Paper>
        );

      case 'document':
      case 'spreadsheet':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              {fileType === 'document' ? 'Word Document' : 'Spreadsheet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This file type cannot be previewed directly. Click download to view in the appropriate application.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              sx={{ mt: 2 }}
            >
              Download {filename}
            </Button>
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <video
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                transform: `scale(${zoom / 100})`,
              }}
            >
              <source src={downloadUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <audio controls style={{ width: '100%' }}>
              <source src={downloadUrl} type="audio/mpeg" />
              Your browser does not support the audio tag.
            </audio>
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Document Viewer
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Document viewing functionality will be available in a future update.
              For now, you can review the file information above.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              File: <strong>{filename}</strong>
            </Typography>
            <Typography variant="body2">
              Status: <strong>{fileData?.status || 'Unknown'}</strong>
            </Typography>
          </Box>
        );
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canZoom = ['pdf', 'image', 'text'].includes(getFileType(filename));
  const canRotate = ['pdf', 'image'].includes(getFileType(filename));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="span">
              {filename}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label={getFileType(filename).toUpperCase()} 
                size="small" 
                color="primary" 
              />
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(fileData?.file_size || fileSize)}
              </Typography>
              {fileData?.status && (
                <Chip 
                  label={fileData.status.toUpperCase()} 
                  size="small" 
                  color={fileData.status === 'approved' ? 'success' : 
                         fileData.status === 'rejected' ? 'error' : 'warning'} 
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {renderFileContent()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canZoom && (
            <>
              <IconButton 
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
                title="Zoom Out"
              >
                <ZoomOut />
              </IconButton>
              <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px' }}>
                {zoom}%
              </Typography>
              <IconButton 
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                title="Zoom In"
              >
                <ZoomIn />
              </IconButton>
            </>
          )}
          {canRotate && (
            <IconButton 
              onClick={() => setRotation((rotation + 90) % 360)}
              title="Rotate"
            >
              <RotateRight />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            startIcon={<Download />} 
            onClick={handleDownload}
            variant="outlined"
          >
            Download
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

// Helper component to load text file content
const FileContentLoader: React.FC<{ uploadId: number }> = ({ uploadId }) => {
  const [content, setContent] = useState<string>('Loading...');

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await uploadsAPI.download(uploadId);
        const text = await response.data.text();
        setContent(text);
      } catch (error) {
        setContent('Error loading file content');
      }
    };
    loadContent();
  }, [uploadId]);

  return <>{content}</>;
};