'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface OrderUpdatePayload {
  type: 'CONNECTED' | 'PING' | 'ORDER_UPDATE';
  orderId?: string;
  status?: string;
  trackingNumber?: string;
  message?: string;
  timestamp: string;
}

interface UseOrderTrackingOptions {
  orderId: string | null;
  onUpdate?: (payload: OrderUpdatePayload) => void;
  enabled?: boolean;
}

export function useOrderTracking({ orderId, onUpdate, enabled = true }: UseOrderTrackingOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<OrderUpdatePayload | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
  const MAX_RECONNECTS = 5;

  const connect = useCallback(() => {
    if (!orderId || !enabled || typeof window === 'undefined') return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/api/v1/realtime/orders/${orderId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectCount(0);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as OrderUpdatePayload;
        if (payload.type === 'PING') return; // Ignore heartbeat pings
        setLastUpdate(payload);
        onUpdate?.(payload);
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect with exponential backoff
      if (reconnectCount < MAX_RECONNECTS) {
        const delay = Math.min(1000 * 2 ** reconnectCount, 30_000);
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectCount((c) => c + 1);
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [orderId, enabled, WS_URL, onUpdate, reconnectCount]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    setIsConnected(false);
  }, []);

  return { isConnected, lastUpdate, disconnect, reconnectCount };
}
