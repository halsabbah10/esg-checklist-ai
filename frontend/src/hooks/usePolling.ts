import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface UsePollingOptions {
  interval: number; // in milliseconds
  maxAttempts?: number;
  condition?: (data: unknown) => boolean; // Function to check if polling should stop
}

interface UsePollingResult<T> {
  data: T | null;
  isPolling: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

export const usePolling = <T = unknown>(
  url: string,
  options: UsePollingOptions
): UsePollingResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  const {
    interval,
    maxAttempts = 50, // default max attempts
    condition = () => false, // default condition never stops polling
  } = options;

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    attemptsRef.current = 0;
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      setData(response.data);
      setError(null);

      // Check if condition is met to stop polling
      if (condition(response.data)) {
        stopPolling();
        return;
      }

      attemptsRef.current += 1;

      // Check if max attempts reached
      if (attemptsRef.current >= maxAttempts) {
        stopPolling();
        setError('Polling timeout: Maximum attempts reached');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Polling failed');
      stopPolling();
    }
  };

  const startPolling = () => {
    if (isPolling) return; // Already polling

    setIsPolling(true);
    setError(null);
    attemptsRef.current = 0;

    // Fetch immediately
    fetchData();

    // Set up interval
    intervalRef.current = setInterval(fetchData, interval);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    data,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
};
