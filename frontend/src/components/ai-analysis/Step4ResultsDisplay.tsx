import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  CheckCircle2,
  FileText,
  Download,
  Share,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

interface Step4Props {
  state: any;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

interface AnalysisResult {
  analysis_id: number;
  score: number;
  feedback: string;
  processing_time_ms: number;
  created_at: string;
  model_version: string;
  file_info: {
    filename: string;
    file_size: number;
    uploaded_at: string;
  };
  checklist_info: {
    id: number;
    title: string;
    description: string;
  };
  metadata: any;
}

export default function Step4ResultsDisplay({ state, onComplete, onError }: Step4Props) {
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (state.analysisId) {
      loadResults();
    }
  }, [state.analysisId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/v1/ai-analysis/results/${state.analysisId}`);
      setResults(response.data);
    } catch (error: any) {
      console.error('Failed to load results:', error);
      onError('Failed to load analysis results');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'success.main';
    if (score >= 0.6) return 'warning.main';
    return 'error.main';
  };

  const getScoreChipColor = (score: number): "success" | "warning" | "error" => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const startNewAnalysis = () => {
    onComplete({ restart: true });
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={4}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading analysis results...
        </Typography>
      </Box>
    );
  }

  if (!results) {
    return (
      <Alert severity="error" icon={<AlertCircle />}>
        No analysis results found. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Results Header */}
      <Box textAlign="center" mb={4}>
        <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
          <CheckCircle2 size={32} color="#2e7d32" style={{ marginRight: 8 }} />
          <Typography variant="h4" fontWeight="bold" color="success.main">
            Analysis Complete!
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Your ESG document has been successfully analyzed using {results.model_version}
        </Typography>
      </Box>

      {/* Score Overview */}
      <Card sx={{ mb: 3, border: 2, borderColor: 'success.main' }}>
        <CardHeader sx={{ textAlign: 'center' }}>
          <Typography variant="h2" fontWeight="bold" color={getScoreColor(results.score)}>
            {(results.score * 100).toFixed(1)}%
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Overall ESG Compliance Score
          </Typography>
        </CardHeader>
        <CardContent>
          <LinearProgress 
            variant="determinate" 
            value={results.score * 100} 
            sx={{ height: 12, borderRadius: 6, mb: 3 }}
          />
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} textAlign="center">
            <Box>
              <Typography variant="caption" color="text.secondary">Processing Time</Typography>
              <Typography variant="body1" fontWeight="medium">
                {formatProcessingTime(results.processing_time_ms)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Model Used</Typography>
              <Typography variant="body1" fontWeight="medium">{results.model_version}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Analysis Date</Typography>
              <Typography variant="body1" fontWeight="medium">
                {new Date(results.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Results Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Feedback" />
          <Tab label="Details" />
          <Tab label="Document" />
        </Tabs>

        <CardContent>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <BarChart3 size={20} style={{ marginRight: 8 }} />
                Analysis Summary
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={4}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Score Breakdown
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Overall Compliance</Typography>
                    <Chip 
                      label={`${(results.score * 100).toFixed(1)}%`}
                      color={getScoreChipColor(results.score)}
                    />
                  </Box>
                  {results.metadata?.checklist_completeness && (
                    <>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Completed Items</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {results.metadata.checklist_completeness.completed || 0}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">Total Items</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {results.metadata.checklist_completeness.total || 0}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Quick Stats
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">File Size</Typography>
                    <Typography variant="body2">{formatFileSize(results.file_info.file_size)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Checklist</Typography>
                    <Typography variant="body2">{results.checklist_info.title}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">Processing</Typography>
                    <Typography variant="body2">{formatProcessingTime(results.processing_time_ms)}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Feedback Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <FileText size={20} style={{ marginRight: 8 }} />
                AI Analysis Feedback
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {results.feedback}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Details Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Technical Details</Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={4}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                    Analysis Information
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Analysis ID:</Typography>
                    <Typography variant="body2" fontFamily="monospace">#{results.analysis_id}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Model Version:</Typography>
                    <Typography variant="body2">{results.model_version}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Created:</Typography>
                    <Typography variant="body2">{new Date(results.created_at).toLocaleString()}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Processing Time:</Typography>
                    <Typography variant="body2">{formatProcessingTime(results.processing_time_ms)}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                    Document Information
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Filename:</Typography>
                    <Typography variant="body2" noWrap title={results.file_info.filename}>
                      {results.file_info.filename.length > 20 
                        ? `${results.file_info.filename.substring(0, 20)}...` 
                        : results.file_info.filename}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">File Size:</Typography>
                    <Typography variant="body2">{formatFileSize(results.file_info.file_size)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Uploaded:</Typography>
                    <Typography variant="body2">{new Date(results.file_info.uploaded_at).toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              {results.metadata && Object.keys(results.metadata).length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle1" fontWeight="medium" mb={2}>
                    Additional Metadata
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                      {JSON.stringify(results.metadata, null, 2)}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {/* Document Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Document Information</Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2} mb={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Original Filename</Typography>
                  <Typography variant="body1" fontWeight="medium">{results.file_info.filename}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>File Size</Typography>
                  <Typography variant="body1" fontWeight="medium">{formatFileSize(results.file_info.file_size)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Upload Date</Typography>
                  <Typography variant="body1" fontWeight="medium">{new Date(results.file_info.uploaded_at).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Checklist Used</Typography>
                  <Typography variant="body1" fontWeight="medium">{results.checklist_info.title}</Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>Checklist Description</Typography>
              <Typography variant="body2">{results.checklist_info.description}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" flexWrap="wrap" justifyContent="center" gap={2} mt={3}>
        <Button variant="outlined" startIcon={<Download />}>
          Export Results
        </Button>
        <Button variant="outlined" startIcon={<Share />}>
          Share Results
        </Button>
        <Button variant="contained" startIcon={<TrendingUp />} onClick={startNewAnalysis}>
          Analyze Another Document
        </Button>
      </Box>

      {/* Success Message */}
      <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircle2 />}>
        <Typography variant="body2" fontWeight="medium">Analysis completed successfully!</Typography>
        <Typography variant="body2">
          Your ESG compliance score and detailed feedback are now available. 
          Use the tabs above to explore different aspects of the analysis results.
        </Typography>
      </Alert>
    </Box>
  );
}