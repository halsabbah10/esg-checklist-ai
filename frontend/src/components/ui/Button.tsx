import React from 'react';
import { Button as MuiButton, styled } from '@mui/material';
import { designTokens, getBorderRadius, getElevation } from '../../theme/designTokens';

// Extended button props with design system variants
export interface ButtonProps extends Omit<React.ComponentProps<typeof MuiButton>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
}

// Styled button with consistent design tokens
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => 
    !['elevation', 'loading', 'rounded'].includes(prop as string),
})<ButtonProps>(({ theme, size = 'md', elevation = 'sm', rounded = false }) => {
  const sizeConfig = designTokens.components.button;
  const sizeKey = size as keyof typeof sizeConfig.height;
  
  return {
    height: sizeConfig.height[sizeKey],
    minHeight: designTokens.touchTarget.minSize,
    padding: `${sizeConfig.padding[sizeKey].y}px ${sizeConfig.padding[sizeKey].x}px`,
    borderRadius: rounded ? getBorderRadius('full') : getBorderRadius('md'),
    fontWeight: designTokens.typography.fontWeights.medium,
    fontSize: designTokens.typography.fontSizes[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'base'],
    textTransform: 'none',
    transition: `all ${designTokens.animation.normal} ease-in-out`,
    boxShadow: getElevation(elevation),
    
    // Hover effects
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: elevation !== 'none' ? getElevation('lg') : 'none',
    },
    
    // Active state
    '&:active': {
      transform: 'translateY(0)',
    },
    
    // Focus state for accessibility
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },
    
    // Disabled state
    '&:disabled': {
      transform: 'none',
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    
    // Loading spinner keyframes
    '& .button-spinner': {
      '@keyframes spin': {
        to: {
          transform: 'rotate(360deg)',
        },
      },
      animation: 'spin 1s linear infinite',
    },
  };
});

// Main Button component with enhanced features
export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  loading = false,
  disabled,
  size = 'md',
  elevation = 'sm',
  rounded = false,
  fullWidth = false,
  startIcon,
  endIcon,
  ...props
}) => {
  return (
    <StyledButton
      elevation={elevation}
      rounded={rounded}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? undefined : startIcon}
      endIcon={loading ? undefined : endIcon}
      {...props}
    >
      {loading ? (
        <>
          <span 
            className="button-spinner"
            style={{ 
              display: 'inline-block',
              width: 16,
              height: 16,
              marginRight: 8,
              border: '2px solid currentColor',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
            }} 
          />
          Loading...
        </>
      ) : (
        children
      )}
      
    </StyledButton>
  );
});

Button.displayName = 'Button';

// Predefined button variants for common use cases
export const PrimaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="contained" color="primary" {...props} />
);

export const SecondaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="outlined" color="primary" {...props} />
);

export const DangerButton: React.FC<ButtonProps> = (props) => (
  <Button variant="contained" color="error" {...props} />
);

export const GhostButton: React.FC<ButtonProps> = (props) => (
  <Button variant="text" elevation="none" {...props} />
);

export const IconButton: React.FC<ButtonProps> = (props) => (
  <Button size="sm" rounded elevation="sm" {...props} />
);

export default Button;