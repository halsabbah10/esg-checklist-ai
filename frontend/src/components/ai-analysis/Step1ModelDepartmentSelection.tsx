import { useState, useEffect, useCallback, useMemo } from 'react';
import {
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
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle2,
  Bot,
  Building2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { designTokens, getSpacing, getBorderRadius } from '../../theme/designTokens';
import { useDebouncedCallback } from '../../hooks/usePerformance';
import { Button } from '../../components/ui';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [models, setModels] = useState<AIModel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<{ model?: string; department?: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Pre-select values if available in state
    if (state.selectedModel) setSelectedModel(state.selectedModel);
    if (state.selectedDepartment) setSelectedDepartment(state.selectedDepartment);
  }, [state]);

  // Enhanced data loading with error handling
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrors({});
      
      const [modelsResponse, departmentsResponse] = await Promise.all([
        api.get('/v1/ai-analysis/models'),
        api.get('/v1/ai-analysis/departments')
      ]);

      setModels(modelsResponse.data.models || []);
      setDepartments(departmentsResponse.data.departments || []);
      
      // Auto-select recommended model if available
      const recommendedModel = modelsResponse.data.models?.find((m: AIModel) => m.recommended && m.available);
      if (recommendedModel && !selectedModel) {
        setSelectedModel(recommendedModel.id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      onError('Failed to load available models and departments. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [onError, selectedModel]);

  // Validation functions
  const validateSelection = useCallback(() => {
    const newErrors: { model?: string; department?: string } = {};
    
    if (!selectedModel) {
      newErrors.model = 'Please select an AI model';
    } else {
      const model = models.find(m => m.id === selectedModel);
      if (model && !model.available) {
        newErrors.model = 'Selected model is currently unavailable';
      }
    }
    
    if (!selectedDepartment) {
      newErrors.department = 'Please select a department';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedModel, selectedDepartment, models]);

  // Debounced validation for better UX
  const debouncedValidation = useDebouncedCallback(validateSelection, 300, [selectedModel, selectedDepartment]);

  // Enhanced handlers with better UX
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setErrors(prev => ({ ...prev, model: undefined }));
    debouncedValidation();
  }, [debouncedValidation]);

  const handleDepartmentChange = useCallback((departmentId: string) => {
    setSelectedDepartment(departmentId);
    setErrors(prev => ({ ...prev, department: undefined }));
    debouncedValidation();
  }, [debouncedValidation]);

  const validateAndProceed = useCallback(async () => {
    if (!validateSelection()) {
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
      const errorMessage = error.response?.data?.detail || 'Failed to validate configuration. Please try again.';
      onError(errorMessage);
    } finally {
      setValidating(false);
    }
  }, [validateSelection, selectedModel, selectedDepartment, onComplete, onError]);

  // Memoized computed values
  const isFormValid = useMemo(() => {
    return Boolean(selectedModel && selectedDepartment);
  }, [selectedModel, selectedDepartment]);

  const availableModels = useMemo(() => {
    return models.filter(m => m.available);
  }, [models]);

  const recommendedModel = useMemo(() => {
    return models.find(m => m.recommended && m.available);
  }, [models]);

  // All hooks must be called before any early returns
  const selectedModelData = useMemo(() => 
    models.find(m => m.id === selectedModel), [models, selectedModel]
  );
  
  const selectedDepartmentData = useMemo(() => 
    departments.find(d => d.name === selectedDepartment), [departments, selectedDepartment]
  );

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center"
        py={8}
        sx={{
          minHeight: 400,
          backgroundColor: 'background.paper',
          borderRadius: getBorderRadius('lg'),
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CircularProgress 
          size={48} 
          thickness={4}
          sx={{ 
            color: 'primary.main',
            mb: 3,
          }}
        />
        <Typography 
          variant="h6" 
          color="text.primary" 
          sx={{ 
            fontWeight: designTokens.typography.fontWeights.medium,
            mb: 1,
          }}
        >
          Loading AI Models & Departments
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ textAlign: 'center', maxWidth: 300 }}
        >
          Fetching available AI models and department configurations...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 },
      maxWidth: 1200,
      mx: 'auto',
    }}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant={isMobile ? 'h5' : 'h4'} 
          component="h1"
          sx={{ 
            fontWeight: designTokens.typography.fontWeights.bold,
            color: 'text.primary',
            mb: 1,
          }}
        >
          Configure AI Analysis
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Select an AI model and department to begin your ESG compliance analysis
          {recommendedModel && (
            <Typography component="span" color="primary.main" fontWeight="medium" sx={{ ml: 1 }}>
              • {recommendedModel.name} is recommended
            </Typography>
          )}
        </Typography>
        
        {/* Progress indicator */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          p: 2.5,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(229, 62, 62, 0.08)' 
            : 'rgba(185, 28, 28, 0.06)',
          borderRadius: '12px',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 6px 20px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)' 
            : '0 2px 8px rgba(185, 28, 28, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
          mb: 4,
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(229, 62, 62, 0.15)' 
            : '1px solid rgba(185, 28, 28, 0.12)',
        }}>
          <Typography variant="body2" color="primary.main" fontWeight="medium">
            Step 1 of 4: Model & Department Selection
          </Typography>
        </Box>
      </Box>

      {/* AI Model Selection */}
      <Box mb={6}>
        <Box display="flex" alignItems="center" mb={3}>
          <Bot size={24} style={{ marginRight: 12, color: theme.palette.primary.main }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: designTokens.typography.fontWeights.semibold,
              flex: 1,
            }}
          >
            Select AI Model
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
            {availableModels.length} of {models.length} available
          </Typography>
          <Chip 
            label="Required" 
            size="small" 
            color="error"
            sx={{ 
              fontSize: '0.75rem',
              height: 24,
            }} 
          />
        </Box>
        
        <Grid container spacing={{ xs: getSpacing('sm'), md: getSpacing('md') }}>
          {models.map((model) => (
            <Grid size={{ xs: 12, sm: 6, md: isTablet ? 6 : 4 }} key={model.id}>
              <Paper
                component="button"
                disabled={!model.available}
                elevation={selectedModel === model.id ? 3 : 1}
                sx={{
                  p: 3,
                  width: '100%',
                  textAlign: 'left',
                  cursor: model.available ? 'pointer' : 'not-allowed',
                  backgroundColor: selectedModel === model.id 
                    ? (theme.palette.mode === 'dark' ? 'rgba(229, 62, 62, 0.12)' : 'rgba(185, 28, 28, 0.04)')
                    : !model.available ? 'action.disabledBackground' : 'background.paper',
                  borderRadius: '12px',
                  minHeight: designTokens.touchTarget.large * 4,
                  transition: 'all 0.2s ease, transform 0.15s ease',
                  opacity: model.available ? 1 : 0.6,
                  position: 'relative',
                  ...(selectedModel === model.id && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '12px',
                      border: `2px solid ${theme.palette.primary.main}`,
                      pointerEvents: 'none',
                    },
                  }),
                  '&:hover': model.available ? {
                    boxShadow: theme.palette.mode === 'dark' 
                      ? '0 10px 32px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25)'
                      : '0 4px 12px rgba(185, 28, 28, 0.15)',
                    transform: 'translateY(-3px)',
                  } : {},
                  '&:focus-visible': model.available ? {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  } : {},
                  '&:active': model.available ? {
                    transform: 'translateY(-1px)',
                  } : {},
                }}
                onClick={() => model.available && handleModelChange(model.id)}
                aria-label={`${model.available ? 'Select' : 'Unavailable'} ${model.name} AI model`}
                role="radio"
                aria-checked={selectedModel === model.id}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: designTokens.typography.fontWeights.semibold,
                      color: selectedModel === model.id ? 'primary.main' : 
                             !model.available ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {model.name}
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    {model.recommended && model.available && (
                      <Chip 
                        label="Recommended" 
                        size="small" 
                        color="primary" 
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20,
                        }} 
                      />
                    )}
                    {!model.available && (
                      <Chip 
                        label="Coming Soon" 
                        size="small" 
                        color="default" 
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20,
                          opacity: 0.7,
                        }} 
                      />
                    )}
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2, 
                    lineHeight: 1.5,
                    color: !model.available ? 'text.disabled' : 'text.secondary',
                  }}
                >
                  {model.description}
                </Typography>
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mb: 2,
                    fontWeight: designTokens.typography.fontWeights.medium,
                    color: !model.available ? 'text.disabled' : 'text.secondary',
                  }}
                >
                  Provider: {model.provider}
                </Typography>
                
                <Box>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block', 
                      mb: 1,
                      fontWeight: designTokens.typography.fontWeights.medium,
                    }}
                  >
                    Capabilities:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {model.capabilities.slice(0, isMobile ? 2 : 3).map((capability, index) => (
                      <Chip 
                        key={index} 
                        label={capability} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 24,
                        }}
                      />
                    ))}
                    {model.capabilities.length > (isMobile ? 2 : 3) && (
                      <Tooltip 
                        title={model.capabilities.slice(isMobile ? 2 : 3).join(', ')}
                        arrow
                      >
                        <Chip 
                          label={`+${model.capabilities.length - (isMobile ? 2 : 3)} more`} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 24,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {errors.model && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errors.model}
          </Alert>
        )}
        
        {selectedModelData && !errors.model && (
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
            onChange={(e) => handleDepartmentChange(e.target.value)}
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

        {errors.department && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errors.department}
          </Alert>
        )}

        {selectedDepartmentData && !errors.department && (
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
      {!isFormValid && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<AlertCircle />}>
          Please select both AI Model and Department to continue.
        </Alert>
      )}

      {/* Continue Button */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={validateAndProceed}
          disabled={!isFormValid || validating}
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