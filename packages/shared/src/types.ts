export type ServerStatus = 'online' | 'offline' | 'degraded';

export type Severity = 'critical' | 'warning' | 'info';

export type ProcessStatus = 'online' | 'stopped' | 'errored' | 'stopping';

export interface ServerInfo {
  id: string;
  name: string;
  host: string;
  region: string;
  status: ServerStatus;
  agentIntervalMs?: number;
  agentVersion?: string;
}

export interface ProcessInfo {
  id: string;
  name: string;
  status: ProcessStatus;
  cpu: number;
  memory: number;
  memoryBytes: number;
  uptime: number;
  restarts: number;
  pid?: number;
  source?: 'pm2' | 'system';
  sortBy?: 'cpu' | 'memory';
}

export interface DiskMount {
  mount: string;
  used: number;
  total: number;
}

export interface AlertEvent {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  timestamp: number;
  source: string;
  acknowledged: boolean;
}

export interface MetricPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
}

export interface ServerStats {
  serverId: string;
  host?: string;
  name?: string;
  version?: string;
  intervalMs?: number;
  timestamp: number;
  cpu: number;
  memory: number;
  memoryUsed: number;
  memoryTotal: number;
  disk: number;
  diskUsed: number;
  diskTotal: number;
  networkIn: number;
  networkOut: number;
  activeProcesses: number;
  loadAvg: [number, number, number];
  uptime: number;
  mounts: DiskMount[];
  processes: ProcessInfo[];
  history: MetricPoint[];
  alerts: AlertEvent[];
}
