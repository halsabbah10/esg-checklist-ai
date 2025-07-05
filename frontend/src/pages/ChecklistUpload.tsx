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
} from '@mui/material';
import { CloudUpload, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { checklistsAPI, aiAPI } from '../services/api';

export const ChecklistUpload: React.FC = () => {
  const { id: checklistId } = useParams<{ id: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);

  // Always call hooks at the top level
  // Fetch AI results for uploaded file
  const { data: aiResults, refetch: refetchAIResults } = useQuery({
    queryKey: ['ai-results', uploadId],
    queryFn: () => (uploadId ? aiAPI.getResultByUpload(uploadId) : null),
    enabled: !!uploadId && !!checklistId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!checklistId) {
        throw new Error('Checklist ID is required for upload');
      }

      // Get file extension and set correct content type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

      // Debug FormData
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      try {
        const response = await checklistsAPI.upload(checklistId, formData);
        clearInterval(interval);
        setUploadProgress(100);
        return response.data;
      } catch (error) {
        clearInterval(interval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: data => {
      setUploadId(data.upload_id || data.id);
      // Refetch AI results after successful upload
      setTimeout(() => {
        refetchAIResults();
      }, 2000);
    },
    onError: () => {
      setUploadProgress(0);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        File Upload & AI Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
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
                Uploading and processing file...
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {uploadMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Upload failed. Please try again.
            </Alert>
          )}

          {uploadMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              File uploaded successfully! AI analysis in progress...
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {aiResults?.data && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Analysis Results
            </Typography>

            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
            >
              {/* Overall Score */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  {getScoreIcon(aiResults.data.overall_score)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    Overall Compliance Score
                  </Typography>
                </Box>
                <Typography
                  variant="h3"
                  color={`${getScoreColor(aiResults.data.overall_score)}.main`}
                >
                  {Math.round(aiResults.data.overall_score * 100)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={aiResults.data.overall_score * 100}
                  color={getScoreColor(aiResults.data.overall_score)}
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Paper>

              {/* Category Scores */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Category Breakdown
                </Typography>
                {Object.entries(aiResults.data.category_scores || {}).map(([category, score]) => (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight={500}>
                        {category}
                      </Typography>
                      <Typography variant="body2" color={`${getScoreColor(score as number)}.main`}>
                        {Math.round((score as number) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(score as number) * 100}
                      color={getScoreColor(score as number)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Paper>
            </Box>

            {/* Recommendations and Gaps */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
                mt: 3,
              }}
            >
              {/* Recommendations */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="success.main">
                  Recommendations
                </Typography>
                {aiResults.data.recommendations?.length > 0 ? (
                  <List>
                    {aiResults.data.recommendations.map((rec: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No specific recommendations available.
                  </Typography>
                )}
              </Paper>

              {/* Identified Gaps */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="error.main">
                  Identified Gaps
                </Typography>
                {aiResults.data.gaps?.length > 0 ? (
                  <List>
                    {aiResults.data.gaps.map((gap: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={gap} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No gaps identified.
                  </Typography>
                )}
              </Paper>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Analysis completed: {new Date(aiResults.data.processed_at).toLocaleString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};
