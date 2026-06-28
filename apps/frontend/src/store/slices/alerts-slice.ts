import type { SliceCreator, AlertsSlice } from '../types';
import type { AlertEvent } from '@/lib/types';
import { api } from '@/lib/api';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export const createAlertsSlice: SliceCreator<AlertsSlice> = (set, get) => ({
  alerts: [],
  alertsLoading: true,
  alertsError: null,

  initAlerts: async () => {
    await get().fetchAlerts();
  },

  fetchAlerts: async () => {
    if (API_HOST === undefined) {
      set({ alertsLoading: false });
      return;
    }
    set({ alertsLoading: true, alertsError: null });
    try {
      const { selectedId } = get();
      const data = await api.alerts.list({ serverId: selectedId || undefined, limit: '200' });
      set({
        alerts: data.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          severity: a.severity as AlertEvent['severity'],
          timestamp: new Date(a.timestamp).getTime(),
          source: a.source,
          acknowledged: a.acknowledged,
        })),
        alertsLoading: false,
      });
    } catch (err) {
      set({ alertsError: (err as Error).message, alertsLoading: false });
    }
  },

  acknowledgeAlert: async (id: string) => {
    if (API_HOST === undefined) return;
    try {
      await api.alerts.acknowledge(id);
      set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) }));
    } catch (err) {
      console.warn('Failed to acknowledge alert:', err);
    }
  },

  acknowledgeAllAlerts: async () => {
    if (API_HOST === undefined) return;
    try {
      const { selectedId } = get();
      await api.alerts.acknowledgeAll(selectedId);
      set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, acknowledged: true })) }));
    } catch (err) {
      console.warn('Failed to acknowledge all alerts:', err);
    }
  },
});
