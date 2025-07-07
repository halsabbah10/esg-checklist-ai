import React, { useState } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
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
      <Box component="main" flexGrow={1} sx={{ p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
