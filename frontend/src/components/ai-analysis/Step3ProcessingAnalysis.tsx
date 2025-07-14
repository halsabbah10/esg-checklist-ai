import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  CircularProgress
} from '@mui/material';
import {
  FileText,
  Brain,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import api from '../../services/api';

interface Step3Props {
  state: any;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

const PROCESSING_STAGES = [
  { id: 'upload', title: 'File Upload', description: 'Securely uploading your document', duration: 5 },
  { id: 'extraction', title: 'Text Extraction', description: 'Extracting and parsing document content', duration: 10 },
  { id: 'analysis', title: 'AI Analysis', description: 'Processing with selected AI model', duration: 120 },
  { id: 'scoring', title: 'ESG Scoring', description: 'Calculating compliance scores and generating insights', duration: 15 }
];

export default function Step3ProcessingAnalysis({ state, onComplete, onError }: Step3Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    startAnalysis();
    startProgressSimulation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startAnalysis = async () => {
    try {
      const formData = new FormData();
      formData.append('model', state.selectedModel);
      formData.append('department', state.selectedDepartment);
      formData.append('file', state.uploadedFile);

      const response = await api.post('/v1/ai-analysis/upload-and-analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes to handle long AI analysis
      });

      setCurrentStage(PROCESSING_STAGES.length);
      setProgress(100);
      
      setTimeout(() => {
        onComplete({
          analysisId: response.data.analysis_id,
          results: response.data.results
        });
      }, 1000);

    } catch (error: any) {
      console.error('Analysis failed:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      // Check if this is actually a successful response that we're misinterpreting
      if (error.response?.status === 200 || error.response?.data?.success) {
        console.log('Analysis actually succeeded, treating as success');
        setCurrentStage(PROCESSING_STAGES.length);
        setProgress(100);
        
        setTimeout(() => {
          onComplete({
            analysisId: error.response.data.analysis_id,
            results: error.response.data.results
          });
        }, 1000);
        return;
      }
      
      const errorMessage = error.response?.data?.detail || error.message || 'AI analysis failed. Please try again.';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const startProgressSimulation = () => {
    let elapsedTime = 0;
    const totalTime = PROCESSING_STAGES.reduce((sum, stage) => sum + stage.duration, 0);
    
    intervalRef.current = setInterval(() => {
      elapsedTime += 0.5;
      setProcessingTime(elapsedTime);

      let accumulatedTime = 0;
      let newStage = 0;
      
      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        if (elapsedTime <= accumulatedTime + PROCESSING_STAGES[i].duration) {
          newStage = i;
          break;
        }
        accumulatedTime += PROCESSING_STAGES[i].duration;
        newStage = i + 1;
      }

      setCurrentStage(newStage);
      const overallProgress = Math.min((elapsedTime / totalTime) * 100, 95);
      setProgress(overallProgress);

      if (elapsedTime >= totalTime && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 500);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      {/* Processing Header */}
      <Box textAlign="center" mb={3}>
        <Typography variant="h6" gutterBottom>AI Analysis in Progress</Typography>
        <Typography variant="body2" color="text.secondary">
          Analyzing your document with {state.selectedModel} for {state.selectedDepartment}
        </Typography>
      </Box>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <Brain size={20} style={{ marginRight: 8, color: '#1976d2' }} />
                <Typography variant="h6">Processing Progress</Typography>
              </Box>
              <Chip 
                icon={<Clock size={16} />}
                label={formatTime(processingTime)}
                variant="outlined"
                size="small"
              />
            </Box>
          }
        />
        <CardContent>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4, mb: 2 }} 
          />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}% Complete
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimated: ~2-3 minutes
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Processing Stages */}
      <List>
        {PROCESSING_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isCurrent = index === currentStage;
          // const isPending = index > currentStage;

          return (
            <ListItem key={stage.id}>
              <Card 
                sx={{ 
                  width: '100%',
                  bgcolor: isCompleted ? 'success.50' : isCurrent ? 'primary.50' : 'grey.50',
                  borderColor: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'grey.300',
                  borderWidth: 1,
                  borderStyle: 'solid'
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{
                          p: 1,
                          borderRadius: '50%',
                          bgcolor: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'grey.300',
                          color: 'white',
                          mr: 2
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={20} />
                        ) : isCurrent ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <FileText size={20} />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {stage.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stage.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={isCompleted ? 'Complete' : isCurrent ? 'Processing...' : 'Pending'}
                      color={isCompleted ? 'success' : isCurrent ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          );
        })}
      </List>

      {/* Analysis Configuration */}
      <Card sx={{ bgcolor: 'grey.50', mt: 3 }}>
        <CardHeader>
          <Typography variant="body2" fontWeight="medium">Analysis Configuration</Typography>
        </CardHeader>
        <CardContent sx={{ pt: 0 }}>
          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Model</Typography>
              <Typography variant="body2">{state.selectedModel}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Department</Typography>
              <Typography variant="body2">{state.selectedDepartment}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">File</Typography>
              <Typography variant="body2" noWrap>{state.uploadedFile?.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Size</Typography>
              <Typography variant="body2">
                {state.uploadedFile ? (state.uploadedFile.size / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircle />}>
          {error}
        </Alert>
      )}

      {/* Processing Tips */}
      <Alert severity="info" sx={{ mt: 2 }} icon={<FileText />}>
        <Typography variant="body2" fontWeight="medium" gutterBottom>Processing Information:</Typography>
        <Typography variant="body2">• Your document is being analyzed using advanced AI models</Typography>
        <Typography variant="body2">• Processing time varies based on document size and complexity</Typography>
        <Typography variant="body2">• Please keep this page open until analysis is complete</Typography>
      </Alert>
    </Box>
  );
}