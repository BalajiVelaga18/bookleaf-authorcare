import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function useSSE(onMessage) {
  const { user } = useAuth();
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!user) return;

    let eventSource = null;
    let retryTimeout = null;

    const connect = () => {
      const url = `${API_BASE_URL}/api/sse/events`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.addEventListener('connected', () => {
        // Connected
      });

      eventSource.addEventListener('ticket:updated', () => {
        callbackRef.current?.();
      });

      eventSource.addEventListener('ticket:created', () => {
        callbackRef.current?.();
      });

      eventSource.onerror = () => {
        eventSource.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [user]);
}
