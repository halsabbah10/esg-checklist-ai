import React from 'react';
import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  AlertTitle,
  Box,
  IconButton,
  Snackbar,
  styled,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Close,
} from '@mui/icons-material';
import { designTokens, getBorderRadius, getSpacing } from '../../theme/designTokens';

// Extended alert props with design system enhancements
export interface AlertProps extends Omit<MuiAlertProps, 'severity'> {
  severity?: 'success' | 'info' | 'warning' | 'error';
  variant?: 'filled' | 'outlined' | 'standard';
  size?: 'sm' | 'md' | 'lg';
  closable?: boolean;
  onClose?: () => void;
  title?: string;
  persistent?: boolean;
  animate?: boolean;
}

// Styled alert with enhanced design
const StyledAlert = styled(MuiAlert, {
  shouldForwardProp: (prop) => 
    !['size', 'animate'].includes(prop as string),
})<{ size?: 'sm' | 'md' | 'lg'; animate?: boolean }>(({ theme, size = 'md', animate = true }) => ({
  borderRadius: getBorderRadius('md'),
  padding: size === 'sm' ? getSpacing('sm') : size === 'lg' ? getSpacing('lg') : getSpacing('md'),
  fontSize: designTokens.typography.fontSizes[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'base'],
  
  // Animation
  ...(animate && {
    transition: `all ${designTokens.animation.normal} ease-in-out`,
    '&.MuiAlert-root': {
      animation: 'slideInDown 0.3s ease-out',
    },
  }),
  
  // Enhanced icons
  '& .MuiAlert-icon': {
    fontSize: size === 'sm' ? '1.2rem' : size === 'lg' ? '1.8rem' : '1.5rem',
    marginRight: getSpacing('sm'),
  },
  
  // Action styling
  '& .MuiAlert-action': {
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  
  '@keyframes slideInDown': {
    from: {
      transform: 'translateY(-100%)',
      opacity: 0,
    },
    to: {
      transform: 'translateY(0)',
      opacity: 1,
    },
  },
}));

// Custom icons for each severity
const severityIcons = {
  success: CheckCircle,
  info: Info,
  warning: Warning,
  error: ErrorIcon,
};

// Main Alert component
export const Alert: React.FC<AlertProps> = React.memo(({
  children,
  severity = 'info',
  variant = 'standard',
  size = 'md',
  closable = false,
  onClose,
  title,
  persistent = false,
  animate = true,
  ...props
}) => {
  const theme = useTheme();
  const IconComponent = severityIcons[severity];

  const alertContent = (
    <StyledAlert
      severity={severity}
      variant={variant}
      size={size}
      animate={animate}
      icon={<IconComponent />}
      action={closable ? (
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={onClose}
          sx={{
            minWidth: designTokens.touchTarget.minSize,
            minHeight: designTokens.touchTarget.minSize,
          }}
        >
          <Close fontSize="inherit" />
        </IconButton>
      ) : undefined}
      {...props}
    >
      {title && (
        <AlertTitle sx={{ 
          fontWeight: designTokens.typography.fontWeights.semibold,
          marginBottom: getSpacing('xs'),
        }}>
          {title}
        </AlertTitle>
      )}
      {children}
    </StyledAlert>
  );

  // Render as toast if not persistent
  if (!persistent) {
    return (
      <Snackbar
        open={true}
        autoHideDuration={6000}
        onClose={onClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {alertContent}
      </Snackbar>
    );
  }

  return alertContent;
});

Alert.displayName = 'Alert';

// Predefined alert variants
export const SuccessAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="success" {...props} />
);

export const InfoAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="info" {...props} />
);

export const WarningAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="warning" {...props} />
);

export const ErrorAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="error" {...props} />
);

// Toast notification hook for programmatic alerts
export const useToast = () => {
  const showToast = React.useCallback((
    message: string,
    severity: AlertProps['severity'] = 'info',
    options?: Partial<AlertProps>
  ) => {
    // This would integrate with a toast provider context
    // For now, it's a placeholder for the toast system
    console.log('Toast:', { message, severity, options });
  }, []);

  return {
    success: (message: string, options?: Partial<AlertProps>) => 
      showToast(message, 'success', options),
    info: (message: string, options?: Partial<AlertProps>) => 
      showToast(message, 'info', options),
    warning: (message: string, options?: Partial<AlertProps>) => 
      showToast(message, 'warning', options),
    error: (message: string, options?: Partial<AlertProps>) => 
      showToast(message, 'error', options),
  };
};

// Loading state component
export const LoadingAlert: React.FC<Omit<AlertProps, 'severity' | 'children'>> = ({
  title = 'Loading...',
  ...props
}) => (
  <Alert 
    severity="info" 
    title={title}
    persistent
    closable={false}
    {...props}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 16,
          height: 16,
          border: '2px solid currentColor',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      Processing your request...
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  </Alert>
);

export default Alert;