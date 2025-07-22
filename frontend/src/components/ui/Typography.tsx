import React from 'react';
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps, styled } from '@mui/material';
import { designTokens, getFontSize, getFontWeight } from '../../theme/designTokens';

// Extended typography props with design system variants
export interface TypographyProps extends Omit<MuiTypographyProps, 'variant'> {
  variant?: 
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'body1' | 'body2' | 'caption' | 'overline'
    | 'display1' | 'display2' | 'display3'
    | 'label' | 'helper' | 'code';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  align?: 'left' | 'center' | 'right' | 'justify';
  truncate?: boolean;
  gradient?: boolean;
}

// Styled typography with consistent design tokens
const StyledTypography = styled(MuiTypography, {
  shouldForwardProp: (prop) => 
    !['size', 'weight', 'truncate', 'gradient'].includes(prop as string),
})<TypographyProps>(({ theme, size, weight, truncate = false, gradient = false }) => ({
  // Apply custom size if provided
  ...(size && {
    fontSize: getFontSize(size),
  }),
  
  // Apply custom weight if provided
  ...(weight && {
    fontWeight: getFontWeight(weight),
  }),
  
  // Truncate text with ellipsis
  ...(truncate && {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  
  // Gradient text effect
  ...(gradient && {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }),
  
  // Ensure proper line height for readability
  lineHeight: designTokens.typography.lineHeights.normal,
}));

// Main Typography component
export const Typography: React.FC<TypographyProps> = React.memo(({
  variant = 'body1',
  children,
  ...props
}) => {
  // Map custom variants to Material-UI variants
  const getMuiVariant = (variant: string): MuiTypographyProps['variant'] => {
    switch (variant) {
      case 'display1':
      case 'display2':
      case 'display3':
        return 'h1';
      case 'label':
      case 'helper':
        return 'caption';
      case 'code':
        return 'body2';
      default:
        return variant as MuiTypographyProps['variant'];
    }
  };

  return (
    <StyledTypography
      variant={getMuiVariant(variant)}
      {...props}
    >
      {children}
    </StyledTypography>
  );
});

Typography.displayName = 'Typography';

// Predefined typography components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" size="5xl" weight="bold" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" size="4xl" weight="bold" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" size="3xl" weight="semibold" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" size="2xl" weight="semibold" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" size="xl" weight="medium" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" size="lg" weight="medium" {...props} />
);

export const DisplayText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="display1" size="5xl" weight="extrabold" gradient {...props} />
);

export const BodyText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body1" size="base" weight="normal" {...props} />
);

export const SmallText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body2" size="sm" weight="normal" {...props} />
);

export const CaptionText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" size="xs" weight="normal" {...props} />
);

export const LabelText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" size="sm" weight="medium" {...props} />
);

export const HelperText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="helper" size="xs" weight="normal" color="text.secondary" {...props} />
);

export const CodeText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography 
    variant="code" 
    size="sm" 
    weight="normal"
    sx={{
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      backgroundColor: 'action.hover',
      padding: '2px 4px',
      borderRadius: '4px',
    }}
    {...props} 
  />
);

export default Typography;