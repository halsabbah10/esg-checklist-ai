import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  InputAdornment,
  Fab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  PlayArrow,
  Visibility,
  Edit,
  Upload,
} from '@mui/icons-material';
import { checklistsAPI } from '../services/api';

interface Checklist {
  id: number;
  title: string;
  description: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  items?: Array<{
    id: number;
    question_text: string;
    weight?: number;
    category?: string;
    is_required?: boolean;
  }>;
}

export const Checklists = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: checklists = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => checklistsAPI.getAll().then((res: any) => res.data),
  });

  const filteredChecklists = checklists.filter((checklist: Checklist) =>
    checklist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    checklist.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (isActive?: boolean) => {
    return isActive ? 'success' : 'default';
  };

  const getStatus = (isActive?: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleStartChecklist = (checklistId: number) => {
    navigate(`/checklists/${checklistId}/submit`);
  };

  const handleViewDetails = (checklistId: number) => {
    navigate(`/checklists/${checklistId}`);
  };

  const handleUploadFile = (checklistId: number) => {
    navigate(`/checklists/${checklistId}/upload`);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load checklists. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          ESG Checklists
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/checklists/new')}
        >
          Create Checklist
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search checklists..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Checklists Grid */}
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
        }}
        gap={3}
      >
        {filteredChecklists.map((checklist: Checklist) => (
          <Card key={checklist.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1 }}>
                  {checklist.title}
                </Typography>
                <Chip
                  label={getStatus(checklist.is_active)}
                  color={getStatusColor(checklist.is_active) as any}
                  size="small"
                />
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                {checklist.description}
              </Typography>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Questions: {checklist.items?.length || 0}
                </Typography>
                {checklist.updated_at && (
                  <Typography variant="body2" color="text.secondary">
                    Updated: {new Date(checklist.updated_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </CardContent>

            <CardActions>
              <Button
                size="small"
                startIcon={<Visibility />}
                onClick={() => handleViewDetails(checklist.id)}
              >
                View
              </Button>
              {checklist.is_active && (
                <>
                  <Button
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartChecklist(checklist.id)}
                    color="primary"
                  >
                    Start
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Upload />}
                    onClick={() => handleUploadFile(checklist.id)}
                    color="secondary"
                  >
                    Upload File
                  </Button>
                </>
              )}
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => navigate(`/checklists/${checklist.id}/edit`)}
              >
                Edit
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {filteredChecklists.length === 0 && !isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="200px"
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No checklists found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm ? 'Try adjusting your search criteria' : 'Create your first checklist to get started'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/checklists/new')}
          >
            Create Checklist
          </Button>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/checklists/new')}
      >
        <Add />
      </Fab>
    </Box>
  );
};
