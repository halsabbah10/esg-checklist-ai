import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import api from '../services/api';

interface Question {
  id: number;
  text: string;
  description?: string;
  type: 'multiple_choice' | 'text' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface Answer {
  question_id: number;
  value: string;
  confidence?: number;
}

interface ChecklistDetail {
  id: number;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  questions: Question[];
  answers?: Answer[];
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export const ChecklistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const {
    data: checklist,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => api.get(`/checklists/${id}`).then((res: any) => res.data as ChecklistDetail),
    enabled: !!id,
  });

  const saveAnswersMutation = useMutation({
    mutationFn: (data: { answers: Answer[] }) =>
      api.post(`/checklists/${id}/answers`, data).then((res: any) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
    },
  });

  const submitChecklistMutation = useMutation({
    mutationFn: () =>
      api.post(`/checklists/${id}/submit`).then((res: any) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      navigate('/checklists');
    },
  });

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSaveAnswers = () => {
    const answersArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      question_id: parseInt(questionId),
      value,
    }));

    saveAnswersMutation.mutate({ answers: answersArray });
  };

  const handleSubmitChecklist = () => {
    handleSaveAnswers();
    submitChecklistMutation.mutate();
  };

  const handleNext = () => {
    if (currentStep < (checklist?.questions.length || 0) - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCompletedQuestionsCount = () => {
    if (!checklist) return 0;
    return checklist.questions.filter(q => 
      answers[q.id] || checklist.answers?.find(a => a.question_id === q.id)
    ).length;
  };

  const getProgressPercentage = () => {
    if (!checklist?.questions.length) return 0;
    return (getCompletedQuestionsCount() / checklist.questions.length) * 100;
  };

  const renderQuestion = (question: Question) => {
    const existingAnswer = checklist?.answers?.find(a => a.question_id === question.id);
    const currentAnswer = answers[question.id] || existingAnswer?.value || '';

    switch (question.type) {
      case 'yes_no':
        return (
          <FormControl component="fieldset">
            <FormLabel component="legend">{question.text}</FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                {question.description}
              </Typography>
            )}
            <RadioGroup
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        );

      case 'multiple_choice':
        return (
          <FormControl component="fieldset">
            <FormLabel component="legend">{question.text}</FormLabel>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                {question.description}
              </Typography>
            )}
            <RadioGroup
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'text':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {question.text}
            </Typography>
            {question.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {question.description}
              </Typography>
            )}
            <TextField
              fullWidth
              multiline
              rows={4}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Enter your answer..."
            />
          </Box>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !checklist) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load checklist. Please try again later.
        </Alert>
      </Box>
    );
  }

  const currentQuestion = checklist.questions[currentStep];

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/checklists')}
          sx={{ mr: 2 }}
        >
          Back to Checklists
        </Button>
        <Box flexGrow={1}>
          <Typography variant="h4" component="h1">
            {checklist.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {checklist.description}
          </Typography>
        </Box>
        <Chip
          label={checklist.status}
          color={checklist.status === 'completed' ? 'success' : 'primary'}
        />
      </Box>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Progress</Typography>
            <Typography variant="body2">
              {getCompletedQuestionsCount()} of {checklist.questions.length} questions completed
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={getProgressPercentage()}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {Math.round(getProgressPercentage())}% complete
          </Typography>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Box mb={3}>
        <Stepper activeStep={currentStep} alternativeLabel>
          {checklist.questions.map((question, index) => {
            const isAnswered = answers[question.id] || checklist.answers?.find(a => a.question_id === question.id);
            return (
              <Step key={question.id}>
                <StepLabel
                  StepIconComponent={() => (
                    isAnswered ? <CheckCircle color="success" /> : <RadioButtonUnchecked />
                  )}
                >
                  Question {index + 1}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Box>

      {/* Current Question */}
      {currentQuestion && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Question {currentStep + 1} of {checklist.questions.length}
            {currentQuestion.required && (
              <Chip label="Required" size="small" color="primary" sx={{ ml: 1 }} />
            )}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {renderQuestion(currentQuestion)}
        </Paper>
      )}

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          variant="outlined"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={handleSaveAnswers}
            disabled={saveAnswersMutation.isPending}
          >
            Save Progress
          </Button>

          {currentStep < checklist.questions.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleSubmitChecklist}
              disabled={submitChecklistMutation.isPending}
            >
              Submit Checklist
            </Button>
          )}
        </Box>
      </Box>

      {/* All Questions Overview */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Questions
          </Typography>
          <List>
            {checklist.questions.map((question, index) => {
              const isAnswered = answers[question.id] || checklist.answers?.find(a => a.question_id === question.id);
              return (
                <Box key={question.id}>
                  <ListItem>
                    <ListItemButton
                      onClick={() => setCurrentStep(index)}
                      sx={{
                        bgcolor: currentStep === index ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Box display="flex" alignItems="center" mr={2}>
                        {isAnswered ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <RadioButtonUnchecked fontSize="small" />
                        )}
                      </Box>
                      <ListItemText
                        primary={`${index + 1}. ${question.text}`}
                        secondary={question.description}
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < checklist.questions.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
