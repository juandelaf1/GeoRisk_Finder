import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { fetchAlerts } from '../api/client';

const POLL_INTERVAL = 30_000;
const WS_URL = `ws://${window.location.host}/ws/alerts`;

export function useAlerts() {
  const setAlerts = useStore((s) => s.setAlerts);
  const addAlert = useStore((s) => s.addAlert);
  const wsRef = useRef<WebSocket | null>(null);
  const pollFailedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchAlerts();
        if (!cancelled) {
          setAlerts(data);
          pollFailedRef.current = false;
        }
      } catch {
        if (!pollFailedRef.current) {
          pollFailedRef.current = true;
        }
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setAlerts]);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {};

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'init' && Array.isArray(msg.alerts)) {
              setAlerts(msg.alerts);
            } else if (msg.type === 'update' && Array.isArray(msg.alerts)) {
              setAlerts(msg.alerts);
            } else if (msg.id) {
              addAlert(msg);
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket not available, polling handles it
      }
    };

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [addAlert]);
}
