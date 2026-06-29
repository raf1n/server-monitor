import type { RootState } from "@/store";

export const selectSettings = (state: RootState) => state.settings.settings;
export const selectSetting =
  <K extends keyof AppSettings>(key: K) =>
  (state: RootState) =>
    state.settings.settings[key];

import type { AppSettings } from "./settingsSlice";
