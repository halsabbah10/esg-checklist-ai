import React, { useEffect, useState } from 'react';
import { Box, Fade, Grow } from '@mui/material';

interface PageTransitionProps {
  children: React.ReactNode;
  /** Type of transition animation */
  variant?: 'fade' | 'grow' | 'slide';
  /** Duration of the transition in milliseconds */
  duration?: number;
  /** Delay before transition starts in milliseconds */
  delay?: number;
  /** Whether to trigger the transition */
  in?: boolean;
  /** Callback when transition completes */
  onTransitionEnd?: () => void;
}

/**
 * Smooth page transition wrapper
 * Provides smooth transitions between pages/states
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  variant = 'fade',
  duration = 300,
  delay = 0,
  in: inProp = true,
  onTransitionEnd,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleTransitionEnd = () => {
    if (onTransitionEnd) {
      onTransitionEnd();
    }
  };

  if (variant === 'fade') {
    return (
      <Fade
        in={inProp && mounted}
        timeout={duration}
        onEntered={handleTransitionEnd}
        style={{
          transitionDelay: `${delay}ms`,
        }}
      >
        <Box sx={{ width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Fade>
    );
  }

  if (variant === 'grow') {
    return (
      <Grow
        in={inProp && mounted}
        timeout={duration}
        onEntered={handleTransitionEnd}
        style={{
          transformOrigin: '50% 50%',
          transitionDelay: `${delay}ms`,
        }}
      >
        <Box sx={{ width: '100%', height: '100%' }}>
          {children}
        </Box>
      </Grow>
    );
  }

  // Default to fade for unsupported variants
  return (
    <PageTransition variant="fade" duration={duration} delay={delay} in={inProp}>
      {children}
    </PageTransition>
  );
};

/**
 * Hook for managing page transitions
 */
export const usePageTransition = (initialState = false) => {
  const [isTransitioning, setIsTransitioning] = useState(initialState);
  const [showContent, setShowContent] = useState(!initialState);

  const startTransition = (callback?: () => void) => {
    setIsTransitioning(true);
    setShowContent(false);

    // Wait for fade out
    setTimeout(() => {
      if (callback) {
        callback();
      }
      
      // Start fade in
      setTimeout(() => {
        setShowContent(true);
        setIsTransitioning(false);
      }, 100);
    }, 300);
  };

  return {
    isTransitioning,
    showContent,
    startTransition,
    PageTransitionWrapper: ({ children }: { children: React.ReactNode }) => (
      <PageTransition in={showContent} variant="fade">
        {children}
      </PageTransition>
    ),
  };
};

export default PageTransition;