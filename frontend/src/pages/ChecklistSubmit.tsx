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
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { Send, ArrowBack, ArrowForward } from '@mui/icons-material';
import { checklistsAPI, submissionsAPI } from '../services/api';

interface ChecklistItem {
  id: number;
  question_text: string;
  weight?: number;
  category?: string;
  is_required?: boolean;
  order_index?: number;
}

interface Answer {
  item_id: number;
  answer: string;
  score?: number;
}

export const ChecklistSubmit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch checklist details
  const {
    data: checklist,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['checklist', id],
    queryFn: async () => {
      const [checklistRes, itemsRes] = await Promise.all([
        checklistsAPI.getById(id!),
        checklistsAPI.getItems(id!),
      ]);
      return {
        ...checklistRes.data,
        items: itemsRes.data,
      };
    },
    enabled: !!id,
  });

  // Submit answers
  const submitMutation = useMutation({
    mutationFn: async (submissionData: Answer[]) => {
      return submissionsAPI.create(id!, submissionData);
    },
    onSuccess: () => {
      navigate(`/checklists/${id}/results`);
    },
  });

  const handleAnswerChange = (itemId: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!checklist) return;

    setIsSubmitting(true);
    try {
      const submissionData: Answer[] = checklist.items.map((item: ChecklistItem) => ({
        item_id: item.id,
        answer: answers[item.id] || '',
        score: getAnswerScore(answers[item.id]),
      }));

      await submitMutation.mutateAsync(submissionData);
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnswerScore = (answer: string): number => {
    if (!answer) return 0;
    // Simple scoring logic - can be enhanced
    const lowerAnswer = answer.toLowerCase();
    if (lowerAnswer.includes('yes') || lowerAnswer.includes('implemented') || lowerAnswer.includes('compliant')) {
      return 100;
    } else if (lowerAnswer.includes('partial') || lowerAnswer.includes('in progress')) {
      return 50;
    } else if (lowerAnswer.includes('no') || lowerAnswer.includes('not implemented')) {
      return 0;
    }
    return 50; // Default for text answers
  };

  const renderQuestion = (item: ChecklistItem) => {
    const isRequired = item.is_required;
    const currentAnswer = answers[item.id] || '';

    // Determine question type based on question text
    const isYesNo = item.question_text.toLowerCase().includes('do you') || 
                    item.question_text.toLowerCase().includes('does the') ||
                    item.question_text.toLowerCase().includes('is there');

    return (
      <Card key={item.id} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {item.question_text}
            {isRequired && <span style={{ color: 'red' }}> *</span>}
          </Typography>
          
          {item.category && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Category: {item.category}
            </Typography>
          )}

          {isYesNo ? (
            <FormControl component="fieldset">
              <RadioGroup
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(item.id, e.target.value)}
              >
                <FormControlLabel
                  value="Yes - Fully Implemented"
                  control={<Radio />}
                  label="Yes - Fully Implemented"
                />
                <FormControlLabel
                  value="Partially Implemented"
                  control={<Radio />}
                  label="Partially Implemented"
                />
                <FormControlLabel
                  value="No - Not Implemented"
                  control={<Radio />}
                  label="No - Not Implemented"
                />
                <FormControlLabel
                  value="Not Applicable"
                  control={<Radio />}
                  label="Not Applicable"
                />
              </RadioGroup>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
              placeholder="Provide your detailed response..."
              required={isRequired}
            />
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

  const itemsPerStep = 5;
  const totalSteps = Math.ceil(checklist.items.length / itemsPerStep);
  const currentItems = checklist.items.slice(
    currentStep * itemsPerStep,
    (currentStep + 1) * itemsPerStep
  );

  const requiredAnswered = checklist.items
    .filter((item: ChecklistItem) => item.is_required)
    .every((item: ChecklistItem) => answers[item.id]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/checklists')}
            sx={{ mr: 2 }}
          >
            Back to Checklists
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            {checklist.title}
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {checklist.description}
        </Typography>

        {/* Progress Stepper */}
        {totalSteps > 1 && (
          <Stepper activeStep={currentStep} sx={{ mt: 3 }}>
            {Array.from({ length: totalSteps }, (_, index) => (
              <Step key={index}>
                <StepLabel>Step {index + 1}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      {/* Questions */}
      <Box>
        {currentItems.map(renderQuestion)}
      </Box>

      {/* Navigation */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <Typography variant="body2" color="text.secondary">
            Step {currentStep + 1} of {totalSteps} ({checklist.items.length} questions total)
          </Typography>

          {currentStep < totalSteps - 1 ? (
            <Button
              endIcon={<ArrowForward />}
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              variant="contained"
            >
              Next
            </Button>
          ) : (
            <Button
              endIcon={<Send />}
              onClick={handleSubmit}
              variant="contained"
              color="success"
              disabled={!requiredAnswered || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Checklist'}
            </Button>
          )}
        </Box>

        {!requiredAnswered && currentStep === totalSteps - 1 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please answer all required questions before submitting.
          </Alert>
        )}

        {submitMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to submit checklist. Please try again.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};
