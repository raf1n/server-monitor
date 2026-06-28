import type { SliceCreator, ServersSlice } from '../types';
import { api } from '@/lib/api';
import { DEMO_SERVERS } from '@/lib/mock-data';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export const createServersSlice: SliceCreator<ServersSlice> = (set, get) => ({
  servers: [],
  selectedId: '',
  timeRange: '5m',

  initServers: async () => {
    if (API_HOST === undefined) {
      set({ servers: DEMO_SERVERS, selectedId: DEMO_SERVERS[0]?.id ?? '' });
      return;
    }
    try {
      const data = await api.servers.list();
      const { selectedId } = get();
      set({
        servers: data,
        selectedId: data.find((s) => s.id === selectedId) ? selectedId : (data[0]?.id ?? selectedId),
      });
    } catch (err) {
      console.warn('Failed to fetch servers:', err);
    }

    window.addEventListener('focus', async () => {
      try {
        const data = await api.servers.list();
        const { selectedId } = get();
        set({
          servers: data,
          selectedId: data.find((s) => s.id === selectedId) ? selectedId : (data[0]?.id ?? selectedId),
        });
      } catch {}
    });
  },

  selectServer: (id: string) => {
    set({ selectedId: id });
    // Switch single socket room + re-fetch data
    get().switchRoom(id);
    get().fetchStatsHistory();
    get().fetchAlerts();
  },

  setTimeRange: (range) => {
    set({ timeRange: range });
    if (API_HOST === undefined) {
      get().connectSocket();
    } else {
      get().fetchStatsHistory();
    }
  },
});
