import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Paper } from '@mui/material';

export const DebugAuth: React.FC = () => {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const token = localStorage.getItem('authToken');

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Authentication Debug Info
      </Typography>
      <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
        <div>isAuthenticated: {String(isAuthenticated)}</div>
        <div>isLoading: {String(isLoading)}</div>
        <div>error: {error || 'null'}</div>
        <div>user: {user ? JSON.stringify(user, null, 2) : 'null'}</div>
        <div>token in localStorage: {token ? 'exists' : 'none'}</div>
        <div>token length: {token?.length || 0}</div>
      </Box>
    </Paper>
  );
};
