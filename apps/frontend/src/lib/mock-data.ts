import type {
  ProcessInfo,
  ServerInfo,
  ServerStats,
  MetricPoint,
  AlertEvent,
  ProcessStatus,
  TimeRange,
} from './types';

import { TIME_RANGE_POINTS } from './types';

export const DEMO_SERVERS: ServerInfo[] = [
  { id: 'srv-prod-01', name: 'prod-web-01', host: '10.0.1.24', region: 'us-east-1', status: 'online', agentIntervalMs: 2000, agentVersion: '0.1.0' },
  { id: 'srv-prod-02', name: 'prod-api-02', host: '10.0.1.25', region: 'us-east-1', status: 'online', agentIntervalMs: 2000, agentVersion: '0.1.0' },
  { id: 'srv-stage-01', name: 'stage-worker-01', host: '10.0.2.10', region: 'us-west-2', status: 'degraded', agentIntervalMs: 2000, agentVersion: '0.1.0' },
  { id: 'srv-db-01', name: 'db-primary-01', host: '10.0.3.5', region: 'us-east-1', status: 'online', agentIntervalMs: 2000, agentVersion: '0.1.0' },
  { id: 'srv-edge-01', name: 'edge-cdn-01', host: '10.0.4.2', region: 'eu-west-1', status: 'offline', agentIntervalMs: 2000, agentVersion: '0.1.0' },
];

const PM2_NAMES = [
  'api-gateway', 'auth-service', 'worker-queue', 'scheduler',
  'webhook-listener', 'metrics-collector', 'notification-dispatch',
  'billing-sync', 'search-indexer', 'cache-warmer',
];

const SYS_NAMES = [
  { name: 'nginx', pid: 1204 }, { name: 'postgres', pid: 892 }, { name: 'redis-server', pid: 1102 },
  { name: 'node', pid: 3156 }, { name: 'python3', pid: 4201 }, { name: 'sshd', pid: 756 },
  { name: 'containerd', pid: 1802 }, { name: 'dockerd', pid: 1899 }, { name: 'prometheus', pid: 2210 },
];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function randomWalk(prev: number, volatility: number, min = 0, max = 100): number {
  const delta = (Math.random() - 0.5) * volatility;
  return clamp(prev + delta, min, max);
}

function pick<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function makeDemoProcesses(cpuSeed: number): ProcessInfo[] {
  const systemCpu: ProcessInfo[] = pick(SYS_NAMES, 4 + Math.floor(Math.random() * 4)).map((p) => {
    const cpu = clamp(Math.random() * 20 + cpuSeed / 2);
    const memMB = Math.floor(Math.random() * 200 + 30);
    return {
      id: `sys-${p.pid}-cpu`,
      name: p.name,
      status: 'online',
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round((memMB / (16 * 1024)) * 100 * 10) / 10,
      memoryBytes: memMB * 1024 * 1024,
      uptime: 0,
      restarts: 0,
      pid: p.pid,
      source: 'system',
      sortBy: 'cpu',
    };
  });

  const systemMem: ProcessInfo[] = pick(SYS_NAMES, 4 + Math.floor(Math.random() * 4)).map((p) => {
    const memMB = Math.floor(Math.random() * 500 + 100);
    const cpu = clamp(Math.random() * 15 + cpuSeed / 3);
    return {
      id: `sys-${p.pid}-mem`,
      name: p.name,
      status: 'online',
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round((memMB / (16 * 1024)) * 100 * 10) / 10,
      memoryBytes: memMB * 1024 * 1024,
      uptime: 0,
      restarts: 0,
      pid: p.pid,
      source: 'system',
      sortBy: 'memory',
    };
  });

  const pm2: ProcessInfo[] = pick(PM2_NAMES, 5 + Math.floor(Math.random() * 4)).map((name, i) => {
    const st: ProcessStatus = Math.random() > 0.92
      ? Math.random() > 0.5 ? 'stopped' : 'errored'
      : 'online';
    const cpu = st === 'online' ? clamp(Math.random() * 30 + cpuSeed / 3) : 0;
    const mb = st === 'online' ? Math.floor(Math.random() * 300 + 80) : 0;
    return {
      id: `${name}-${i}`,
      name,
      status: st,
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round((mb / (16 * 1024)) * 100 * 10) / 10,
      memoryBytes: mb * 1024 * 1024,
      uptime: st === 'online' ? Math.floor(Math.random() * 86400 * 30) : 0,
      restarts: Math.floor(Math.random() * 5),
      source: 'pm2',
    };
  });

  return [...systemCpu, ...systemMem, ...pm2];
}

function makeDemoAlerts(serverName: string): AlertEvent[] {
  const now = Date.now();
  const templates = [
    { title: 'High CPU Usage', message: (s: string) => `CPU usage on ${s} exceeded 85%`, severity: 'warning' as const, source: 'cpu.monitor' },
    { title: 'Memory Pressure', message: (s: string) => `Memory on ${s} at 91%`, severity: 'warning' as const, source: 'memory.monitor' },
    { title: 'Disk Almost Full', message: (s: string) => `Mount /var on ${s} is 92% full`, severity: 'critical' as const, source: 'disk.monitor' },
    { title: 'Process Stopped', message: (s: string) => `Process 'worker-queue' on ${s} stopped`, severity: 'critical' as const, source: 'pm2.manager' },
  ];
  const count = 2 + Math.floor(Math.random() * 3);
  return pick(templates, count).map((t, i) => ({
    id: `alert-${now}-${i}`,
    title: t.title,
    message: t.message(serverName),
    severity: t.severity,
    timestamp: now - Math.floor(Math.random() * 3600 * 1000 * 6),
    source: t.source,
    acknowledged: Math.random() > 0.7,
  }));
}

const RANGE_MS: Record<TimeRange, number> = {
  '5m': 300_000,
  '1h': 3_600_000,
  '24h': 86_400_000,
};

export function generateDemoStats(server: ServerInfo, timeRange: TimeRange = '5m'): ServerStats {
  const now = Date.now();
  const intervalMs = server.agentIntervalMs ?? Math.round(RANGE_MS[timeRange] / TIME_RANGE_POINTS[timeRange]);
  const points = Math.min(Math.floor(RANGE_MS[timeRange] / intervalMs), 96);
  let cpu = 30 + Math.random() * 25;
  let memory = 45 + Math.random() * 20;
  let disk = 55 + Math.random() * 15;
  let netIn = 200 + Math.random() * 300;
  let netOut = 150 + Math.random() * 250;

  const history: MetricPoint[] = Array.from({ length: points }).map((_, i) => {
    cpu = randomWalk(cpu, 8);
    memory = randomWalk(memory, 4);
    disk = randomWalk(disk, 1, 40, 95);
    netIn = randomWalk(netIn, 60, 50, 1200);
    netOut = randomWalk(netOut, 50, 30, 1000);
    return {
      timestamp: now - (points - i) * intervalMs,
      cpu: Math.round(cpu * 10) / 10,
      memory: Math.round(memory * 10) / 10,
      disk: Math.round(disk * 10) / 10,
      networkIn: Math.round(netIn),
      networkOut: Math.round(netOut),
    };
  });

  const latest = history[history.length - 1];
  const memoryTotal = 16 * 1024 * 1024 * 1024;
  const diskTotal = 500 * 1024 * 1024 * 1024;
  const processes = makeDemoProcesses(cpu);

  return {
    serverId: server.id,
    intervalMs,
    version: server.agentVersion,
    timestamp: now,
    host: server.host,
    name: server.name,
    cpu: latest.cpu,
    memory: latest.memory,
    memoryUsed: Math.round((latest.memory / 100) * memoryTotal),
    memoryTotal,
    disk: latest.disk,
    diskUsed: Math.round((latest.disk / 100) * diskTotal),
    diskTotal,
    networkIn: latest.networkIn,
    networkOut: latest.networkOut,
    activeProcesses: processes.filter((p) => p.status === 'online').length,
    loadAvg: [cpu / 4, cpu / 6, cpu / 8] as [number, number, number],
    uptime: Math.floor(Math.random() * 86400 * 45),
    mounts: [
      { mount: '/', used: 62, total: 100 },
      { mount: '/var', used: 78, total: 100 },
      { mount: '/tmp', used: 23, total: 100 },
      { mount: '/home', used: 45, total: 100 },
    ],
    processes,
    history,
    alerts: makeDemoAlerts(server.name),
  };
}

export function nextDemoTick(prev: ServerStats): ServerStats {
  const now = Date.now();
  const cpu = randomWalk(prev.cpu, 6);
  const memory = randomWalk(prev.memory, 3);
  const disk = randomWalk(prev.disk, 0.8, 40, 95);
  const netIn = randomWalk(prev.networkIn, 60, 50, 1200);
  const netOut = randomWalk(prev.networkOut, 50, 30, 1000);

  const point: MetricPoint = {
    timestamp: now,
    cpu: Math.round(cpu * 10) / 10,
    memory: Math.round(memory * 10) / 10,
    disk: Math.round(disk * 10) / 10,
    networkIn: Math.round(netIn),
    networkOut: Math.round(netOut),
  };

  const history = [...prev.history.slice(-59), point];

  const processes: ProcessInfo[] = prev.processes.map((p) => {
    if (p.status !== 'online') return p;
    return {
      ...p,
      cpu: clamp(randomWalk(p.cpu, 4, 0, 60), 0, 100),
      uptime: p.source === 'pm2' ? p.uptime + 2 : p.uptime,
    };
  });

  return {
    ...prev,
    timestamp: now,
    cpu: point.cpu,
    memory: point.memory,
    memoryUsed: Math.round((point.memory / 100) * prev.memoryTotal),
    disk: point.disk,
    diskUsed: Math.round((point.disk / 100) * prev.diskTotal),
    networkIn: point.networkIn,
    networkOut: point.networkOut,
    activeProcesses: processes.filter((p) => p.status === 'online').length,
    loadAvg: [cpu / 4, cpu / 6, cpu / 8] as [number, number, number],
    history,
    processes,
    alerts: prev.alerts,
  };
}
