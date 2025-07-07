import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Download,
  FileDownload,
  ExpandMore,
  Assessment,
  TrendingUp,
  TrendingDown,
  Info,
  Refresh,
  Description,
} from '@mui/icons-material';
import { checklistsAPI, aiAPI, uploadsAPI } from '../services/api';

export const ChecklistUpload: React.FC = () => {
  const { id: checklistId } = useParams<{ id: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Always call hooks at the top level
  // Fetch AI results for uploaded file
  const { data: aiResults, refetch: refetchAIResults } = useQuery({
    queryKey: ['ai-results', uploadId],
    queryFn: () => (uploadId ? aiAPI.getResultByUpload(uploadId) : null),
    enabled: !!uploadId && !!checklistId,
  });

  // Fetch uploaded files for this checklist
  const { data: uploadedFiles, refetch: refetchUploadedFiles } = useQuery({
    queryKey: ['uploaded-files', checklistId],
    queryFn: () => uploadsAPI.search({ checklist_id: checklistId }),
    enabled: !!checklistId,
    select: (response) => response.data || [],
  });

  // File deduplication check
  const isDuplicateFile = (file: File) => {
    return uploadedFiles?.some(
      (uploaded: any) => 
        uploaded.filename === file.name && 
        Math.abs(uploaded.size - file.size) < 1000 // Allow small size differences
    );
  };

  // Enhanced upload mutation with better error handling
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!checklistId) {
        throw new Error('Checklist ID is required for upload');
      }

      // Check for duplicate files
      if (isDuplicateFile(file)) {
        throw new Error('A file with the same name and size has already been uploaded. Please choose a different file or rename this one.');
      }

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('File size must be less than 25MB');
      }

      // Validate file type
      const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        throw new Error(
          'Unsupported file type. Please upload PDF, DOC, DOCX, XLS, XLSX, TXT, or CSV files.'
        );
      }

      // Get file extension and set correct content type
      const mimeTypeMap: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        txt: 'text/plain',
      };

      const correctMimeType = fileExtension ? mimeTypeMap[fileExtension] : file.type;

      // Create a new File object with correct MIME type if needed
      const fileWithCorrectType =
        correctMimeType && correctMimeType !== file.type
          ? new File([file], file.name, { type: correctMimeType })
          : file;

      console.log('File details:', {
        name: fileWithCorrectType.name,
        type: fileWithCorrectType.type,
        size: fileWithCorrectType.size,
        checklistId: checklistId,
      });

      const formData = new FormData();
      formData.append('file', fileWithCorrectType);

      // Enhanced upload progress simulation
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 150);

      try {
        const response = await checklistsAPI.upload(checklistId, formData);
        clearInterval(interval);
        setUploadProgress(100);

        // Show success notification
        setSnackbarMessage('File uploaded successfully! Starting AI analysis...');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);

        return response.data;
      } catch (error: unknown) {
        clearInterval(interval);
        setUploadProgress(0);

        // Enhanced error handling
        let errorMessage = 'Upload failed. Please try again.';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as {
            response?: { status?: number; data?: { message?: string } };
          };
          if (axiosError.response?.status === 413) {
            errorMessage = 'File too large. Please upload a file smaller than 25MB.';
          } else if (axiosError.response?.status === 415) {
            errorMessage = 'Unsupported file type. Please upload a supported document format.';
          } else if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message;
          }
        }

        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);

        throw new Error(errorMessage);
      }
    },
    onSuccess: data => {
      setUploadId(data.upload_id || data.id);
      setIsAnalyzing(true);
      
      // Refresh uploaded files list
      refetchUploadedFiles();

      // Refetch AI results after successful upload with retry logic
      const retryFetchResults = async (retries = 3) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          await refetchAIResults();
          setIsAnalyzing(false);
        } catch (error) {
          console.error('Error fetching AI results:', error);
          if (retries > 0) {
            console.log(`Retrying AI results fetch... ${retries} attempts left`);
            setTimeout(() => retryFetchResults(retries - 1), 2000);
          } else {
            setIsAnalyzing(false);
            setSnackbarMessage(
              'AI analysis is taking longer than expected. Please refresh to check results.'
            );
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
          }
        }
      };

      retryFetchResults();
    },
    onError: () => {
      setUploadProgress(0);
      setIsAnalyzing(false);
    },
  });

  // Show error if no checklist ID is provided
  if (!checklistId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Invalid Checklist</Typography>
          <Typography>
            No checklist ID provided. Please navigate to a specific checklist to upload files.
          </Typography>
        </Alert>
      </Container>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle color="success" />;
    if (score >= 0.6) return <Warning color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const getTrendIcon = (score: number, target: number = 0.8) => {
    if (score >= target) return <TrendingUp color="success" />;
    return <TrendingDown color="error" />;
  };

  const exportData = async (format: 'json' | 'csv') => {
    if (!aiResults?.data) {
      setSnackbarMessage('No AI results available to export');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    try {
      const data = {
        file_analysis: {
          upload_id: uploadId,
          processed_at: aiResults.data.processed_at,
          overall_score: aiResults.data.overall_score,
          confidence_level: aiResults.data.confidence_level || 0.95,
        },
        category_breakdown: aiResults.data.category_scores,
        recommendations: aiResults.data.recommendations,
        identified_gaps: aiResults.data.gaps,
        export_metadata: {
          exported_at: new Date().toISOString(),
          format: format,
          checklist_id: checklistId,
        },
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esg-analysis-${uploadId}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvData = [
          ['Category', 'Score', 'Status'],
          ...Object.entries(data.category_breakdown).map(([category, score]) => [
            category,
            `${Math.round((score as number) * 100)}%`,
            (score as number) >= 0.8
              ? 'Good'
              : (score as number) >= 0.6
                ? 'Needs Improvement'
                : 'Critical',
          ]),
          ['', '', ''],
          ['Recommendations', '', ''],
          ...data.recommendations.map((rec: string) => [rec, '', '']),
          ['', '', ''],
          ['Identified Gaps', '', ''],
          ...data.identified_gaps.map((gap: string) => [gap, '', '']),
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esg-analysis-${uploadId}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setSnackbarMessage(`Analysis exported as ${format.toUpperCase()} successfully!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      setSnackbarMessage('Export failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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
        File Upload & AI Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Upload ESG documents for automated compliance analysis
      </Typography>

      {/* Upload Section */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Document
          </Typography>

          <Box sx={{ mb: 3 }}>
            <input
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                sx={{ mr: 2 }}
              >
                Choose File
              </Button>
            </label>

            {selectedFile && (
              <Chip
                label={selectedFile.name}
                onDelete={() => setSelectedFile(null)}
                sx={{ ml: 1 }}
              />
            )}
          </Box>

          {selectedFile && (
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              startIcon={<CloudUpload />}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload & Analyze'}
            </Button>
          )}

          {uploadMutation.isPending && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading and processing file... {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selectedFile && `${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
              </Typography>
            </Box>
          )}

          {isAnalyzing && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                AI analysis in progress... This may take a few moments.
              </Alert>
            </Box>
          )}

          {uploadMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                Upload Failed
              </Typography>
              <Typography variant="body2">
                {uploadMutation.error?.message || 'An unexpected error occurred. Please try again.'}
              </Typography>
            </Alert>
          )}

          {uploadMutation.isSuccess && !isAnalyzing && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                Upload Successful!
              </Typography>
              <Typography variant="body2">
                File uploaded successfully.{' '}
                {aiResults?.data ? 'AI analysis complete.' : 'AI analysis in progress...'}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
              📁 Uploaded Files ({uploadedFiles.length})
            </Typography>
            <List>
              {uploadedFiles.map((file: any, index: number) => (
                <React.Fragment key={file.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">{file.filename || `Document ${file.id}`}</Typography>
                          <Chip
                            label={file.status || 'uploaded'}
                            color={file.status === 'completed' ? 'success' : file.status === 'processing' ? 'warning' : 'default'}
                            size="small"
                          />
                          {file.ai_score && (
                            <Chip
                              label={`Score: ${Math.round(file.ai_score * 100)}%`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Uploaded: {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Unknown'}
                          {file.size && ` • Size: ${formatFileSize(file.size)}`}
                        </Typography>
                      }
                    />
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setUploadId(file.id);
                          refetchAIResults();
                        }}
                      >
                        View Analysis
                      </Button>
                    </Box>
                  </ListItem>
                  {index < uploadedFiles.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Enhanced AI Analysis Results */}
      {aiResults?.data && (
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5" component="h2" fontWeight={600}>
                🤖 AI Analysis Results
              </Typography>
              <Box display="flex" gap={1}>
                <Tooltip title="Refresh Analysis">
                  <IconButton color="info" onClick={() => refetchAIResults()} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export Results">
                  <IconButton
                    color="secondary"
                    onClick={() => setExportDialogOpen(true)}
                    size="small"
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Enhanced Score Display */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                mb: 3,
                '& > *': { flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' },
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  {getScoreIcon(aiResults.data.overall_score)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    Overall Score
                  </Typography>
                </Box>
                <Typography variant="h2" fontWeight={700}>
                  {Math.round(aiResults.data.overall_score * 100)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Compliance Level:{' '}
                  {aiResults.data.overall_score >= 0.8
                    ? 'Excellent'
                    : aiResults.data.overall_score >= 0.6
                      ? 'Good'
                      : 'Needs Improvement'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={aiResults.data.overall_score * 100}
                  sx={{ mt: 2, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.3)' }}
                />
              </Paper>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <Assessment />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    Categories
                  </Typography>
                </Box>
                <Typography variant="h2" fontWeight={700}>
                  {Object.keys(aiResults.data.category_scores || {}).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Areas Analyzed
                </Typography>
              </Paper>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                  <Info />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    Recommendations
                  </Typography>
                </Box>
                <Typography variant="h2" fontWeight={700}>
                  {aiResults.data.recommendations?.length || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Action Items
                </Typography>
              </Paper>
            </Box>

            {/* Enhanced Category Breakdown */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" fontWeight={600}>
                  📊 Category Performance Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    '& > *': { flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' },
                  }}
                >
                  {Object.entries(aiResults.data.category_scores || {}).map(([category, score]) => (
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }} key={category}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {category.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          {getTrendIcon(score as number)}
                          <Typography
                            variant="h6"
                            color={`${getScoreColor(score as number)}.main`}
                            sx={{ ml: 1 }}
                          >
                            {Math.round((score as number) * 100)}%
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(score as number) * 100}
                        color={getScoreColor(score as number)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {(score as number) >= 0.8
                          ? 'Excellent performance'
                          : (score as number) >= 0.6
                            ? 'Good, room for improvement'
                            : 'Needs immediate attention'}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Enhanced Recommendations */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" fontWeight={600}>
                  ✅ Recommendations ({aiResults.data.recommendations?.length || 0})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {aiResults.data.recommendations?.length > 0 ? (
                  <List>
                    {aiResults.data.recommendations.map((rec: string, index: number) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor: 'success.light',
                          borderRadius: 1,
                          mb: 1,
                          color: 'success.contrastText',
                        }}
                      >
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography fontWeight={500}>{rec}</Typography>} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    No specific recommendations available for this analysis.
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Enhanced Gaps Analysis */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" fontWeight={600}>
                  ⚠️ Identified Gaps ({aiResults.data.gaps?.length || 0})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {aiResults.data.gaps?.length > 0 ? (
                  <List>
                    {aiResults.data.gaps.map((gap: string, index: number) => (
                      <ListItem
                        key={index}
                        sx={{
                          bgcolor: 'error.light',
                          borderRadius: 1,
                          mb: 1,
                          color: 'error.contrastText',
                        }}
                      >
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography fontWeight={500}>{gap}</Typography>} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="success">No significant gaps identified in the analysis.</Alert>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Analysis Metadata */}
            <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                📅 Analysis completed: {new Date(aiResults.data.processed_at).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🔍 Upload ID: {uploadId}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export AI Analysis Results</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose the format for exporting your AI analysis results:
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {[
              {
                format: 'json' as const,
                title: 'JSON Format',
                description: 'Complete structured data with all analysis details',
                icon: <FileDownload />,
              },
              {
                format: 'csv' as const,
                title: 'CSV Format',
                description: 'Spreadsheet-friendly format for data analysis',
                icon: <FileDownload />,
              },
            ].map(({ format, title, description, icon }) => (
              <Paper
                key={format}
                elevation={exportFormat === format ? 3 : 1}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: exportFormat === format ? 2 : 0,
                  borderColor: 'primary.main',
                  '&:hover': { elevation: 3 },
                }}
                onClick={() => setExportFormat(format)}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {icon}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => exportData(exportFormat)}
            startIcon={<Download />}
          >
            Export {exportFormat.toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
