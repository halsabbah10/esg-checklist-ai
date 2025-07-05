import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Container,
} from '@mui/material';
import { CloudUpload, Assignment } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { checklistsAPI } from '../services/api';

interface ChecklistItem {
  id: string;
  title?: string;
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('');

  // Fetch available checklists
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => checklistsAPI.getAll(),
    select: response => response.data.results || [],
  });

  const handleUploadClick = () => {
    if (selectedChecklistId) {
      navigate(`/checklists/${selectedChecklistId}/upload`);
    } else if (checklists && checklists.length > 0) {
      // Use the first available checklist as default
      navigate(`/checklists/${checklists[0].id}/upload`);
    }
  };

  const handleQuickUpload = () => {
    // For quick upload, use a default checklist ID (assuming ID 1 exists)
    navigate('/checklists/1/upload');
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">Loading checklists...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom align="center" color="primary">
          Document Upload
        </Typography>

        <Typography variant="h6" align="center" color="text.secondary" paragraph>
          Upload ESG documents for AI-powered compliance analysis
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Quick Upload Option */}
          <Card elevation={2}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Quick Upload
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Upload documents to the default checklist for immediate analysis
              </Typography>
              <Button variant="contained" size="large" onClick={handleQuickUpload} sx={{ mt: 2 }}>
                Start Quick Upload
              </Button>
            </CardContent>
          </Card>

          {/* Checklist Selection */}
          {checklists && checklists.length > 0 && (
            <Card elevation={2}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Assignment sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h5">Choose Specific Checklist</Typography>
                </Box>

                <Typography variant="body1" color="text.secondary" paragraph>
                  Select a specific checklist for targeted compliance analysis
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Select Checklist</InputLabel>
                  <Select
                    value={selectedChecklistId}
                    onChange={e => setSelectedChecklistId(e.target.value)}
                    label="Select Checklist"
                  >
                    {checklists.map((checklist: unknown) => {
                      const checklistItem = checklist as ChecklistItem;
                      return (
                        <MenuItem key={checklistItem.id} value={checklistItem.id}>
                          {checklistItem.title || `Checklist ${checklistItem.id}`}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleUploadClick}
                  disabled={!selectedChecklistId}
                  fullWidth
                >
                  Upload to Selected Checklist
                </Button>
              </CardContent>
            </Card>
          )}

          {/* No Checklists Available */}
          {checklists && checklists.length === 0 && (
            <Alert severity="info">
              No checklists available. Please contact your administrator to create checklists.
            </Alert>
          )}
        </Box>
      </Box>
    </Container>
  );
};
