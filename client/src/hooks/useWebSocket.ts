import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  userId: number;
  leagueId?: number;
  teamId?: number;
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    userId,
    leagueId,
    teamId,
    onMessage,
    onConnect,
    onDisconnect,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const isDev = import.meta.env.DEV;

  const connect = useCallback(() => {
    // Prevent connection with invalid userId
    if (!userId || userId === 0) {
      if (isDev) console.log('[WebSocket] Cannot connect: invalid userId');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      if (isDev) console.log('[WebSocket] Already connected or connecting');
      return;
    }

    try {
      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      let url = `${protocol}//${host}/ws?userId=${userId}`;
      
      if (leagueId) url += `&leagueId=${leagueId}`;
      if (teamId) url += `&teamId=${teamId}`;

      if (isDev) console.log('[WebSocket] Connecting to:', url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDev) console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (isDev) console.log('[WebSocket] Received:', message.type);
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('Connection error');
      };

      ws.onclose = () => {
        if (isDev) console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          if (isDev) {
            console.log(
              `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError('Failed to connect');
    }
  }, [userId, leagueId, teamId, onMessage, onConnect, onDisconnect, isDev]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, []);

  const joinDraft = useCallback((leagueId: number) => {
    send({ type: 'join_draft', leagueId });
  }, [send]);

  const leaveDraft = useCallback(() => {
    send({ type: 'leave_draft' });
  }, [send]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Only disconnect if we're actually leaving the component
      disconnect();
    };
  }, [autoConnect]); // Remove connect and disconnect from dependencies to prevent re-runs

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    send,
    joinDraft,
    leaveDraft,
  };
}
