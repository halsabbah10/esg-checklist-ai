import React, { useState } from 'react';
import { Box, Toolbar, Container, useTheme, useMediaQuery } from '@mui/material';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box display="flex" minHeight="100vh">
      <Sidebar isOpen={isMobile ? sidebarOpen : true} onClose={() => setSidebarOpen(false)} />
      <Box component="main" flexGrow={1}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
