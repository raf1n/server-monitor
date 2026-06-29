import si from "systeminformation";
import os from "os";
import type {
  ServerStats,
  DiskMount,
  MetricPoint,
  AlertEvent,
  ProcessInfo,
  PortInfo,
} from "@server-monitor/shared";
import { collectPm2Processes } from "./pm2-collector";
import { collectSystemProcesses } from "./system-collector";
import { version as agentVersion } from "../package.json";

// Thresholds
const CPU_CRITICAL = 85;
const CPU_WARN = 70;
const MEM_CRITICAL = 90;
const MEM_WARN = 80;
const DISK_CRITICAL = 90;

// Collection config
const HISTORY_SIZE = 60;
const BYTES_TO_KB = 1024;
const CPU_CORES = os.cpus().length;

const PHYSICAL_FS_TYPES = new Set([
  "ext4",
  "ext3",
  "ext2",
  "xfs",
  "btrfs",
  "zfs",
  "apfs",
  "hfs",
  "hfs+",
  "ntfs",
  "vfat",
  "exfat",
  "fuseblk",
]);

export class Collector {
  private history: MetricPoint[] = [];
  private hostname = os.hostname();
  private activeAlerts = new Set<string>();
  readonly intervalMs: number;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  async collect(serverId: string): Promise<ServerStats> {
    const [cpuLoad, mem, fsSize, netStats, netConns, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.networkConnections(),
      si.time(),
    ]);
    const pm2Processes = await collectPm2Processes();

    const cpuPct = Math.round(cpuLoad.currentLoad * 10) / 10;
    const memPct =
      Math.round(((mem.total - mem.available) / mem.total) * 100 * 10) / 10;

    const physicalDisks = fsSize.filter((d) =>
      PHYSICAL_FS_TYPES.has(d.type.toLowerCase()),
    );
    const totalDisk = physicalDisks.reduce((s, d) => s + d.size, 0);
    const usedDisk = physicalDisks.reduce((s, d) => s + d.used, 0);
    const diskPct =
      totalDisk > 0 ? Math.round((usedDisk / totalDisk) * 100 * 10) / 10 : 0;

    const mounts: DiskMount[] = physicalDisks.map((d) => ({
      mount: d.mount,
      used: d.size > 0 ? Math.round((d.used / d.size) * 100) : 0,
      total: d.size,
    }));

    const netIn = netStats.reduce((s, n) => s + (n.rx_sec || 0), 0);
    const netOut = netStats.reduce((s, n) => s + (n.tx_sec || 0), 0);

    const now = Date.now();

    const point: MetricPoint = {
      timestamp: now,
      cpu: cpuPct,
      memory: memPct,
      disk: diskPct,
      networkIn: Math.round(netIn / BYTES_TO_KB),
      networkOut: Math.round(netOut / BYTES_TO_KB),
    };

    this.history = [...this.history.slice(-(HISTORY_SIZE - 1)), point];

    const [load1, load5, load15] = os.loadavg();

    const { list: systemProcesses, total: totalSystemProcesses } =
      await collectSystemProcesses(mem.total, CPU_CORES);

    const pm2Online = pm2Processes.filter((p) => p.status === "online").length;
    const activeProcesses = totalSystemProcesses + pm2Online;

    const pm2WithSource: ProcessInfo[] = pm2Processes.map((p) => ({
      ...p,
      source: "pm2" as const,
    }));

    const allProcesses = [...systemProcesses, ...pm2WithSource];

    const ports: PortInfo[] = netConns
      .filter((c) => c.state === "LISTEN")
      .map((c) => ({
        localPort: Number(c.localPort) || 0,
        localAddress: c.localAddress || "0.0.0.0",
        protocol: c.protocol || "tcp",
        state: c.state,
        pid: c.pid ?? null,
        process: c.process || "",
      }))
      .filter((p) => p.localPort > 0)
      .sort((a, b) => a.localPort - b.localPort);

    const alerts = this.generateAlerts(
      serverId,
      cpuPct,
      memPct,
      diskPct,
      pm2Processes,
    );

    return {
      serverId,
      intervalMs: this.intervalMs,
      timestamp: now,
      host: this.hostname,
      version: agentVersion,
      name: this.hostname,
      cpu: cpuPct,
      memory: memPct,
      memoryUsed: mem.total - mem.available,
      memoryTotal: mem.total,
      disk: diskPct,
      diskUsed: usedDisk,
      diskTotal: totalDisk,
      networkIn: Math.round(netIn / BYTES_TO_KB),
      networkOut: Math.round(netOut / BYTES_TO_KB),
      activeProcesses,
      loadAvg: [load1, load5, load15] as [number, number, number],
      uptime: Math.floor(time.uptime),
      mounts,
      processes: allProcesses,
      history: this.history,
      ports,
      alerts,
    };
  }

  private generateAlerts(
    serverId: string,
    cpuPct: number,
    memPct: number,
    diskPct: number,
    pm2Processes: ProcessInfo[],
  ): AlertEvent[] {
    const now = Date.now();
    const alerts: AlertEvent[] = [];
    const newActive = new Set<string>();

    if (cpuPct > CPU_CRITICAL) {
      newActive.add("cpu-critical");
      if (!this.activeAlerts.has("cpu-critical")) {
        alerts.push({
          id: `alert-cpu-${now}`,
          title: "High CPU Usage",
          message: `CPU at ${cpuPct}% on ${serverId}`,
          severity: "critical",
          timestamp: now,
          source: "cpu.monitor",
          acknowledged: false,
        });
      }
    } else if (cpuPct > CPU_WARN) {
      newActive.add("cpu-warn");
      if (!this.activeAlerts.has("cpu-warn")) {
        alerts.push({
          id: `alert-cpu-warn-${now}`,
          title: "High CPU Usage",
          message: `CPU at ${cpuPct}% on ${serverId}`,
          severity: "warning",
          timestamp: now,
          source: "cpu.monitor",
          acknowledged: false,
        });
      }
    }

    if (memPct > MEM_CRITICAL) {
      newActive.add("mem-critical");
      if (!this.activeAlerts.has("mem-critical")) {
        alerts.push({
          id: `alert-mem-${now}`,
          title: "Memory Pressure",
          message: `Memory at ${memPct}% on ${serverId}`,
          severity: "critical",
          timestamp: now,
          source: "memory.monitor",
          acknowledged: false,
        });
      }
    } else if (memPct > MEM_WARN) {
      newActive.add("mem-warn");
      if (!this.activeAlerts.has("mem-warn")) {
        alerts.push({
          id: `alert-mem-warn-${now}`,
          title: "Memory Pressure",
          message: `Memory at ${memPct}% on ${serverId}`,
          severity: "warning",
          timestamp: now,
          source: "memory.monitor",
          acknowledged: false,
        });
      }
    }

    if (diskPct > DISK_CRITICAL) {
      newActive.add("disk-critical");
      if (!this.activeAlerts.has("disk-critical")) {
        alerts.push({
          id: `alert-disk-${now}`,
          title: "Disk Almost Full",
          message: `Disk at ${diskPct}% on ${serverId}`,
          severity: "critical",
          timestamp: now,
          source: "disk.monitor",
          acknowledged: false,
        });
      }
    }

    for (const proc of pm2Processes) {
      if (proc.status === "errored") {
        const key = `proc-errored-${proc.id}`;
        newActive.add(key);
        if (!this.activeAlerts.has(key)) {
          alerts.push({
            id: `alert-proc-${proc.id}-${now}`,
            title: "Process Errored",
            message: `Process '${proc.name}' errored on ${serverId}`,
            severity: "critical",
            timestamp: now,
            source: "pm2.monitor",
            acknowledged: false,
          });
        }
      }
    }

    this.activeAlerts = newActive;
    return alerts;
  }
}
