import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { AlertEvent } from '@/lib/types';

const API_BASE = import.meta.env.VITE_SOCKET_URL || '';
const POLL_MS = 5000;

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
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchAlerts = useCallback(async () => {
    if (!API_BASE) {
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
    intervalRef.current = setInterval(fetchAlerts, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchAlerts]);

  const acknowledgeAlert = useCallback(async (id: string) => {
    if (!API_BASE) return;
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
    if (!API_BASE) return;
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
