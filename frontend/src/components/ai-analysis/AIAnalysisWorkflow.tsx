import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import Step1ModelDepartmentSelection from './Step1ModelDepartmentSelection';
import Step2DocumentUpload from './Step2DocumentUpload';
import Step3ProcessingAnalysis from './Step3ProcessingAnalysis';
import ComprehensiveStep4ResultsDisplay from './ComprehensiveStep4ResultsDisplay';

interface AIAnalysisState {
  currentStep: number;
  selectedModel: string | null;
  selectedDepartment: string | null;
  uploadedFile: File | null;
  analysisId: number | null;
  error: string | null;
  isProcessing: boolean;
}

const STEPS = [
  {
    id: 1,
    title: 'Model & Department Selection',
    description: 'Choose AI model and department for analysis',
    icon: Settings,
    component: Step1ModelDepartmentSelection
  },
  {
    id: 2,
    title: 'Document Upload',
    description: 'Upload your ESG document for analysis',
    icon: Upload,
    component: Step2DocumentUpload
  },
  {
    id: 3,
    title: 'AI Analysis',
    description: 'Processing your document with AI',
    icon: FileText,
    component: Step3ProcessingAnalysis
  },
  {
    id: 4,
    title: 'Results',
    description: 'View your ESG analysis results',
    icon: BarChart3,
    component: ComprehensiveStep4ResultsDisplay
  }
];

export default function AIAnalysisWorkflow() {
  const [state, setState] = useState<AIAnalysisState>({
    currentStep: 0, // Material-UI Stepper is 0-indexed
    selectedModel: null,
    selectedDepartment: null,
    uploadedFile: null,
    analysisId: null,
    error: null,
    isProcessing: false
  });

  const updateState = (updates: Partial<AIAnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleStepComplete = (stepData: any) => {
    // Handle restart request from Step 4
    if (stepData.restart) {
      resetWorkflow();
      return;
    }

    switch (state.currentStep) {
      case 0: // Step 1
        updateState({
          selectedModel: stepData.model,
          selectedDepartment: stepData.department,
          currentStep: 1,
          error: null
        });
        break;
      case 1: // Step 2
        updateState({
          uploadedFile: stepData.file,
          currentStep: 2,
          isProcessing: true,
          error: null
        });
        break;
      case 2: // Step 3
        updateState({
          analysisId: stepData.analysisId,
          currentStep: 3,
          isProcessing: false,
          error: null
        });
        break;
      case 3: // Step 4 - Handle any additional completion logic
        // Step 4 is the final step, any completion here would be for special actions
        break;
    }
  };

  const handleError = (error: string) => {
    updateState({ error, isProcessing: false });
  };

  const resetWorkflow = () => {
    setState({
      currentStep: 0,
      selectedModel: null,
      selectedDepartment: null,
        uploadedFile: null,
      analysisId: null,
      error: null,
      isProcessing: false
    });
  };

  const handleStepBack = () => {
    if (state.currentStep > 0) {
      updateState({ 
        currentStep: state.currentStep - 1, 
        error: null,
        isProcessing: false 
      });
    }
  };

  const CurrentStepComponent = STEPS[state.currentStep]?.component;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          AI Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive ESG compliance analysis powered by AI
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant="h6">Progress</Typography>
        </CardHeader>
        <CardContent>
          <Stepper activeStep={state.currentStep} orientation="horizontal">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Step key={step.id}>
                  <StepLabel
                    icon={
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: index <= state.currentStep ? 'primary.main' : 'grey.300',
                          color: 'white'
                        }}
                      >
                        {index < state.currentStep ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <Icon size={20} />
                        )}
                      </Box>
                    }
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {step.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<AlertCircle />}>
          {state.error}
        </Alert>
      )}

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <Box display="flex" alignItems="center">
            {React.createElement(STEPS[state.currentStep].icon, { 
              size: 20, 
              style: { marginRight: 8 } 
            })}
            <Typography variant="h6">
              Step {state.currentStep + 1}: {STEPS[state.currentStep].title}
            </Typography>
          </Box>
        </CardHeader>
        <CardContent>
          {CurrentStepComponent && (
            <CurrentStepComponent
              state={state}
              onComplete={handleStepComplete}
              onError={handleError}
              onBack={handleStepBack}
            />
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          onClick={resetWorkflow}
          disabled={state.isProcessing}
        >
          Start Over
        </Button>
        
        {state.currentStep > 0 && (
          <Button
            variant="outlined"
            onClick={handleStepBack}
            disabled={state.isProcessing}
          >
            Previous Step
          </Button>
        )}
      </Box>
    </Container>
  );
}