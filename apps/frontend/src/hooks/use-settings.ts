import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'server-monitor-settings';
const API_BASE = import.meta.env.VITE_SOCKET_URL || '';

export interface AppSettings {
  refreshInterval: string;
  notifications: boolean;
  soundEnabled: boolean;
  showSensitiveData: boolean;
  autoReconnect: boolean;
  compactMode: boolean;
  chartAnimations: boolean;
  criticalThreshold: string;
}

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

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULTS };
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface UseSettingsResult {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  saveToBackend: () => Promise<void>;
  resetDefaults: () => void;
}

export function useSettings(serverId?: string): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(loadFromStorage);

  useEffect(() => {
    saveToStorage(settings);
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveToBackend = useCallback(async () => {
    if (!API_BASE) return;
    try {
      for (const [key, value] of Object.entries(settings)) {
        await api.settings.set(key, String(value), serverId);
      }
    } catch {}
  }, [settings, serverId]);

  const resetDefaults = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  return { settings, updateSetting, saveToBackend, resetDefaults };
}
