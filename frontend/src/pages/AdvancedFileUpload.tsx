import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Delete,
  Visibility,
  Download,
  InsertDriveFile,
  Assessment,
} from '@mui/icons-material';
import { checklistsAPI, aiAPI } from '../services/api';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  aiResults?: any;
  error?: string;
}

export const AdvancedFileUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Select Files',
    'Upload & Process',
    'AI Analysis',
    'Review Results'
  ];

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Create temporary file entry
      const tempFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        status: 'uploading',
      };
      
      setUploadedFiles(prev => [...prev, tempFile]);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === tempFile.id 
              ? { ...f, uploadProgress: Math.min(f.uploadProgress + 10, 90) }
              : f
          )
        );
      }, 200);
      
      try {
        const response = await checklistsAPI.upload('default', formData);
        clearInterval(progressInterval);
        
        // Update file status
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === tempFile.id 
              ? { 
                  ...f, 
                  uploadProgress: 100, 
                  status: 'processing',
                  id: response.data.id 
                }
              : f
          )
        );
        
        // Start AI processing
        setTimeout(() => {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === response.data.id 
                ? { ...f, status: 'completed' }
                : f
            )
          );
        }, 2000);
        
        return response;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === tempFile.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  error: 'Upload failed' 
                }
              : f
          )
        );
        throw error;
      }
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      uploadMutation.mutate(file);
    });
    if (activeStep === 0) setActiveStep(1);
  }, [uploadMutation, activeStep]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handlePreview = async (file: UploadedFile) => {
    try {
      const aiResults = await aiAPI.getResultByUpload(file.id);
      setSelectedFile({ ...file, aiResults: aiResults.data });
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch AI results:', error);
    }
  };

  const handleDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <Assessment color="info" />;
      case 'uploading':
        return <CloudUpload color="primary" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InsertDriveFile />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'uploading':
        return 'primary';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        Advanced File Upload & Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload multiple ESG documents for comprehensive AI-powered compliance analysis
      </Typography>

      {/* Progress Stepper */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="horizontal">
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Drag & Drop Upload Area */}
      <Card 
        elevation={2} 
        sx={{ 
          mb: 4,
          border: isDragActive ? '2px dashed #1976d2' : '2px dashed #e0e0e0',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              textAlign: 'center',
              py: 6,
              cursor: 'pointer',
              borderRadius: 1,
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supported formats: PDF, DOC, DOCX, XLS, XLSX, TXT (Max 10MB each)
            </Typography>
            <Button variant="contained" size="large">
              Choose Files
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card elevation={2} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Uploaded Files ({uploadedFiles.length})
            </Typography>
            <List>
              {uploadedFiles.map((file) => (
                <ListItem
                  key={file.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    {getStatusIcon(file.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">{file.name}</Typography>
                        <Chip
                          label={file.status}
                          color={getStatusColor(file.status) as any}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                        {file.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={file.uploadProgress}
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        )}
                        {file.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {file.error}
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                  <Box display="flex" gap={1}>
                    {file.status === 'completed' && (
                      <Tooltip title="View AI Analysis">
                        <IconButton
                          color="primary"
                          onClick={() => handlePreview(file)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* AI Results Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          AI Analysis Results: {selectedFile?.name}
        </DialogTitle>
        <DialogContent>
          {selectedFile?.aiResults ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Overall Compliance Score
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Typography variant="h3" color="primary.main">
                  {Math.round((selectedFile.aiResults.overall_score || 0) * 100)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(selectedFile.aiResults.overall_score || 0) * 100}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Category Breakdown
              </Typography>
              {Object.entries(selectedFile.aiResults.category_scores || {}).map(([category, score]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{category}</Typography>
                    <Typography variant="body2" color="primary.main">
                      {Math.round((score as number) * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(score as number) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
              
              {selectedFile.aiResults.recommendations && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Recommendations
                  </Typography>
                  <List>
                    {selectedFile.aiResults.recommendations.map((rec: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          ) : (
            <Alert severity="info">Loading AI analysis results...</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>
            Export Report
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
