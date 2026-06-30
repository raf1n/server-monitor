import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AppSettings {
  notifications: boolean;
  soundEnabled: boolean;
  showSensitiveData: boolean;
  autoReconnect: boolean;
  compactMode: boolean;
  chartAnimations: boolean;
  cpuCriticalThreshold: string;
  cpuWarnThreshold: string;
  memCriticalThreshold: string;
  memWarnThreshold: string;
  diskCriticalThreshold: string;
  notificationEmail: string;
  notificationWebhook: string;
  notificationDiscord: string;
  notificationTelegramBotToken: string;
  notificationTelegramChatId: string;
}

export interface SettingsState {
  settings: AppSettings;
}

const DEFAULTS: AppSettings = {
  notifications: true,
  soundEnabled: true,
  showSensitiveData: false,
  autoReconnect: true,
  compactMode: false,
  chartAnimations: true,
  cpuCriticalThreshold: "85",
  cpuWarnThreshold: "70",
  memCriticalThreshold: "90",
  memWarnThreshold: "80",
  diskCriticalThreshold: "90",
  notificationEmail: "",
  notificationWebhook: "",
  notificationDiscord: "",
  notificationTelegramBotToken: "",
  notificationTelegramChatId: "",
};

const BACKEND_KEY_MAP: Record<string, keyof AppSettings> = {
  "threshold.cpu.critical": "cpuCriticalThreshold",
  "threshold.cpu.warn": "cpuWarnThreshold",
  "threshold.mem.critical": "memCriticalThreshold",
  "threshold.mem.warn": "memWarnThreshold",
  "threshold.disk.critical": "diskCriticalThreshold",
  "notification.email": "notificationEmail",
  "notification.webhook": "notificationWebhook",
  "notification.discord": "notificationDiscord",
  "notification.telegram.bot_token": "notificationTelegramBotToken",
  "notification.telegram.chat_id": "notificationTelegramChatId",
};

function coerceValue(key: keyof AppSettings, value: string): AppSettings[keyof AppSettings] {
  const defaultVal = DEFAULTS[key];
  if (typeof defaultVal === "boolean") {
    return (value === "true") as AppSettings[keyof AppSettings];
  }
  return value as AppSettings[keyof AppSettings];
}

const initialState: SettingsState = {
  settings: { ...DEFAULTS },
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    updateSetting<K extends keyof AppSettings>(
      state: SettingsState,
      action: PayloadAction<{ key: K; value: AppSettings[K] }>,
    ) {
      state.settings[action.payload.key] = action.payload.value;
    },
    mergeSettings(state, action: PayloadAction<Record<string, string>>) {
      for (const [backendKey, value] of Object.entries(action.payload)) {
        const frontendKey = BACKEND_KEY_MAP[backendKey] ?? backendKey;
        if (frontendKey in DEFAULTS) {
          (state.settings as Record<string, unknown>)[frontendKey] = coerceValue(
            frontendKey as keyof AppSettings,
            value,
          );
        }
      }
    },
    resetDefaults(state) {
      state.settings = { ...DEFAULTS };
    },
  },
});

export const { updateSetting, mergeSettings, resetDefaults } = settingsSlice.actions;
export default settingsSlice.reducer;
