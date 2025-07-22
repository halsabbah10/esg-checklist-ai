import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Visibility,
  Analytics,
  CloudUpload,
  FilterList,
  Clear,
  MoreVert,
  GetApp,
} from '@mui/icons-material';
import { searchAPI } from '../services/api';
import { AnalysisResultDialog } from '../components/AnalysisResultDialog';
import { TabbedDocumentViewer } from '../components/TabbedDocumentViewer';
import { PageTransition, TextField } from '../components/ui';

interface AIAnalysis {
  id: number;
  score: number;
  ai_model_version: string;
  created_at: string;
  processing_time_ms: number;
  file_upload_id: number;
  feedback: string;
  file_info?: {
    filename: string;
    file_size: number;
  };
  // BRD compliance fields
  metadata?: {
    checklist_completeness?: {
      completion_rate: number;
      total: number;
      summary: {
        complete: number;
        incomplete: number;
        missing: number;
      };
    };
    department_context?: {
      name: string;
    };
    quality_score?: number;
  };
  completeness_status?: string;
  quality_score?: number;
  revision_count?: number;
}

type SortDirection = 'asc' | 'desc';

export const AnalysisHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [dialogAnalysisId, setDialogAnalysisId] = useState<number | null>(null);
  const [dialogFileUploadId, setDialogFileUploadId] = useState<number | null>(null);

  // Fetch AI analysis history
  const {
    data: analysisData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ai-analysis-history', searchTerm, modelFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (searchTerm) {
        params.filename = searchTerm;
      }
      if (modelFilter !== 'all') {
        params.ai_model_version = modelFilter;
      }
      
      const response = await searchAPI.aiResults(params);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  const analyses = analysisData?.results || [];

  // Get unique models for filter
  const availableModels = useMemo(() => {
    const models = new Set(analyses.map((a: AIAnalysis) => a.ai_model_version));
    const modelsArray = Array.from(models);
    
    // Debug logging to see what models are being detected
    console.log('🤖 AI Models detected in analyses:', modelsArray);
    console.log('📊 Total unique models:', modelsArray.length);
    
    // Log a few sample analysis records to see the model versions
    if (analyses.length > 0) {
      console.log('📋 Sample analyses with model versions:');
      analyses.slice(0, 5).forEach((analysis: AIAnalysis, index: number) => {
        console.log(`  ${index + 1}. Model: "${analysis.ai_model_version}", ID: ${analysis.id}, Date: ${analysis.created_at}`);
      });
    }
    
    return modelsArray;
  }, [analyses]);

  // Filtered and sorted analyses
  const filteredAnalyses = useMemo(() => {
    let filtered = analyses.filter((analysis: AIAnalysis) => {
      const filename = analysis.file_info?.filename || '';
      const matchesSearch = filename.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModel = modelFilter === 'all' || analysis.ai_model_version.includes(modelFilter);
      return matchesSearch && matchesModel;
    });

    // Sort
    filtered.sort((a: AIAnalysis, b: AIAnalysis) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'filename':
          aValue = a.file_info?.filename || '';
          bValue = b.file_info?.filename || '';
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'processing_time':
          aValue = a.processing_time_ms;
          bValue = b.processing_time_ms;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [analyses, searchTerm, modelFilter, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, analysis: AIAnalysis) => {
    setAnchorEl(event.currentTarget);
    setSelectedAnalysis(analysis);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAnalysis(null);
  };

  const handleViewResults = (analysis: AIAnalysis) => {
    setDialogAnalysisId(analysis.id);
    setDialogFileUploadId(analysis.file_upload_id);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleViewDocument = (analysis: AIAnalysis) => {
    setSelectedAnalysis(analysis);
    setDocumentViewerOpen(true);
    handleMenuClose();
  };

  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
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
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getModelDisplayName = (modelVersion: string): string => {
    if (!modelVersion || modelVersion === 'Unknown') return 'Unknown';
    
    // Extract model name from format like "gemini-department-name" or "deepseek-department-name"
    if (modelVersion.startsWith('gemini')) return 'Gemini 2.0 Flash';
    if (modelVersion.startsWith('deepseek')) return 'DeepSeek R1';
    if (modelVersion.startsWith('eand')) return 'e& ChatGPT';
    if (modelVersion.startsWith('openai')) return 'OpenAI GPT';
    
    // Fallback for other formats
    if (modelVersion.includes('gemini')) return 'Gemini 2.0 Flash';
    if (modelVersion.includes('deepseek')) return 'DeepSeek R1';
    if (modelVersion.includes('eand')) return 'e& ChatGPT';
    if (modelVersion.includes('openai') || modelVersion.includes('gpt')) return 'OpenAI GPT';
    
    return modelVersion;
  };

  const getCompletenessStatus = (analysis: AIAnalysis): string => {
    // Check if there's a direct completeness_status field
    if (analysis.completeness_status) {
      return analysis.completeness_status;
    }
    
    // Check metadata for checklist completeness (NOT compliance score)
    const completeness = analysis.metadata?.checklist_completeness;
    if (!completeness) {
      return 'Unknown';
    }
    
    // Use completion_rate to determine completeness status
    const rate = completeness.completion_rate;
    if (rate >= 0.95) return 'Complete';  // 95% or higher = complete
    if (rate >= 0.5) return 'Incomplete'; // 50-94% = incomplete
    return 'Missing';  // Below 50% = missing
  };

  // Quality score extraction - reserved for future use
  // const getQualityScore = (analysis: AIAnalysis): number => {
  //   return analysis.metadata?.quality_score || analysis.score;
  // };

  const getCompletenessColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'success';
      case 'Incomplete': return 'warning';
      case 'Missing': return 'error';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load analysis history. Please try again later.
      </Alert>
    );
  }

  return (
    <PageTransition in={true} variant="fade" duration={500}>
      <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
            AI Analysis History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your previous ESG document analyses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Analytics />}
          onClick={() => navigate('/ai-analysis')}
          sx={{ height: 'fit-content' }}
        >
          New Analysis
        </Button>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Analyses
              </Typography>
              <Typography variant="h4">
                {analyses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h4">
                {analyses.length > 0 
                  ? `${Math.round((analyses.reduce((sum: number, a: AIAnalysis) => sum + a.score, 0) / analyses.length) * 100)}%`
                  : '0%'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Complete Status
              </Typography>
              <Typography variant="h4">
                {analyses.filter((a: AIAnalysis) => 
                  getCompletenessStatus(a) === 'Complete'
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Models Used
              </Typography>
              <Typography variant="h4">
                {availableModels.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="sm"
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>AI Model</InputLabel>
              <Select
                value={modelFilter}
                label="AI Model"
                onChange={(e) => setModelFilter(e.target.value)}
              >
                <MenuItem value="all">All Models</MenuItem>
                <MenuItem value="gemini">Gemini</MenuItem>
                <MenuItem value="deepseek">DeepSeek</MenuItem>
                <MenuItem value="eand">e& ChatGPT</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setModelFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Analysis Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'filename'}
                  direction={sortField === 'filename' ? sortDirection : 'asc'}
                  onClick={() => handleSort('filename')}
                >
                  Document
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'score'}
                  direction={sortField === 'score' ? sortDirection : 'asc'}
                  onClick={() => handleSort('score')}
                >
                  Compliance Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">AI Model</TableCell>
              <TableCell align="center">Completeness</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'processing_time'}
                  direction={sortField === 'processing_time' ? sortDirection : 'asc'}
                  onClick={() => handleSort('processing_time')}
                >
                  Processing Time
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'created_at'}
                  direction={sortField === 'created_at' ? sortDirection : 'asc'}
                  onClick={() => handleSort('created_at')}
                >
                  Analyzed On
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnalyses.map((analysis: AIAnalysis) => (
              <TableRow key={analysis.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {analysis.file_info?.filename || `Analysis ${analysis.id}`}
                    </Typography>
                    {analysis.file_info?.file_size && (
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(analysis.file_info.file_size)}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={formatScore(analysis.score)}
                    color={getScoreColor(analysis.score)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={getModelDisplayName(analysis.ai_model_version)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={getCompletenessStatus(analysis)}
                    color={getCompletenessColor(getCompletenessStatus(analysis))}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {formatProcessingTime(analysis.processing_time_ms)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="More actions">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, analysis)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAnalyses.length === 0 && (
          <Box p={4} textAlign="center">
            <Analytics sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No analyses found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {searchTerm || modelFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Start your first ESG document analysis'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/ai-analysis')}
            >
              New Analysis
            </Button>
          </Box>
        )}
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => selectedAnalysis && handleViewResults(selectedAnalysis)}>
          <Visibility sx={{ mr: 1 }} />
          View Analysis Results
        </MenuItem>
        <MenuItem onClick={() => selectedAnalysis && handleViewDocument(selectedAnalysis)}>
          <GetApp sx={{ mr: 1 }} />
          Export Analysis
        </MenuItem>
      </Menu>

      {/* Analysis Result Dialog */}
      <AnalysisResultDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        analysisId={dialogAnalysisId || 0}
        fileUploadId={dialogFileUploadId || 0}
      />

      {/* Tabbed Document Viewer */}
      {selectedAnalysis && (
        <TabbedDocumentViewer
          open={documentViewerOpen}
          onClose={() => setDocumentViewerOpen(false)}
          uploadId={selectedAnalysis.file_upload_id}
          filename={`Analysis ${selectedAnalysis.id}`}
        />
      )}
      </Box>
    </PageTransition>
  );
};

export default AnalysisHistory;