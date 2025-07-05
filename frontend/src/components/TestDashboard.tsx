import React from 'react';
import { Typography, Box, Container } from '@mui/material';

export const TestDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Test Dashboard (Minimal)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This is a minimal dashboard with no API calls or complex logic to test for infinite reload
          issues.
        </Typography>
      </Box>
    </Container>
  );
};
