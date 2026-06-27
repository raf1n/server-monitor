import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '@/lib/api';
import type { AlertEvent } from '@/lib/types';

const SOCKET_URL: string | undefined = import.meta.env.VITE_SOCKET_URL;
const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

interface UseAlertsResult {
  alerts: AlertEvent[];
  unacknowledgedCount: number;
  loading: boolean;
  error: string | null;
  acknowledgeAlert: (id: string) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  refetch: () => void;
}

export function useAlerts(serverId?: string): UseAlertsResult {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (API_HOST === undefined) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await api.alerts.list({
        serverId,
        limit: '200',
      });
      setAlerts(
        data.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          severity: a.severity as AlertEvent['severity'],
          timestamp: new Date(a.timestamp).getTime(),
          source: a.source,
          acknowledged: a.acknowledged,
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchAlerts();

    if (SOCKET_URL === undefined) return;

    const token = (() => { try { return localStorage.getItem('auth_token'); } catch { return null; } })();
    const socket = io(SOCKET_URL || undefined, { transports: ['websocket'], auth: { token } });

    socket.on('connect', () => {
      if (serverId) socket.emit('subscribe', { serverId });
    });

    socket.on('alert', (alert: AlertEvent & { serverId: string }) => {
      if (serverId && alert.serverId !== serverId) return;
      setAlerts((prev) => [
        {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: typeof alert.timestamp === 'number' ? alert.timestamp : new Date(alert.timestamp).getTime(),
          source: alert.source,
          acknowledged: alert.acknowledged,
        },
        ...prev,
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchAlerts, serverId]);

  const acknowledgeAlert = useCallback(async (id: string) => {
    if (API_HOST === undefined) return;
    try {
      await api.alerts.acknowledge(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const acknowledgeAll = useCallback(async () => {
    if (API_HOST === undefined) return;
    try {
      await api.alerts.acknowledgeAll(serverId);
      setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [serverId]);

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return { alerts, unacknowledgedCount, loading, error, acknowledgeAlert, acknowledgeAll, refetch: fetchAlerts };
}
