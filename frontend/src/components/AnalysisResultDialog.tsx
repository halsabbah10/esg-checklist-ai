import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close,
  Analytics,
  Description,
  Download,
  Share,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../services/api';
import ComprehensiveStep4ResultsDisplay from './ai-analysis/ComprehensiveStep4ResultsDisplay';
import { DocumentViewer } from './DocumentViewer';
import { LoadingSpinner } from './LoadingSpinner';
import { useModalManager, useEscapeKey } from '../utils/modalManager';
import { designTokens, getBorderRadius } from '../theme/designTokens';

interface AnalysisResultDialogProps {
  open: boolean;
  onClose: () => void;
  analysisId: number;
  fileUploadId: number;
  analysisData?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      style={{ flex: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const AnalysisResultDialog: React.FC<AnalysisResultDialogProps> = ({
  open,
  onClose,
  analysisId,
  fileUploadId,
  analysisData,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('lg'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Manage modal state for scroll locking
  const { openModal, closeModal } = useModalManager('analysis-result-dialog', 'dialog');
  
  // Handle modal state
  useEffect(() => {
    if (open) {
      openModal();
    } else {
      closeModal();
    }
    
    return () => closeModal();
  }, [open, openModal, closeModal]);
  
  // Handle escape key
  useEscapeKey(onClose, open);

  // Fetch analysis results if not provided
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['analysis-result', analysisId],
    queryFn: async () => {
      const response = await searchAPI.getAIResult(analysisId);
      return response.data;
    },
    enabled: open && !analysisData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use provided data or fetched data
  const resultData = analysisData || analysis;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'json') => {
    try {
      // This would integrate with the existing export functionality
      console.log(`Exporting analysis ${analysisId} as ${format}`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ESG Analysis Results`,
          text: `Analysis results for ${resultData?.file_info?.filename || 'document'}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to clipboard
      const shareText = `ESG Analysis Results\n\nFile: ${resultData?.file_info?.filename || 'Unknown'}\nScore: ${resultData?.score ? Math.round(resultData.score * 100) : 0}%\nDate: ${resultData?.created_at ? new Date(resultData.created_at).toLocaleDateString() : 'Unknown'}`;
      await navigator.clipboard.writeText(shareText);
    }
  };

  if (isLoading) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' }
        }}
      >
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <LoadingSpinner />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !resultData) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Error Loading Analysis
        </DialogTitle>
        <DialogContent>
          <Typography color="error">
            Failed to load analysis results. Please try again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          minHeight: fullScreen ? '100vh' : '80vh',
          maxHeight: fullScreen ? '100vh' : '90vh',
        }
      }}
      TransitionComponent={Fade}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Analytics color="primary" />
          <Typography variant="h6" component="span">
            ESG Analysis Results
          </Typography>
          {resultData.file_info?.filename && (
            <Typography variant="body2" color="text.secondary">
              • {resultData.file_info.filename}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => handleExport('pdf')} title="Export PDF">
            <Download />
          </IconButton>
          <IconButton size="small" onClick={handleShare} title="Share">
            <Share />
          </IconButton>
          <IconButton onClick={onClose} title="Close">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ minHeight: 48 }}
        >
          <Tab 
            icon={<Analytics />} 
            label="AI Analysis Results" 
            iconPosition="start"
          />
          <Tab 
            icon={<Description />} 
            label="Original Document" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <ComprehensiveStep4ResultsDisplay
              state={{
                analysisId: analysisId,
                results: {
                  ...resultData,
                  model_version: resultData.ai_model_version || 'Unknown'
                },
                selectedDepartment: resultData.metadata?.department_context?.name || 'General Approach',
                selectedModel: resultData.ai_model_version || 'Unknown',
              }}
              onComplete={() => {}}
              onError={() => {}}
            />
          </Box>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ height: '100%' }}>
            <DocumentViewer
              fileUploadId={fileUploadId}
              filename={resultData.file_info?.filename}
              embedded={true}
            />
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button
          onClick={() => handleExport('pdf')}
          variant="contained"
          startIcon={<Download />}
        >
          Export Results
        </Button>
      </DialogActions>
    </Dialog>
  );
};