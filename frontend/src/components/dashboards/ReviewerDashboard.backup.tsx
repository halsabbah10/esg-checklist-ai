import React from 'react';
import { Container, Card, CardContent, Typography, Box, Alert } from '@mui/material';

export const ReviewerDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Reviewer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and evaluate file uploads and AI analysis results
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Alert severity="info">
            Dashboard is temporarily in recovery mode. Advanced features will be restored shortly.
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
};