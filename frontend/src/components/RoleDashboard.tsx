import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard, ReviewerDashboard } from './dashboards';
import { FallbackAuditorDashboard } from './dashboards/FallbackAuditorDashboard';

export const RoleDashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Fully restored role-based dashboard routing
  switch (user.role) {
    case 'admin':
    case 'super_admin':
      return <AdminDashboard />;
    case 'reviewer':
      return <ReviewerDashboard />;
    case 'auditor':
      return <FallbackAuditorDashboard />;
    default:
      return <FallbackAuditorDashboard />; // Default to fallback auditor view
  }
};
