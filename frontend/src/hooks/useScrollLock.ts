import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to prevent body scroll when components are open (modals, dialogs, etc.)
 * Prevents scroll behind the component and maintains scroll position
 */
export const useScrollLock = (isActive: boolean = false) => {
  const scrollPosition = useRef<number>(0);
  const isLocked = useRef<boolean>(false);

  // Temporarily disable scroll lock to restore normal functionality
  const ENABLE_SCROLL_LOCK = false; // TODO: Re-enable after debugging

  const lockScroll = useCallback(() => {
    if (isLocked.current) return;

    // Store current scroll position
    scrollPosition.current = window.pageYOffset || document.documentElement.scrollTop;
    
    const body = document.body;
    const html = document.documentElement;
    
    // Set CSS custom property for scroll position
    document.documentElement.style.setProperty('--scroll-lock-top', `-${scrollPosition.current}px`);
    
    // Add scroll lock class
    body.classList.add('scroll-locked');
    html.classList.add('scroll-locked');
    
    // Get current theme background color
    const backgroundColorDefault = getComputedStyle(document.documentElement)
      .getPropertyValue('--mui-palette-background-default').trim() || '#0A0A0B';
    
    // Super aggressive scroll prevention with background coverage
    body.style.cssText = `
      position: fixed !important;
      top: -${scrollPosition.current}px !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      height: 100vh !important;
      overflow: hidden !important;
      touch-action: none !important;
      overscroll-behavior: none !important;
      -webkit-overflow-scrolling: auto !important;
      -ms-overflow-style: none !important;
      scrollbar-width: none !important;
      background-color: ${backgroundColorDefault} !important;
      background-attachment: fixed !important;
    `;
    
    html.style.cssText = `
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
      touch-action: none !important;
      overscroll-behavior: none !important;
      background-color: ${backgroundColorDefault} !important;
      background-attachment: fixed !important;
    `;
    
    // Prevent ALL scroll-related events
    const preventAllScroll = (e: Event) => {
      const target = e.target as Element;
      
      // Allow scroll only within modal containers
      if (target && target.closest('.modal-container')) {
        return;
      }
      
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      return false;
    };
    
    const preventKeyScroll = (e: KeyboardEvent) => {
      const scrollKeys = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
      
      if (scrollKeys.includes(e.code)) {
        const target = e.target as Element;
        const isFormElement = target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.getAttribute('contenteditable') ||
          target.closest('.modal-container')
        );
        
        if (!isFormElement) {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          return false;
        }
      }
    };
    
    // Add multiple event listeners for comprehensive coverage
    const events = ['wheel', 'touchmove', 'scroll', 'mousewheel', 'DOMMouseScroll'];
    
    events.forEach(event => {
      document.addEventListener(event, preventAllScroll, { passive: false, capture: true });
      window.addEventListener(event, preventAllScroll, { passive: false, capture: true });
    });
    
    document.addEventListener('keydown', preventKeyScroll, { passive: false, capture: true });
    
    // Prevent scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Force immediate scroll to stored position to prevent bounce
    window.scrollTo(0, scrollPosition.current);
    
    // Store cleanup data
    (body as any)._scrollLockListeners = { 
      preventAllScroll, 
      preventKeyScroll,
      events,
      originalBodyStyle: body.getAttribute('style') || '',
      originalHtmlStyle: html.getAttribute('style') || ''
    };
    
    isLocked.current = true;
  }, []);

  const unlockScroll = useCallback(() => {
    if (!isLocked.current) return;

    const body = document.body;
    const html = document.documentElement;
    
    // Get stored cleanup data
    const listeners = (body as any)._scrollLockListeners;
    
    // Remove scroll lock classes
    body.classList.remove('scroll-locked');
    html.classList.remove('scroll-locked');
    
    // Restore original styles completely
    if (listeners) {
      body.setAttribute('style', listeners.originalBodyStyle);
      html.setAttribute('style', listeners.originalHtmlStyle);
      
      // Remove all event listeners
      if (listeners.events && listeners.preventAllScroll) {
        listeners.events.forEach((event: string) => {
          document.removeEventListener(event, listeners.preventAllScroll, true);
          window.removeEventListener(event, listeners.preventAllScroll, true);
        });
      }
      
      if (listeners.preventKeyScroll) {
        document.removeEventListener('keydown', listeners.preventKeyScroll, true);
      }
    } else {
      // Fallback cleanup
      body.style.cssText = '';
      html.style.cssText = '';
    }
    
    // Remove CSS custom property
    document.documentElement.style.removeProperty('--scroll-lock-top');
    
    // Restore scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
    }
    
    // Clean up stored listeners
    delete (body as any)._scrollLockListeners;
    
    // Restore scroll position with multiple attempts for reliability
    const restoreScroll = () => {
      window.scrollTo(0, scrollPosition.current);
      document.documentElement.scrollTop = scrollPosition.current;
      document.body.scrollTop = scrollPosition.current;
    };
    
    // Immediate restore
    restoreScroll();
    
    // Delayed restore to handle any async issues
    requestAnimationFrame(() => {
      restoreScroll();
      
      // One more time after a short delay
      setTimeout(restoreScroll, 0);
    });
    
    isLocked.current = false;
  }, []);

  // Effect to handle scroll lock based on isActive
  useEffect(() => {
    // Skip if scroll lock is disabled
    if (!ENABLE_SCROLL_LOCK) {
      console.log('Scroll lock is disabled');
      return;
    }
    
    // Add debug logging
    console.log('Scroll lock effect triggered. isActive:', isActive, 'isLocked:', isLocked.current);
    
    if (isActive && !isLocked.current) {
      console.log('Applying scroll lock');
      lockScroll();
    } else if (!isActive && isLocked.current) {
      console.log('Removing scroll lock');
      unlockScroll();
    }

    // Cleanup on unmount
    return () => {
      if (isLocked.current) {
        console.log('Cleanup: removing scroll lock');
        unlockScroll();
      }
    };
  }, [isActive, lockScroll, unlockScroll, ENABLE_SCROLL_LOCK]);

  // Return manual control functions
  return { lockScroll, unlockScroll, isLocked: isLocked.current };
};

/**
 * Hook for preventing scroll on specific elements
 * Useful for preventing scroll bubbling from internal scrollable areas
 */
export const usePreventScroll = () => {
  const preventScroll = useCallback((event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }, []);

  const enableScrollPrevention = useCallback((element: HTMLElement) => {
    element.addEventListener('touchmove', preventScroll, { passive: false });
    element.addEventListener('wheel', preventScroll, { passive: false });
    element.addEventListener('keydown', (e) => {
      // Prevent arrow keys, page up/down, home/end from scrolling
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }, [preventScroll]);

  const disableScrollPrevention = useCallback((element: HTMLElement) => {
    element.removeEventListener('touchmove', preventScroll);
    element.removeEventListener('wheel', preventScroll);
  }, [preventScroll]);

  return { enableScrollPrevention, disableScrollPrevention };
};

/**
 * Hook for managing scroll within modal/dialog containers
 * Allows internal scroll but prevents background scroll
 */
export const useModalScrollLock = (isOpen: boolean) => {
  const modalRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const body = document.body;
    
    // Store original body overflow
    const originalBodyOverflow = body.style.overflow;
    
    // Prevent body scroll
    body.style.overflow = 'hidden';
    
    // Allow modal internal scroll
    modal.style.overflow = 'auto';
    modal.style.maxHeight = '100vh';
    
    // Handle escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // This would typically call a close function passed as prop
        console.log('Escape pressed - close modal');
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Cleanup
    return () => {
      body.style.overflow = originalBodyOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return modalRef;
};

/**
 * Hook for focus trap within components
 * Keeps focus within the component when it's active
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when activated
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

export default {
  useScrollLock,
  usePreventScroll,
  useModalScrollLock,
  useFocusTrap,
};