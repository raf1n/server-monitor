import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StoreState, ConnectionState } from "./types";
import { createAuthSlice } from "./slices/auth-slice";
import { createServersSlice } from "./slices/servers-slice";
import { createSettingsSlice } from "./slices/settings-slice";
import { createSocketSlice } from "./slices/socket-slice";
import { createAlertsSlice } from "./slices/alerts-slice";
import { createStatsSlice } from "./slices/stats-slice";
import { createApiSlice } from "./slices/api-slice";

export type { ConnectionState } from "./types";

// ────────────────────────────────────────────────────────────
//  Single centralized store — all slices combined
//  Redux DevTools enabled — every state change is inspectable
// ────────────────────────────────────────────────────────────
export const useStore = create<StoreState>()(
  devtools(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createServersSlice(...args),
      ...createSettingsSlice(...args),
      ...createSocketSlice(...args),
      ...createAlertsSlice(...args),
      ...createStatsSlice(...args),
      ...createApiSlice(...args),
    }),
    { name: "ServerMonitor Store" },
  ),
);

// ────────────────────────────────────────────────────────────
//  Atomic selector hooks
// ────────────────────────────────────────────────────────────

// Auth
export const useUser = () => useStore((s) => s.user);
export const useIsAuthenticated = () => useStore((s) => s.isAuthenticated);
export const useAuthLoading = () => useStore((s) => s.authLoading);
export const useLogin = () => useStore((s) => s.login);
export const useLogout = () => useStore((s) => s.logout);

// Servers
export const useServers = () => useStore((s) => s.servers);
export const useSelectedId = () => useStore((s) => s.selectedId);
export const useTimeRange = () => useStore((s) => s.timeRange);
export const useSelectServer = () => useStore((s) => s.selectServer);
export const useSetTimeRange = () => useStore((s) => s.setTimeRange);

// Settings
export const useSettings = () => useStore((s) => s.settings);
export const useUpdateSetting = () => useStore((s) => s.updateSetting);
export const useResetDefaults = () => useStore((s) => s.resetDefaults);
export const useSaveSettings = () => useStore((s) => s.saveSettingsToBackend);

// Socket (single connection)
export const useConnection = () => useStore((s) => s.connection);
export const useReconnect = () => useStore((s) => s.reconnectSocket);
export const useStatsLoading = () =>
  useStore((s) => s.connection === "connecting");

// Alerts
export const useAlerts = () => useStore((s) => s.alerts);
export const useAlertsLoading = () => useStore((s) => s.alertsLoading);
export const useAlertsError = () => useStore((s) => s.alertsError);
export const useUnacknowledgedCount = () =>
  useStore((s) => s.alerts.filter((a) => !a.acknowledged).length);
export const useAcknowledgeAlert = () => useStore((s) => s.acknowledgeAlert);
export const useAcknowledgeAll = () => useStore((s) => s.acknowledgeAllAlerts);

// Stats
export const useStats = () => useStore((s) => s.stats);
export const useChartHistory = () => useStore((s) => s.chartHistory);

export const useInitAuth = () => useStore((s) => s.initAuth);

// App orchestration
export const useInitApp = () => useStore((s) => s.initApp);

// Direct store access for non-reactive code
export const store = useStore.getState;
