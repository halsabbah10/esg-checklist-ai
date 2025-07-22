import React from 'react';
import {
  Breadcrumbs as MuiBreadcrumbs,
  BreadcrumbsProps as MuiBreadcrumbsProps,
  Link,
  Typography,
  Box,
  styled,
  useTheme,
} from '@mui/material';
import {
  NavigateNext,
  Home,
  ChevronRight,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { designTokens, getSpacing, getFontSize } from '../../theme/designTokens';

// Breadcrumb item interface
export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

// Extended breadcrumbs props
export interface BreadcrumbsProps extends Omit<MuiBreadcrumbsProps, 'children'> {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'pills';
  autoGenerate?: boolean;
}

// Styled breadcrumbs container
const StyledBreadcrumbs = styled(MuiBreadcrumbs, {
  shouldForwardProp: (prop) => 
    !['size', 'variant'].includes(prop as string),
})<{ size?: 'sm' | 'md' | 'lg'; variant?: 'default' | 'compact' | 'pills' }>(
  ({ theme, size = 'md', variant = 'default' }) => ({
    fontSize: getFontSize(size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'base'),
    padding: variant === 'pills' ? getSpacing('sm') : 0,
    backgroundColor: variant === 'pills' ? theme.palette.action.hover : 'transparent',
    borderRadius: variant === 'pills' ? designTokens.borderRadius.md : 0,
    
    '& .MuiBreadcrumbs-separator': {
      margin: `0 ${getSpacing('xs')}`,
      color: theme.palette.text.secondary,
    },
    
    '& .MuiBreadcrumbs-li': {
      display: 'flex',
      alignItems: 'center',
      
      ...(variant === 'compact' && {
        '&:not(:last-child)': {
          maxWidth: 100,
          overflow: 'hidden',
        },
      }),
    },
  })
);

// Styled breadcrumb link
const BreadcrumbLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: getSpacing('xs'),
  textDecoration: 'none',
  color: theme.palette.text.secondary,
  minHeight: designTokens.touchTarget.minSize,
  padding: `${getSpacing('xs')} ${getSpacing('sm')}`,
  borderRadius: designTokens.borderRadius.sm,
  transition: `all ${designTokens.animation.fast} ease-in-out`,
  
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
    textDecoration: 'none',
    transform: 'translateY(-1px)',
  },
  
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// Generate breadcrumbs from current path
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  
  const pathMap: Record<string, string> = {
    dashboard: 'Dashboard',
    'ai-analysis': 'AI Analysis',
    analytics: 'Analytics',
    reports: 'Reports',
    admin: 'Administration',
    users: 'User Management',
    checklists: 'Checklists',
    settings: 'Settings',
    help: 'Help & Support',
  };
  
  return segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return {
      label,
      path: index === segments.length - 1 ? undefined : path, // Last item is current page
    };
  });
};

// Main Breadcrumbs component
export const Breadcrumbs: React.FC<BreadcrumbsProps> = React.memo(({
  items,
  showHome = true,
  homeLabel = 'Home',
  homePath = '/dashboard',
  size = 'md',
  variant = 'default',
  autoGenerate = false,
  separator = <ChevronRight fontSize="small" />,
  ...props
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Generate breadcrumbs from current path if autoGenerate is true
  const breadcrumbItems = React.useMemo(() => {
    if (autoGenerate && !items) {
      return generateBreadcrumbs(location.pathname);
    }
    return items || [];
  }, [items, autoGenerate, location.pathname]);
  
  // Handle navigation
  const handleNavigation = React.useCallback((path: string) => {
    navigate(path);
  }, [navigate]);
  
  // Create breadcrumb items
  const breadcrumbElements = React.useMemo(() => {
    const elements: React.ReactNode[] = [];
    
    // Add home breadcrumb
    if (showHome && location.pathname !== homePath) {
      elements.push(
        <BreadcrumbLink
          key="home"
          onClick={() => handleNavigation(homePath)}
          sx={{ cursor: 'pointer' }}
        >
          <Home fontSize="small" />
          {variant !== 'compact' && homeLabel}
        </BreadcrumbLink>
      );
    }
    
    // Add other breadcrumbs
    breadcrumbItems.forEach((item, index) => {
      const isLast = index === breadcrumbItems.length - 1;
      
      if (item.path && !isLast && !item.disabled) {
        elements.push(
          <BreadcrumbLink
            key={item.path}
            onClick={() => handleNavigation(item.path!)}
            sx={{ cursor: 'pointer' }}
          >
            {item.icon}
            <Typography
              component="span"
              sx={{
                ...(variant === 'compact' && {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }),
              }}
            >
              {item.label}
            </Typography>
          </BreadcrumbLink>
        );
      } else {
        // Current page (no link)
        elements.push(
          <Box
            key={`current-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.primary',
              fontWeight: designTokens.typography.fontWeights.medium,
              padding: `${getSpacing('xs')} ${getSpacing('sm')}`,
            }}
          >
            {item.icon}
            <Typography
              component="span"
              color="text.primary"
              fontWeight="medium"
            >
              {item.label}
            </Typography>
          </Box>
        );
      }
    });
    
    return elements;
  }, [
    showHome,
    homeLabel,
    homePath,
    location.pathname,
    breadcrumbItems,
    variant,
    handleNavigation,
  ]);
  
  // Don't render if no breadcrumbs
  if (breadcrumbElements.length === 0) {
    return null;
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: designTokens.touchTarget.minSize,
        py: 1,
      }}
    >
      <StyledBreadcrumbs
        size={size}
        variant={variant}
        separator={separator}
        aria-label="breadcrumb navigation"
        {...props}
      >
        {breadcrumbElements}
      </StyledBreadcrumbs>
    </Box>
  );
});

Breadcrumbs.displayName = 'Breadcrumbs';

// Predefined breadcrumb variants
export const CompactBreadcrumbs: React.FC<Omit<BreadcrumbsProps, 'variant'>> = (props) => (
  <Breadcrumbs variant="compact" size="sm" {...props} />
);

export const PillsBreadcrumbs: React.FC<Omit<BreadcrumbsProps, 'variant'>> = (props) => (
  <Breadcrumbs variant="pills" {...props} />
);

export const AutoBreadcrumbs: React.FC<Omit<BreadcrumbsProps, 'autoGenerate'>> = (props) => (
  <Breadcrumbs autoGenerate {...props} />
);

export default Breadcrumbs;