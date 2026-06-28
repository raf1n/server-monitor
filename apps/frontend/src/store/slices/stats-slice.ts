import type { SliceCreator, StatsSlice } from '../types';
import type { MetricPoint } from '@/lib/types';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;
const API_PREFIX = '/api';

export const createStatsSlice: SliceCreator<StatsSlice> = (_set, get) => ({
  stats: null,
  chartHistory: [],

  fetchStatsHistory: async () => {
    if (API_HOST === undefined) return;
    try {
      const { selectedId, timeRange } = get();
      if (!selectedId) return;
      const [metricsRes, latestRes] = await Promise.all([
        fetch(
          `${API_HOST}${API_PREFIX}/servers/${selectedId}/metrics?range=${timeRange}`,
          { credentials: 'include' },
        ),
        fetch(
          `${API_HOST}${API_PREFIX}/servers/${selectedId}/metrics/latest`,
          { credentials: 'include' },
        ),
      ]);

      const data: MetricPoint[] = metricsRes.ok ? await metricsRes.json() : [];
      if (Array.isArray(data) && data.length > 0) {
        _set({ chartHistory: data });
      }

      if (latestRes.ok) {
        const latest = await latestRes.json();
        _set({ stats: latest });
      }
    } catch {}
  },
});
