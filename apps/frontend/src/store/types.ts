import type { StateCreator } from "zustand";
import type {
  ServerInfo,
  TimeRange,
  ServerStats,
  MetricPoint,
  AlertEvent,
} from "@/lib/types";
import type { Socket } from "socket.io-client";

// ────────────────────────────────────────────────────────
//  Simple types
// ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  role: string;
}

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

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "demo";

// ────────────────────────────────────────────────────────
//  Slice types
// ────────────────────────────────────────────────────────

export type SliceCreator<S> = StateCreator<StoreState, [], [], S>;

export interface AuthSlice {
  user: UserProfile | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface ServersSlice {
  servers: ServerInfo[];
  selectedId: string;
  timeRange: TimeRange;
  initServers: () => Promise<void>;
  selectServer: (id: string) => void;
  setTimeRange: (range: TimeRange) => void;
}

export interface SettingsSlice {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  resetDefaults: () => void;
  saveSettingsToBackend: () => Promise<void>;
  _loadSettings: () => void;
}

/** Single WebSocket connection — handles both stats + alert events */
export interface SocketSlice {
  socket: Socket | null;
  connection: ConnectionState;
  _demoTimer: ReturnType<typeof setInterval> | null;

  /** Connect socket (live) or start demo mode. Called once by initApp(). */
  connectSocket: () => void;
  /** Switch subscribed room without reconnecting */
  switchRoom: (serverId: string) => void;
  /** Full reconnect (disconnect + connect) */
  reconnectSocket: () => void;
}

export interface AlertsSlice {
  alerts: AlertEvent[];
  alertsLoading: boolean;
  alertsError: string | null;
  initAlerts: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
}

export interface StatsSlice {
  stats: ServerStats | null;
  chartHistory: MetricPoint[];
  fetchStatsHistory: () => Promise<void>;
}

export interface ApiSlice {
  initApp: () => Promise<void>;
}

// ────────────────────────────────────────────────────────
//  Combined store type
// ────────────────────────────────────────────────────────
export interface StoreState
  extends AuthSlice,
    ServersSlice,
    SettingsSlice,
    SocketSlice,
    AlertsSlice,
    StatsSlice,
    ApiSlice {}
