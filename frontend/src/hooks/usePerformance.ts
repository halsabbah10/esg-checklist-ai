import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash-es';

/**
 * Performance optimization hooks for React components
 */

// Debounced callback hook
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay, ...deps]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
};

// Throttled callback hook
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T => {
  const throttledCallback = useMemo(
    () => throttle(callback, delay),
    [callback, delay, ...deps]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback as T;
};

// Memoized stable reference hook
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  
  // Update ref on each render to capture latest closure
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable reference
  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
};

// Previous value hook for comparison
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

// Deep comparison memoization
export const useDeepMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }
  
  return ref.current.value;
};

// Deep equality check
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEqual(val, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const setElement = useCallback((element: Element | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }
    
    elementRef.current = element;
    
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      options.root ? () => {} : (entries) => {
        // Handle intersection changes
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Element is visible
          }
        });
      },
      options
    );
    
    observerRef.current = observer;
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [options]);
  
  return { setElement, disconnect };
};

// Resize observer hook
export const useResizeObserver = <T extends Element>() => {
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const callbackRef = useRef<(entry: ResizeObserverEntry) => void>();
  
  const setElement = useCallback((element: T | null) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }
    
    elementRef.current = element;
    
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);
  
  const setCallback = useCallback((callback: (entry: ResizeObserverEntry) => void) => {
    callbackRef.current = callback;
  }, []);
  
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (callbackRef.current && entries[0]) {
        callbackRef.current(entries[0]);
      }
    });
    
    observerRef.current = observer;
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return { setElement, setCallback };
};

// Performance measurement hook
export const usePerformanceTimer = (name: string) => {
  const start = useCallback(() => {
    performance.mark(`${name}-start`);
  }, [name]);
  
  const end = useCallback(() => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
    
    // Clean up
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  }, [name]);
  
  return { start, end };
};

export default {
  useDebouncedCallback,
  useThrottledCallback,
  useStableCallback,
  usePrevious,
  useDeepMemo,
  useIntersectionObserver,
  useResizeObserver,
  usePerformanceTimer,
};