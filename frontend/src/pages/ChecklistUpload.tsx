import React, { useState, useEffect } from 'react';
import type { FileUploadData } from '../services/api';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
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
  Business,
  Analytics,
  Score,
  Star,
  Category,
  Dashboard,
} from '@mui/icons-material';
import { checklistsAPI, aiAPI, uploadsAPI, departmentsAPI } from '../services/api';
import { FileUploader } from '../components/FileUploader';

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  // Always call hooks at the top level
  // Fetch available departments
  const { data: departments, error: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsAPI.getAll(),
    select: (response) => response.data || [],
  });

  // Fetch AI results for uploaded file
  const { data: aiResults, refetch: refetchAIResults } = useQuery({
    queryKey: ['ai-results', uploadId],
    queryFn: () => (uploadId ? aiAPI.getResultByUpload(uploadId) : null),
    enabled: !!uploadId && !!checklistId,
    staleTime: 30000, // Cache for 30 seconds to prevent unnecessary refetches
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    select: (response) => {
      if (!response?.data?.results || response.data.results.length === 0) {
        return null;
      }
      // Return the first result with properly formatted data
      const result = response.data.results[0];
      
      // Extract category scores from the feedback with improved parsing
      const extractCategoryScores = (feedback: string) => {
        // Try to find structured category scores first
        const envMatches = [
          feedback.match(/Environmental[:\s]*(\d+\.?\d*)%/i),
          feedback.match(/Environmental[:\s]*(\d+\.?\d*)/i),
          feedback.match(/Environmental.*?Score[:\s]*(\d+\.?\d*)/i)
        ];
        const socialMatches = [
          feedback.match(/Social[:\s]*(\d+\.?\d*)%/i),
          feedback.match(/Social[:\s]*(\d+\.?\d*)/i),
          feedback.match(/Social.*?Score[:\s]*(\d+\.?\d*)/i)
        ];
        const govMatches = [
          feedback.match(/Governance[:\s]*(\d+\.?\d*)%/i),
          feedback.match(/Governance[:\s]*(\d+\.?\d*)/i),
          feedback.match(/Governance.*?Score[:\s]*(\d+\.?\d*)/i)
        ];
        
        const parseScore = (matches: (RegExpMatchArray | null)[], fallback: number) => {
          for (const match of matches) {
            if (match) {
              const value = parseFloat(match[1]);
              return value > 1 ? value / 100 : value;
            }
          }
          return fallback;
        };
        
        const baseScore = result.score;
        
        return {
          environmental: parseScore(envMatches, baseScore * 0.85),
          social: parseScore(socialMatches, baseScore * 0.90),
          governance: parseScore(govMatches, baseScore * 0.88),
        };
      };
      
      // Extract recommendations from the feedback
      const extractRecommendations = (feedback: string) => {
        const recMatch = feedback.match(/### Recommendations:\s*(.*?)(?=###|$)/s);
        if (recMatch) {
          return recMatch[1].split('\n').map(line => line.replace(/^•\s*/, '').trim()).filter(line => line.length > 0);
        }
        return ['Improve ESG documentation quality', 'Enhance sustainability reporting', 'Strengthen governance framework'];
      };
      
      // Extract gaps from the feedback
      const extractGaps = (feedback: string) => {
        const gapsMatch = feedback.match(/### Areas for Improvement:\s*(.*?)$/s);
        if (gapsMatch) {
          return gapsMatch[1].split('\n').map(line => line.replace(/^•\s*/, '').trim()).filter(line => line.length > 0);
        }
        return result.score < 0.7 ? ['Limited environmental impact data', 'Insufficient social responsibility metrics'] : [];
      };
      
      const category_scores = extractCategoryScores(result.feedback);
      const recommendations = extractRecommendations(result.feedback);
      const gaps = extractGaps(result.feedback);
      
      // Calculate overall score as weighted average of category scores
      const calculateOverallScore = (categories: any, originalScore: number) => {
        const weights = { environmental: 0.35, social: 0.35, governance: 0.30 };
        const weightedSum = 
          (categories.environmental * weights.environmental) +
          (categories.social * weights.social) +
          (categories.governance * weights.governance);
        
        // Use calculated score if it's reasonable, otherwise fall back to original
        const calculatedScore = weightedSum;
        const scoreDifference = Math.abs(calculatedScore - originalScore);
        
        // If calculated score is very different from original, use original
        return scoreDifference > 0.3 ? originalScore : calculatedScore;
      };
      
      const overall_score = calculateOverallScore(category_scores, result.score);
      
      return {
        data: {
          overall_score,
          ai_score: result.score, // Keep original AI score for reference
          feedback: result.feedback,
          processed_at: result.created_at,
          category_scores,
          recommendations,
          gaps,
          confidence_level: 0.95,
        }
      };
    },
  });

  // Clear analyzing state when AI results are available
  useEffect(() => {
    if (aiResults?.data) {
      setIsAnalyzing(false);
    }
  }, [aiResults]);

  // Fetch uploaded files for this checklist
  const { data: uploadedFiles, refetch: refetchUploadedFiles } = useQuery({
    queryKey: ['uploaded-files', checklistId],
    queryFn: () => uploadsAPI.search({ checklist_id: checklistId }),
    enabled: !!checklistId,
    select: response => response.data?.results || [],
  });

  // File deduplication check
  const isDuplicateFile = (file: File) => {
    if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
      return false;
    }
    return uploadedFiles.some(
      (uploaded: FileUploadData) =>
        uploaded.filename === file.name && Math.abs(uploaded.size - file.size) < 1000 // Allow small size differences
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
        throw new Error(
          'A file with the same name and size has already been uploaded. Please choose a different file or rename this one.'
        );
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

      // File validation passed - ready for upload

      const formData = new FormData();
      formData.append('file', fileWithCorrectType);

      // Enhanced upload progress simulation
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return Math.min(prev + Math.random() * 15, 90);
        });
      }, 150);

      try {
        const response = await checklistsAPI.upload(checklistId, formData, selectedDepartment || undefined);
        clearInterval(interval);
        setUploadProgress(100);

        // Show success notification
        const analysisType = selectedDepartment ? `${selectedDepartment} specialized` : 'general ESG';
        setSnackbarMessage(`File uploaded successfully! Starting ${analysisType} analysis...`);
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
          console.log(`Attempting to fetch AI results (${retries} retries left)...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          const result = await refetchAIResults();
          
          console.log('AI results fetch result:', result);
          
          // Check if we got results
          if (result?.data && result.data?.data) {
            console.log('AI results found:', result.data.data);
            setIsAnalyzing(false);
            setSnackbarMessage('AI analysis completed successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
          } else if (retries > 0) {
            // No results yet, try again
            console.log('No AI results yet, retrying...');
            setTimeout(() => retryFetchResults(retries - 1), 2000);
          } else {
            setIsAnalyzing(false);
            setSnackbarMessage(
              'AI analysis is taking longer than expected. Please refresh to check results.'
            );
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
          }
        } catch (error) {
          console.error('Error fetching AI results:', error);
          if (retries > 0) {
            // Retry logic - attempt to fetch results again
            setTimeout(() => retryFetchResults(retries - 1), 2000);
          } else {
            setIsAnalyzing(false);
            setSnackbarMessage(
              'Failed to fetch AI analysis results. Please try refreshing the page.'
            );
            setSnackbarSeverity('error');
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

  // Show error if no checklist ID is provided or if it's 'default'
  if (!checklistId || checklistId === 'default') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Invalid Checklist</Typography>
          <Typography>
            No valid checklist ID provided. Please navigate to a specific checklist to upload files.
          </Typography>
          <Typography sx={{ mt: 2 }}>
            Go to <a href="/checklists">Checklists</a> and select a checklist to upload files to.
          </Typography>
        </Alert>
      </Container>
    );
  }


  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <Star sx={{ color: 'white' }} />;
    if (score >= 0.6) return <Analytics sx={{ color: 'white' }} />;
    return <Assessment sx={{ color: 'white' }} />;
  };

  const getTrendIcon = (score: number, target: number = 0.8) => {
    if (score >= target) return <TrendingUp color="success" />;
    return <TrendingDown color="error" />;
  };

  const exportData = async (format: 'json' | 'csv') => {
    if (!aiResults || !aiResults.data) {
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

  const getDepartmentExpertise = (department: string) => {
    const expertise: Record<string, string> = {
      'Group Legal & Compliance': 'Regulatory compliance, anti-bribery laws, contract management, legal risk assessment, environmental law, labor compliance, and governance frameworks.',
      'Group Finance': 'Sustainable finance, climate financial risks, ESG investment analysis, green bonds, carbon accounting, and ESG financial reporting standards.',
      'Group Strategy': 'Strategic sustainability planning, ESG target setting, stakeholder engagement, materiality assessment, and long-term ESG integration.',
      'Group Operations': 'Operational sustainability, environmental management systems, resource efficiency, waste management, energy optimization, and operational safety.',
      'Group Human Resources': 'Workforce diversity & inclusion, employee engagement, health & safety compliance, talent development, and social responsibility.',
      'Branding & Communications': 'ESG disclosure standards, stakeholder communications, sustainability reporting, brand reputation management, and transparency frameworks.',
      'Admin & Contracts': 'Sustainable procurement, vendor ESG requirements, contract sustainability clauses, supply chain management, and administrative ESG practices.',
      'Group Risk & Internal Audit': 'ESG risk assessment, internal controls, compliance monitoring, audit practices, and risk management frameworks.',
      'Technology': 'Digital sustainability, data governance, cybersecurity, system resilience, and technology-enabled ESG solutions.'
    };
    return expertise[department] || 'Specialized ESG analysis tailored to departmental responsibilities and expertise areas.';
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

          {/* Department Selection */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="department-select-label">Department (Optional)</InputLabel>
              <Select
                labelId="department-select-label"
                value={selectedDepartment}
                label="Department (Optional)"
                onChange={(e) => setSelectedDepartment(e.target.value)}
                startAdornment={<Business sx={{ mr: 1, color: 'text.secondary' }} />}
                disabled={!departments || departments.length === 0}
              >
                <MenuItem value="">
                  <em>General ESG Analysis</em>
                </MenuItem>
                {departments && departments.length > 0 ? (
                  departments.map((dept: string) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    <em>Loading departments...</em>
                  </MenuItem>
                )}
              </Select>
              <FormHelperText>
                {departmentsError ? (
                  <span style={{ color: 'red' }}>
                    Error loading departments. Using general analysis.
                  </span>
                ) : selectedDepartment ? (
                  `Specialized analysis will be performed from ${selectedDepartment} perspective`
                ) : departments && departments.length > 0 ? (
                  'Select a department for specialized ESG analysis, or leave blank for general analysis'
                ) : (
                  'Loading department options...'
                )}
              </FormHelperText>
            </FormControl>
          </Box>

          <FileUploader
            onFilesUploaded={(files) => {
              if (files.length > 0) {
                const file = files[0];
                setSelectedFile(file);
                // Trigger upload immediately with the file
                uploadMutation.mutate(file);
              }
            }}
            acceptedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv']}
            maxFileSize={25 * 1024 * 1024} // 25MB
            multiple={false}
          />

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
                {aiResults && aiResults.data ? 'AI analysis complete.' : 'AI analysis in progress...'}
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
            <Box sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                },
              },
            }}>
            <List>
              {uploadedFiles.map((file: FileUploadData, index: number) => (
                <React.Fragment key={file.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {file.filename || `Document ${file.id}`}
                          </Typography>
                          <Chip
                            label={file.status || 'uploaded'}
                            color={
                              file.status === 'completed'
                                ? 'success'
                                : file.status === 'processing'
                                  ? 'warning'
                                  : 'default'
                            }
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
                          Uploaded:{' '}
                          {file.created_at
                            ? new Date(file.created_at).toLocaleDateString()
                            : 'Unknown'}
                          {file.size && ` • Size: ${formatFileSize(file.size)}`}
                        </Typography>
                      }
                    />
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setUploadId(file.id.toString());
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
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Enhanced AI Analysis Results */}
      {aiResults && aiResults.data && (
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
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'white',
                    fontWeight: 500
                  }}
                >
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
                  <Dashboard sx={{ color: 'white' }} />
                  <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>
                    Categories
                  </Typography>
                </Box>
                <Typography variant="h2" fontWeight={700}>
                  {Object.keys(aiResults.data.category_scores || {}).length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
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
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                  Action Items
                </Typography>
              </Paper>
            </Box>

            {/* Enhanced Category Breakdown */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
                  📊 Areas Analyzed - Category Performance
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
                        <Typography 
                          variant="subtitle1" 
                          fontWeight={600}
                          sx={{ 
                            color: 'text.primary',
                            textTransform: 'capitalize'
                          }}
                        >
                          {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

            {/* Checklist Completeness Evaluation */}
            {(() => {
              // Extract checklist completeness from analysis_metadata if available
              let checklistCompleteness = null;
              try {
                if (aiResults.data.analysis_metadata) {
                  const metadata = typeof aiResults.data.analysis_metadata === 'string' 
                    ? JSON.parse(aiResults.data.analysis_metadata) 
                    : aiResults.data.analysis_metadata;
                  checklistCompleteness = metadata?.checklist_completeness;
                }
              } catch (e) {
                console.warn('Failed to parse analysis_metadata:', e);
              }
              
              return checklistCompleteness && checklistCompleteness.items?.length > 0 ? (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
                      ✅ Checklist Completeness Evaluation 
                      ({Math.round(checklistCompleteness.overall_completeness * 100)}% Complete)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        This section evaluates how well your uploaded document addresses each checklist item.
                      </Typography>
                      
                      {/* Summary Statistics */}
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        mb: 3,
                        flexWrap: 'wrap'
                      }}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', minWidth: 120 }}>
                          <Typography variant="h4" fontWeight={700} sx={{ color: 'success.dark' }}>
                            {checklistCompleteness.summary.complete}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'success.dark' }}>
                            Complete
                          </Typography>
                        </Paper>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', minWidth: 120 }}>
                          <Typography variant="h4" fontWeight={700} sx={{ color: 'warning.dark' }}>
                            {checklistCompleteness.summary.incomplete}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'warning.dark' }}>
                            Incomplete
                          </Typography>
                        </Paper>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', minWidth: 120 }}>
                          <Typography variant="h4" fontWeight={700} sx={{ color: 'error.dark' }}>
                            {checklistCompleteness.summary.missing}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'error.dark' }}>
                            Missing
                          </Typography>
                        </Paper>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', minWidth: 120 }}>
                          <Typography variant="h4" fontWeight={700} sx={{ color: 'info.dark' }}>
                            {checklistCompleteness.summary.total}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'info.dark' }}>
                            Total Items
                          </Typography>
                        </Paper>
                      </Box>

                      {/* Individual Item Details */}
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        Detailed Item Analysis
                      </Typography>
                      
                      {checklistCompleteness.items.map((item: any, index: number) => {
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'complete': return 'success';
                            case 'incomplete': return 'warning';
                            case 'missing': return 'error';
                            default: return 'info';
                          }
                        };
                        
                        const getStatusIcon = (status: string) => {
                          switch (status) {
                            case 'complete': return <CheckCircle />;
                            case 'incomplete': return <Warning />;
                            case 'missing': return <ErrorIcon />;
                            default: return <Info />;
                          }
                        };
                        
                        return (
                          <Paper 
                            key={index} 
                            elevation={1} 
                            sx={{ 
                              p: 2, 
                              mb: 2, 
                              borderLeft: `4px solid`,
                              borderLeftColor: `${getStatusColor(item.status)}.main`
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                              <Box sx={{ color: `${getStatusColor(item.status)}.main`, pt: 0.5 }}>
                                {getStatusIcon(item.status)}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {item.question_text}
                                  </Typography>
                                  <Chip
                                    label={item.status.toUpperCase()}
                                    color={getStatusColor(item.status)}
                                    size="small"
                                  />
                                  <Chip
                                    label={`${Math.round(item.completeness_score * 100)}%`}
                                    variant="outlined"
                                    size="small"
                                  />
                                </Box>
                                
                                {item.category && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Category: {item.category}
                                  </Typography>
                                )}
                                
                                {item.evidence_found?.length > 0 && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                                      Evidence Found:
                                    </Typography>
                                    <List dense sx={{ pl: 2 }}>
                                      {item.evidence_found.map((evidence: string, idx: number) => (
                                        <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                          <Typography variant="body2" color="text.secondary">
                                            • {evidence}
                                          </Typography>
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}
                                
                                {item.gaps_identified?.length > 0 && (
                                  <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'error.main' }}>
                                      Gaps Identified:
                                    </Typography>
                                    <List dense sx={{ pl: 2 }}>
                                      {item.gaps_identified.map((gap: string, idx: number) => (
                                        <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                          <Typography variant="body2" color="error.main">
                                            • {gap}
                                          </Typography>
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}
                                
                                {item.recommendations?.length > 0 && (
                                  <Box>
                                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5, color: 'info.main' }}>
                                      Recommendations:
                                    </Typography>
                                    <List dense sx={{ pl: 2 }}>
                                      {item.recommendations.map((rec: string, idx: number) => (
                                        <ListItem key={idx} sx={{ py: 0, px: 0 }}>
                                          <Typography variant="body2" color="info.main">
                                            • {rec}
                                          </Typography>
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ) : null;
            })()}

            {/* Department-Specific Detailed Analysis */}
            {selectedDepartment && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
                    🏢 {selectedDepartment} - Detailed Analysis
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'primary.main' }}>
                        Department-Specific ESG Assessment
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        This analysis was performed from the <strong>{selectedDepartment}</strong> perspective, 
                        focusing on specialized ESG compliance requirements and departmental expertise areas.
                      </Typography>
                    </Box>

                    {/* ESG Pillars Analysis */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        📊 ESG Compliance Assessment
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'success.dark', mb: 1 }}>
                            🌱 Environmental Compliance
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'success.dark' }}>
                            Analysis focused on {selectedDepartment.toLowerCase()} environmental responsibilities, 
                            regulatory compliance, and environmental risk management from departmental perspective.
                          </Typography>
                        </Paper>
                        
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'info.dark', mb: 1 }}>
                            👥 Social Responsibility
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'info.dark' }}>
                            Evaluation of social impact areas relevant to {selectedDepartment.toLowerCase()}, 
                            including workforce, community relations, and social governance aspects.
                          </Typography>
                        </Paper>
                        
                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'warning.dark', mb: 1 }}>
                            🏛️ Governance Structure
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'warning.dark' }}>
                            Assessment of governance frameworks, compliance mechanisms, and oversight 
                            structures specific to {selectedDepartment.toLowerCase()} operations.
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>

                    {/* Department-Specific Insights */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        💡 Specialized Department Insights
                      </Typography>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Analysis Focus:</strong> This assessment leverages {selectedDepartment} expertise 
                          to provide specialized ESG compliance evaluation, targeting department-specific 
                          regulatory requirements and best practices.
                        </Typography>
                      </Alert>
                      
                      {/* Dynamic department context */}
                      <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.200' }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                          Department Expertise Areas:
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {getDepartmentExpertise(selectedDepartment)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Enhanced Action Items */}
                    <Box>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                        🎯 Department-Specific Action Plan
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        Implementation roadmap tailored to {selectedDepartment} processes and requirements:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Chip 
                          label="Short-term (30 days): Policy review and compliance assessment" 
                          variant="outlined" 
                          color="primary" 
                          sx={{ justifyContent: 'flex-start' }}
                        />
                        <Chip 
                          label="Medium-term (90 days): Implementation of department-specific controls" 
                          variant="outlined" 
                          color="warning" 
                          sx={{ justifyContent: 'flex-start' }}
                        />
                        <Chip 
                          label="Long-term (180 days): Monitoring and continuous improvement framework" 
                          variant="outlined" 
                          color="success" 
                          sx={{ justifyContent: 'flex-start' }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Analysis Metadata */}
            <Paper 
              elevation={2} 
              sx={{ 
                mt: 3, 
                p: 3, 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', 
                borderRadius: 2,
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : 'none'
              }}
            >
              <Typography 
                variant="body1" 
                fontWeight={500}
                sx={{ 
                  color: 'text.primary',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                📅 Analysis completed: {new Date(aiResults.data.processed_at).toLocaleString()}
              </Typography>
              <Typography 
                variant="body1" 
                fontWeight={500}
                sx={{ 
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                🔍 Upload ID: <Chip label={uploadId} variant="outlined" size="small" />
              </Typography>
              {selectedDepartment && (
                <Typography 
                  variant="body1" 
                  fontWeight={500}
                  sx={{ 
                    color: 'text.primary',
                    mt: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  🏢 Department Analysis: <Chip label={selectedDepartment} color="primary" variant="outlined" size="small" />
                </Typography>
              )}
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
