/**
 * Design Tokens for ESG Checklist AI
 * Centralized system for consistent spacing, typography, and elevation
 */

export const designTokens = {
  // Spacing Scale (4px base unit)
  spacing: {
    xs: 4,      // 4px
    sm: 8,      // 8px
    md: 16,     // 16px
    lg: 24,     // 24px
    xl: 32,     // 32px
    xxl: 48,    // 48px
    xxxl: 64,   // 64px
  },

  // Border Radius Scale
  borderRadius: {
    none: 0,
    xs: 2,      // 2px
    sm: 4,      // 4px
    md: 8,      // 8px
    lg: 12,     // 12px
    xl: 16,     // 16px
    full: 9999, // Fully rounded
  },

  // Elevation Shadows
  elevation: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // Typography Scale
  typography: {
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Animation Durations
  animation: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Touch Targets (for mobile accessibility)
  touchTarget: {
    minSize: 44, // Minimum 44px for mobile touch targets
    comfortable: 48, // Comfortable touch size
    large: 56, // Large touch targets
  },

  // Z-index Scale
  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },

  // Common Component Styles
  components: {
    button: {
      height: {
        sm: 32,
        md: 40,
        lg: 48,
      },
      padding: {
        sm: { x: 12, y: 6 },
        md: { x: 16, y: 8 },
        lg: { x: 24, y: 12 },
      },
    },
    input: {
      height: {
        sm: 36,
        md: 44,
        lg: 52,
      },
    },
    card: {
      padding: {
        sm: 16,
        md: 24,
        lg: 32,
      },
    },
    icon: {
      sizes: {
        xs: 12,      // Very small icons (status indicators)
        sm: 16,      // Small icons (inline, buttons)
        md: 20,      // Standard icons (navigation, actions)
        lg: 24,      // Large icons (headers, important actions)
        xl: 32,      // Extra large icons (major sections)
        xxl: 40,     // Hero icons (feature highlights)
        xxxl: 48,    // Massive icons (empty states)
        hero: 64,    // Hero section icons
      },
    },
  },
} as const;

// Helper functions for consistent usage
export const getSpacing = (size: keyof typeof designTokens.spacing) => 
  `${designTokens.spacing[size]}px`;

export const getBorderRadius = (size: keyof typeof designTokens.borderRadius) =>
  size === 'full' ? '50%' : `${designTokens.borderRadius[size]}px`;

export const getElevation = (level: keyof typeof designTokens.elevation) =>
  designTokens.elevation[level];

export const getFontSize = (size: keyof typeof designTokens.typography.fontSizes) =>
  designTokens.typography.fontSizes[size];

export const getFontWeight = (weight: keyof typeof designTokens.typography.fontWeights) =>
  designTokens.typography.fontWeights[weight];

export const getIconSize = (size: keyof typeof designTokens.components.icon.sizes) =>
  designTokens.components.icon.sizes[size];

// Responsive breakpoint helpers
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

export const mediaQuery = {
  up: (breakpoint: keyof typeof breakpoints) => 
    `@media (min-width: ${breakpoints[breakpoint]}px)`,
  down: (breakpoint: keyof typeof breakpoints) => 
    `@media (max-width: ${breakpoints[breakpoint] - 1}px)`,
  between: (min: keyof typeof breakpoints, max: keyof typeof breakpoints) =>
    `@media (min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 1}px)`,
};

export type DesignTokens = typeof designTokens;
export type Spacing = keyof typeof designTokens.spacing;
export type BorderRadius = keyof typeof designTokens.borderRadius;
export type Elevation = keyof typeof designTokens.elevation;
export type FontSize = keyof typeof designTokens.typography.fontSizes;
export type FontWeight = keyof typeof designTokens.typography.fontWeights;
export type IconSize = keyof typeof designTokens.components.icon.sizes;