import { exec } from "child_process";
import { promisify } from "util";
import type { ProcessInfo } from "@server-monitor/shared";

const execAsync = promisify(exec);

interface Pm2Proc {
  name?: string;
  pm_id?: number;
  monit?: { cpu?: number; memory?: number };
  pm2_env?: {
    status?: string;
    pm_uptime?: number;
    restart_time?: number;
  };
}

const STATUS_MAP: Record<string, ProcessInfo["status"]> = {
  online: "online",
  stopping: "stopping",
  stopped: "stopped",
  launching: "online",
  errored: "errored",
  "one-launch-status": "stopped",
};

export async function collectPm2Processes(): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync("pm2 jlist", {
      timeout: 5000,
      encoding: "utf-8",
    });
    const list: Pm2Proc[] = JSON.parse(stdout);
    const now = Date.now();
    return list.map((p) => ({
      id: `${p.name || "unknown"}-${p.pm_id || 0}`,
      name: p.name || "unknown",
      status: STATUS_MAP[p.pm2_env?.status || ""] || "online",
      cpu: Math.round((p.monit?.cpu || 0) * 10) / 10,
      memory: Math.round(((p.monit?.memory || 0) / (1024 * 1024)) * 10) / 10,
      memoryBytes: p.monit?.memory || 0,
      uptime: p.pm2_env?.pm_uptime
        ? Math.floor((now - p.pm2_env.pm_uptime) / 1000)
        : 0,
      restarts: p.pm2_env?.restart_time || 0,
    }));
  } catch {
    return [];
  }
}
