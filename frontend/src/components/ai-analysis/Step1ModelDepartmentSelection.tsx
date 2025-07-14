import { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle2,
  Bot,
  Building2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: string[];
  available: boolean;
  recommended: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string;
  focus_areas: string[];
}


interface Step1Props {
  state: any;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

export default function Step1ModelDepartmentSelection({ state, onComplete, onError }: Step1Props) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Pre-select values if available in state
    if (state.selectedModel) setSelectedModel(state.selectedModel);
    if (state.selectedDepartment) setSelectedDepartment(state.selectedDepartment);
  }, [state]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modelsResponse, departmentsResponse] = await Promise.all([
        api.get('/v1/ai-analysis/models'),
        api.get('/v1/ai-analysis/departments')
      ]);

      setModels(modelsResponse.data.models);
      setDepartments(departmentsResponse.data.departments);
    } catch (error) {
      console.error('Failed to load data:', error);
      onError('Failed to load available models and departments');
    } finally {
      setLoading(false);
    }
  };

  const validateAndProceed = async () => {
    if (!selectedModel || !selectedDepartment) {
      onError('Please select a model and department before proceeding');
      return;
    }

    try {
      setValidating(true);
      
      // Validate configuration with backend
      const response = await api.post('/v1/ai-analysis/validate-configuration', {
        model: selectedModel,
        department: selectedDepartment
      });

      if (response.data.valid) {
        onComplete({
          model: selectedModel,
          department: selectedDepartment,
          configuration: response.data.configuration
        });
      } else {
        onError('Invalid configuration. Please check your selections.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to validate configuration';
      onError(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={4}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading options...
        </Typography>
      </Box>
    );
  }

  const selectedModelData = models.find(m => m.id === selectedModel);
  const selectedDepartmentData = departments.find(d => d.name === selectedDepartment);

  const canProceed = selectedModel && selectedDepartment;

  return (
    <Box sx={{ space: 3 }}>
      {/* AI Model Selection */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" mb={2}>
          <Bot size={20} style={{ marginRight: 8, color: '#1976d2' }} />
          <Typography variant="h6">Select AI Model</Typography>
          <Chip label="Required" size="small" sx={{ ml: 1 }} />
        </Box>
        
        <Grid container spacing={2}>
          {models.map((model) => (
            <Grid size={{xs: 12, md: 4}} key={model.id}>
              <Paper
                sx={{
                  p: 2,
                  cursor: model.available ? 'pointer' : 'not-allowed',
                  border: selectedModel === model.id ? 2 : 1,
                  borderColor: selectedModel === model.id ? 'primary.main' : 'divider',
                  opacity: model.available ? 1 : 0.5,
                  '&:hover': model.available ? { boxShadow: 2 } : {}
                }}
                onClick={() => model.available && setSelectedModel(model.id)}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {model.name}
                  </Typography>
                  <Box>
                    {model.recommended && (
                      <Chip label="Recommended" size="small" color="primary" sx={{ mb: 0.5 }} />
                    )}
                    <Chip 
                      label={model.available ? "Available" : "Unavailable"} 
                      size="small" 
                      color={model.available ? "success" : "error"}
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {model.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Provider: {model.provider}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {model.capabilities.slice(0, 3).map((capability, index) => (
                    <Chip key={index} label={capability} size="small" variant="outlined" />
                  ))}
                  {model.capabilities.length > 3 && (
                    <Chip 
                      label={`+${model.capabilities.length - 3} more`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {selectedModelData && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle2 />}>
            Selected: {selectedModelData.name} - {selectedModelData.description}
          </Alert>
        )}
      </Box>

      {/* Department Selection */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" mb={2}>
          <Building2 size={20} style={{ marginRight: 8, color: '#2e7d32' }} />
          <Typography variant="h6">Select Department</Typography>
          <Chip label="Required" size="small" sx={{ ml: 1 }} />
        </Box>
        
        <FormControl fullWidth>
          <InputLabel>Choose a department for specialized analysis</InputLabel>
          <Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            label="Choose a department for specialized analysis"
          >
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.name}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {dept.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dept.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedDepartmentData && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle2 />}>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {selectedDepartmentData.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {selectedDepartmentData.description}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                {selectedDepartmentData.focus_areas.map((area, index) => (
                  <Chip key={index} label={area} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Alert>
        )}
      </Box>


      {/* Validation Warning */}
      {!canProceed && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<AlertCircle />}>
          Please select both AI Model and Department to continue.
        </Alert>
      )}

      {/* Continue Button */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={validateAndProceed}
          disabled={!canProceed || validating}
          sx={{ minWidth: 150 }}
        >
          {validating ? (
            <Box display="flex" alignItems="center">
              <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
              Validating...
            </Box>
          ) : (
            'Continue to Upload'
          )}
        </Button>
      </Box>
    </Box>
  );
}