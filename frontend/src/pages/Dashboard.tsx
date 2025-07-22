import React from 'react';
import { RoleDashboard } from '../components/RoleDashboard';
import { PageTransition } from '../components/ui';

export const Dashboard: React.FC = () => {
  return (
    <PageTransition in={true} variant="fade" duration={500}>
      <RoleDashboard />
    </PageTransition>
  );
};
