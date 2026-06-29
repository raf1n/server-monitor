export type {
  ServerStatus,
  Severity,
  ProcessStatus,
  ServerInfo,
  ProcessInfo,
  DiskMount,
  AlertEvent,
  MetricPoint,
  PortInfo,
  ServerStats,
} from "@server-monitor/shared";

export interface Thresholds {
  cpuCritical: number;
  cpuWarn: number;
  memCritical: number;
  memWarn: number;
  diskCritical: number;
}

export type TimeRange = "5m" | "1h" | "24h";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "5m": "Last 5 minutes",
  "1h": "Last 1 hour",
  "24h": "Last 24 hours",
};

export const TIME_RANGE_POINTS: Record<TimeRange, number> = {
  "5m": 30,
  "1h": 60,
  "24h": 96,
};

export const HISTORY_BUFFER = 5000;

export const TIME_RANGE_SHORT: Record<TimeRange, string> = {
  "5m": "5 min",
  "1h": "1 hr",
  "24h": "24 hrs",
};
