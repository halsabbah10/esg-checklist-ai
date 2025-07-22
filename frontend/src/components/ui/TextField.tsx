import React from 'react';
import { 
  TextField as MuiTextField, 
  styled
} from '@mui/material';
import { designTokens, getSpacing, getBorderRadius } from '../../theme/designTokens';

// Extended TextField props with design system variants
export interface CustomTextFieldProps extends Omit<React.ComponentProps<typeof MuiTextField>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

// Styled component props with $ prefix to avoid passing to DOM
interface StyledTextFieldProps extends Omit<React.ComponentProps<typeof MuiTextField>, 'size'> {
  $size?: 'sm' | 'md' | 'lg';
  $rounded?: boolean;
}

// Styled TextField with consistent design tokens
const StyledTextField = styled(MuiTextField, {
  shouldForwardProp: (prop) => !['$rounded', '$size'].includes(prop as string),
})<StyledTextFieldProps>(({ theme, $size = 'md', $rounded = false }) => {
  const inputConfig = designTokens.components.input;
  
  return {
    '& .MuiOutlinedInput-root': {
      minHeight: Math.max(
        $size === 'sm' ? inputConfig.height.sm : 
        $size === 'lg' ? inputConfig.height.lg : inputConfig.height.md,
        designTokens.touchTarget.minSize
      ),
      borderRadius: $rounded ? getBorderRadius('lg') : getBorderRadius('md'),
      backgroundColor: theme.palette.background.paper,
      transition: `all ${designTokens.animation.normal} ease-in-out`,
      
      '& fieldset': {
        borderColor: theme.palette.divider,
        borderWidth: 1,
        transition: `all ${designTokens.animation.normal} ease-in-out`,
        
      },
      
      '&:hover fieldset': {
        borderColor: theme.palette.text.secondary,
        borderWidth: 1,
      },
      
      '&.Mui-focused': {
        backgroundColor: theme.palette.background.paper,
        '& fieldset': {
          borderColor: theme.palette.primary.main,
          borderWidth: 2,
        },
      },
      
      '&.Mui-error fieldset': {
        borderColor: theme.palette.error.main,
      },
      
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        '& fieldset': {
          borderColor: theme.palette.action.disabled,
        },
      },
    },
    
    '& .MuiOutlinedInput-input': {
      color: theme.palette.text.primary,
      caretColor: theme.palette.text.primary,
      backgroundColor: 'transparent !important',
      padding: $size === 'sm' ? '10px 12px' :
               $size === 'lg' ? '14px 16px' : '12px 14px',
      fontSize: designTokens.typography.fontSizes[$size === 'sm' ? 'sm' : 
                                                   $size === 'lg' ? 'lg' : 'base'],
      lineHeight: 1.5,
      
      '&:focus': {
        backgroundColor: 'transparent !important',
        color: theme.palette.text.primary,
      },
      
      '&:not(:focus)': {
        color: theme.palette.text.primary,
      },
      
      // Autofill styles
      '&:-webkit-autofill': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        transition: 'background-color 5000s ease-in-out 0s',
      },
      
      '&:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
      },
      
      '&::placeholder': {
        color: theme.palette.text.secondary,
        opacity: 0.7,
      },
    },
    
    '& .MuiInputLabel-root': {
      fontFamily: 'inherit',
      color: theme.palette.mode === 'dark' ? '#D1D5DB' : theme.palette.text.secondary,
      
      '&.Mui-focused': {
        color: theme.palette.primary.main,
      },
      
      '&.MuiInputLabel-shrink': {
        backgroundColor: `${theme.palette.mode === 'dark' ? '#161618' : '#FFFFFF'} !important`,
        color: theme.palette.mode === 'dark' ? '#D1D5DB' : theme.palette.text.secondary,
        padding: '2px 8px !important',
        marginLeft: '-4px !important',
        borderRadius: '4px !important',
        fontFamily: 'inherit !important',
      },
    },
    
    '& .MuiFormHelperText-root': {
      fontSize: designTokens.typography.fontSizes.xs,
      marginLeft: getSpacing('xs'),
      marginTop: getSpacing('xs'),
      
      '&.Mui-error': {
        color: theme.palette.error.main,
      },
    },
    
    // Focus-visible for accessibility
    '&:focus-visible': {
      '& .MuiOutlinedInput-root fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
    },
  };
});

// Main TextField component with enhanced features
export const TextField: React.FC<CustomTextFieldProps> = React.memo(({
  size = 'md',
  rounded = false,
  variant = 'outlined',
  ...props
}) => {
  // Extract custom props to avoid passing them to MUI
  const { size: _, rounded: __, ...muiProps } = { size, rounded, ...props };
  
  return (
    <StyledTextField
      $size={size}
      $rounded={rounded}
      variant={variant}
      {...muiProps}
    />
  );
});

TextField.displayName = 'TextField';

// Predefined TextField variants for common use cases
export const SmallTextField: React.FC<Omit<CustomTextFieldProps, 'size'>> = (props) => (
  <TextField size="sm" {...props} />
);

export const LargeTextField: React.FC<Omit<CustomTextFieldProps, 'size'>> = (props) => (
  <TextField size="lg" {...props} />
);

export const RoundedTextField: React.FC<CustomTextFieldProps> = (props) => (
  <TextField rounded {...props} />
);

export const SearchTextField: React.FC<CustomTextFieldProps> = (props) => (
  <TextField 
    placeholder="Search..." 
    size="sm" 
    rounded 
    {...props} 
  />
);

export const MultilineTextField: React.FC<CustomTextFieldProps> = (props) => (
  <TextField 
    multiline 
    rows={4} 
    {...props} 
  />
);

export default TextField;