import { useEffect, useRef, useState } from 'react';
import { realtimeAnalyticsAPI } from '../services/api';

interface UseWebSocketOptions {
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (channel: string, options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    try {
      const wsUrl = realtimeAnalyticsAPI.getWebSocketUrl(channel);
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = event => {
        console.log(`✅ WebSocket connected to channel: ${channel}`);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📨 WebSocket message received:`, data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = event => {
        console.error(`❌ WebSocket error on channel ${channel}:`, event);
        setError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = event => {
        console.log(`🔌 WebSocket closed for channel ${channel}:`, event.code, event.reason);
        setIsConnected(false);
        websocketRef.current = null;
        onClose?.(event);

        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Manual disconnect');
      websocketRef.current = null;
    }
    setIsConnected(false);
  };

  const send = (data: unknown) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket is not connected, cannot send data');
    return false;
  };

  useEffect(() => {
    connect();
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]); // connect is defined inside useEffect scope, so it's not needed as a dependency

  return {
    isConnected,
    error,
    send,
    disconnect,
    reconnect: connect,
  };
};

export default useWebSocket;
