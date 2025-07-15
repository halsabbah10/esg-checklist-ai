import { useState, useMemo } from 'react';
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
  TextField,
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
}

type SortDirection = 'asc' | 'desc';

export const AnalysisHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null);

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
    return Array.from(models);
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
    navigate(`/ai-analysis/results/${analysis.id}`);
    handleMenuClose();
  };

  const handleViewDocument = (analysis: AIAnalysis) => {
    navigate(`/file-viewer/${analysis.file_upload_id}`);
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
    if (modelVersion.includes('gemini')) return 'Gemini 2.0 Flash';
    if (modelVersion.includes('deepseek')) return 'DeepSeek R1';
    if (modelVersion.includes('eand')) return 'e& ChatGPT';
    return modelVersion;
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
    <Box sx={{ p: 3 }}>
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
        <Grid item xs={12} sm={3}>
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
        <Grid item xs={12} sm={3}>
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
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                This Month
              </Typography>
              <Typography variant="h4">
                {analyses.filter((a: AIAnalysis) => 
                  new Date(a.created_at).getMonth() === new Date().getMonth()
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
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
              size="small"
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
                  ESG Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">AI Model</TableCell>
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
          View Original Document
        </MenuItem>
      </Menu>
    </Box>
  );
};