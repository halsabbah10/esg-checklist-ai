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
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close,
  AssessmentOutlined,
  Description,
} from '@mui/icons-material';
import { aiAPI } from '../services/api';
import ComprehensiveStep4ResultsDisplay from './ai-analysis/ComprehensiveStep4ResultsDisplay';
import { DocumentViewer } from './DocumentViewer';

interface TabbedDocumentViewerProps {
  open: boolean;
  onClose: () => void;
  uploadId: number;
  filename: string;
  fileSize?: number;
}


interface AIAnalysis {
  id: number;
  overall_score: number;
  analysis: string;
  created_at: string;
  status: string;
  feedback?: any;
  ai_model_version?: string;
  department_context?: any;
}

export const TabbedDocumentViewer: React.FC<TabbedDocumentViewerProps> = ({
  open,
  onClose,
  uploadId,
  filename,
  fileSize,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAILoading] = useState(false);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setAIAnalysis(null);
      setAILoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && uploadId && activeTab === 1) {
      fetchAIAnalysis();
    }
  }, [open, uploadId, activeTab]);


  const fetchAIAnalysis = async () => {
    setAILoading(true);
    try {
      const response = await aiAPI.getResultByUpload(uploadId.toString());
      
      if (response?.data?.results && response.data.results.length > 0) {
        setAIAnalysis(response.data.results[0]);
      } else {
        setAIAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAIAnalysis(null);
    } finally {
      setAILoading(false);
    }
  };

  const renderDocumentViewer = () => {
    return (
      <Box sx={{ display: activeTab === 0 ? 'block' : 'none', height: '100%' }}>
        <DocumentViewer
          key={`doc-viewer-${uploadId}`}
          uploadId={uploadId}
          filename={filename}
          fileSize={fileSize}
          embedded={true}
        />
      </Box>
    );
  };

  const renderAIAnalysis = () => {
    if (aiLoading) {
      return (
        <Box sx={{ display: activeTab === 1 ? 'flex' : 'none', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>Loading AI Analysis...</Typography>
          </Box>
        </Box>
      );
    }

    if (!aiAnalysis) {
      return (
        <Box sx={{ display: activeTab === 1 ? 'block' : 'none', textAlign: 'center', py: 4 }}>
          <AssessmentOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No AI Analysis Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This document has not been analyzed by our AI system yet.
          </Typography>
        </Box>
      );
    }

    try {
      // Use the new ComprehensiveStep4ResultsDisplay component
      return (
        <Box sx={{ display: activeTab === 1 ? 'block' : 'none', height: '100%', overflow: 'auto' }}>
          <ComprehensiveStep4ResultsDisplay
            state={{
              analysisId: aiAnalysis.id,
              results: aiAnalysis,
              selectedDepartment: (aiAnalysis as any).department_context?.name || 'General Approach',
              selectedModel: aiAnalysis.ai_model_version || 'Unknown',
            }}
            onComplete={() => {}}
            onError={() => {}}
          />
        </Box>
      );
    } catch (error) {
      console.error('Error rendering AI Analysis:', error);
      return (
        <Box sx={{ display: activeTab === 1 ? 'block' : 'none', textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom color="error">
            Error Loading AI Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            There was an issue loading the AI analysis. Please try refreshing.
          </Typography>
          <Typography variant="caption" color="error">
            {error instanceof Error ? error.message : 'Unknown error'}
          </Typography>
        </Box>
      );
    }
  };

  return (
    <Dialog 
      key={`dialog-${uploadId}`}
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '90vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="span">
            {filename}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Description />} label="Document Viewer" />
          <Tab icon={<AssessmentOutlined />} label="AI Analysis" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
        {renderDocumentViewer()}
        {renderAIAnalysis()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};


