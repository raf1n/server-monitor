import type { SliceCreator, AppSettings, SettingsSlice } from '../types';
import { api } from '@/lib/api';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

const DEFAULTS: AppSettings = {
  refreshInterval: '2',
  notifications: true,
  soundEnabled: true,
  showSensitiveData: false,
  autoReconnect: true,
  compactMode: false,
  chartAnimations: true,
  criticalThreshold: '85',
};

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  settings: { ...DEFAULTS },

  _loadSettings: () => {
    try {
      const raw = localStorage.getItem('server-monitor-settings');
      if (raw) {
        set({ settings: { ...DEFAULTS, ...JSON.parse(raw) } });
      }
    } catch {}
  },

  updateSetting: (key, value) => {
    set((s) => {
      const next = { ...s.settings, [key]: value };
      localStorage.setItem('server-monitor-settings', JSON.stringify(next));
      return { settings: next };
    });
  },

  resetDefaults: () => {
    set({ settings: { ...DEFAULTS } });
    localStorage.setItem('server-monitor-settings', JSON.stringify(DEFAULTS));
  },

  saveSettingsToBackend: async () => {
    if (!API_HOST) return;
    try {
      const { settings, selectedId } = get();
      const entries = Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [k, String(v)]),
      );
      await api.settings.setAll(entries, selectedId || undefined);
    } catch (err) {
      console.warn('Failed to save settings to backend:', err);
    }
  },
});
