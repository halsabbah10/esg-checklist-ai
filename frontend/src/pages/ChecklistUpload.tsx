import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  ArrowBack,
  Description,
  CheckCircle,
  Error,
  AutoAwesome,
} from '@mui/icons-material';
import { checklistsAPI, aiAPI, uploadsAPI } from '../services/api';

interface UploadResult {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  ai_analysis?: {
    overall_score: number;
    category_scores: Record<string, number>;
    recommendations: string[];
    compliance_gaps: string[];
  };
}

export const ChecklistUpload: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Fetch checklist details
  const {
    data: checklist,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => checklistsAPI.getById(id!),
    enabled: !!id,
  });

  // File upload and AI analysis
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      
      // Upload file
      const uploadResponse = await uploadsAPI.upload(file, id);
      
      // Trigger AI analysis
      const aiResponse = await aiAPI.analyze(file, id);
      
      return {
        upload: uploadResponse.data,
        analysis: aiResponse.data,
      };
    },
    onSuccess: (data) => {
      setUploadResult({
        id: data.upload.id,
        filename: file?.name || 'Unknown file',
        status: 'completed',
        ai_analysis: data.analysis,
      });
      setUploading(false);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setUploadResult({
        id: 'error',
        filename: file?.name || 'Unknown file',
        status: 'failed',
      });
      setUploading(false);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const renderAnalysisResults = () => {
    if (!uploadResult?.ai_analysis) return null;

    const { overall_score, category_scores, recommendations, compliance_gaps } = uploadResult.ai_analysis;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
            AI Analysis Results
          </Typography>

          {/* Overall Score */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Overall ESG Compliance Score
            </Typography>
            <Box display="flex" alignItems="center">
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={overall_score}
                  sx={{ height: 10, borderRadius: 1 }}
                  color={overall_score >= 80 ? 'success' : overall_score >= 60 ? 'warning' : 'error'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {Math.round(overall_score)}%
              </Typography>
            </Box>
          </Box>

          {/* Category Scores */}
          {Object.keys(category_scores).length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Category Breakdown
              </Typography>
              {Object.entries(category_scores).map(([category, score]) => (
                <Box key={category} sx={{ mb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{category}</Typography>
                    <Typography variant="body2">{Math.round(score)}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={score}
                    sx={{ height: 6, borderRadius: 1 }}
                    color={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}
                  />
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom color="success.main">
                ✅ Strengths & Recommendations
              </Typography>
              <List dense>
                {recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Compliance Gaps */}
          {compliance_gaps.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom color="error.main">
                ⚠️ Areas for Improvement
              </Typography>
              <List dense>
                {compliance_gaps.map((gap, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Error color="error" />
                    </ListItemIcon>
                    <ListItemText primary={gap} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
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

  if (error || !checklist) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Failed to load checklist. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Box display="flex" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/checklists')}
            sx={{ mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 } }}
          >
            Back to Checklists
          </Button>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              fontWeight: 'bold',
            }}
          >
            AI Document Analysis
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom color="text.primary">
          {checklist.data.title}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Upload your ESG-related documents for AI-powered compliance analysis. Our system will analyze your documents against the checklist requirements and provide detailed insights.
        </Typography>
      </Paper>

      {/* File Upload */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Upload Document
          </Typography>
          
          <Box
            sx={{
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: file ? 'action.hover' : 'transparent',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              },
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <CloudUpload 
              sx={{ 
                fontSize: { xs: 40, sm: 48 }, 
                color: file ? 'primary.main' : 'grey.400', 
                mb: 2,
                transition: 'color 0.3s ease',
              }} 
            />
            
            {file ? (
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={uploading}
                  sx={{ 
                    mt: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'medium',
                  }}
                >
                  {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom color="text.primary">
                  Click to select a file
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Supported formats: PDF, Word, Excel, Text files
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maximum file size: 10MB
                </Typography>
              </Box>
            )}
          </Box>

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Processing document with AI analysis...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Upload Status */}
      {uploadResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Description sx={{ mr: 1 }} />
              <Typography variant="h6">
                {uploadResult.filename}
              </Typography>
              {uploadResult.status === 'completed' && (
                <CheckCircle color="success" sx={{ ml: 'auto' }} />
              )}
              {uploadResult.status === 'failed' && (
                <Error color="error" sx={{ ml: 'auto' }} />
              )}
            </Box>

            {uploadResult.status === 'completed' && (
              <Alert severity="success">
                Document successfully analyzed! Check the results below.
              </Alert>
            )}

            {uploadResult.status === 'failed' && (
              <Alert severity="error">
                Failed to analyze document. Please try again with a different file.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Results */}
      {uploadResult?.status === 'completed' && renderAnalysisResults()}

      {/* Action Buttons */}
      {uploadResult?.status === 'completed' && (
        <Paper 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mt: 3,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Box 
            display="flex" 
            gap={2}
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent={{ xs: 'stretch', sm: 'flex-start' }}
          >
            <Button
              variant="contained"
              onClick={() => navigate(`/checklists/${id}/results`)}
              sx={{ 
                py: 1.5,
                fontWeight: 'medium',
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              View Detailed Results
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/checklists/${id}/submit`)}
              sx={{ 
                py: 1.5,
                fontWeight: 'medium',
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              Manual Checklist
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFile(null);
                setUploadResult(null);
              }}
              sx={{ 
                py: 1.5,
                fontWeight: 'medium',
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              Upload Another File
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};
