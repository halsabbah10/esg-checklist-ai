import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, LinearProgress, Fade } from '@mui/material';

type LoadingVariant = 'circular' | 'skeleton' | 'linear' | 'dots' | 'pulse';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullScreen?: boolean;
  variant?: LoadingVariant;
  width?: number | string;
  height?: number | string;
  count?: number; // For skeleton variant
  color?: 'primary' | 'secondary' | 'inherit';
}

// Dots animation component
const DotsAnimation: React.FC<{ color?: string }> = ({ color = 'primary.main' }) => (
  <Box display="flex" gap={0.5} alignItems="center">
    {[0, 1, 2].map(index => (
      <Box
        key={index}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          animation: 'dotPulse 1.4s infinite ease-in-out',
          animationDelay: `${index * 0.16}s`,
          '@keyframes dotPulse': {
            '0%, 80%, 100%': {
              transform: 'scale(0)',
            },
            '40%': {
              transform: 'scale(1)',
            },
          },
        }}
      />
    ))}
  </Box>
);

// Pulse animation component
const PulseAnimation: React.FC<{ size?: number; color?: string }> = ({
  size = 40,
  color = 'primary.main',
}) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: color,
      animation: 'pulse 2s infinite',
      '@keyframes pulse': {
        '0%': {
          transform: 'scale(0)',
          opacity: 1,
        },
        '100%': {
          transform: 'scale(1)',
          opacity: 0,
        },
      },
    }}
  />
);

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(
  ({
    size = 40,
    message = 'Loading...',
    fullScreen = false,
    variant = 'circular',
    width = '100%',
    height = 20,
    count = 3,
    color = 'primary',
  }) => {
    const containerProps = fullScreen
      ? {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(2px)',
          zIndex: 9999,
        }
      : {
          py: variant === 'skeleton' ? 1 : 4,
        };

    const renderLoader = () => {
      switch (variant) {
        case 'skeleton':
          return (
            <Box sx={{ width: width, maxWidth: 600 }}>
              {Array.from({ length: count }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rounded"
                  height={height}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    '&::after': {
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                    },
                  }}
                />
              ))}
              {message && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: 'block' }}
                >
                  {message}
                </Typography>
              )}
            </Box>
          );

        case 'linear':
          return (
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <LinearProgress
                color={color}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                  },
                }}
              />
              {message && (
                <Typography
                  variant="body2"
                  sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
                >
                  {message}
                </Typography>
              )}
            </Box>
          );

        case 'dots':
          return (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <DotsAnimation color={`${color}.main`} />
              {message && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {message}
                </Typography>
              )}
            </Box>
          );

        case 'pulse':
          return (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <PulseAnimation size={size} color={`${color}.main`} />
              {message && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {message}
                </Typography>
              )}
            </Box>
          );

        case 'circular':
        default:
          return (
            <>
              <CircularProgress
                size={size}
                color={color}
                thickness={4}
                sx={{
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              {message && (
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  {message}
                </Typography>
              )}
            </>
          );
      }
    };

    if (variant === 'skeleton') {
      return <Box sx={{ ...containerProps }}>{renderLoader()}</Box>;
    }

    return (
      <Fade in timeout={300}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          {...containerProps}
        >
          {renderLoader()}
        </Box>
      </Fade>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

// Export individual variants for convenience
export const SkeletonLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = props => (
  <LoadingSpinner {...props} variant="skeleton" />
);

export const LinearLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = props => (
  <LoadingSpinner {...props} variant="linear" />
);

export const DotsLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = props => (
  <LoadingSpinner {...props} variant="dots" />
);

export const PulseLoader: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = props => (
  <LoadingSpinner {...props} variant="pulse" />
);

export default LoadingSpinner;
