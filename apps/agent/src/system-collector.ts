import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import si from "systeminformation";
import type { ProcessInfo } from "@server-monitor/shared";

const execAsync = promisify(exec);

const PS_RE = /^\s*(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/;
const IS_MACOS = os.platform() === "darwin";

interface PsEntry {
  pid: number;
  name: string;
  cpu: number;
  rssKb: number;
}

function parsePsOutput(stdout: string): PsEntry[] {
  const lines = stdout.trim().split("\n");
  const entries: PsEntry[] = [];
  for (const line of lines) {
    const match = line.match(PS_RE);
    if (!match) continue;
    const pid = parseInt(match[1], 10);
    const cpu = parseFloat(match[2]) || 0;
    const rssKb = parseInt(match[3], 10) || 0;
    const path = match[4].trim();
    const name = path.split("/").pop() || "unknown";
    entries.push({ pid, name, cpu, rssKb });
  }
  return entries;
}

/**
 * On macOS: `ps %cpu` gives real-time per-process CPU. ✓
 * On Linux: `ps %cpu` is cumulative (lifetime average). ✗
 *
 * We use systeminformation on Linux to get real-time per-process CPU from /proc.
 */
async function resolveCpuEntries(
  entries: PsEntry[],
): Promise<PsEntry[]> {
  if (IS_MACOS) return entries; // ps %cpu is already real-time

  try {
    const procs = await si.processes();
    const list = Array.isArray(procs.list) ? procs.list : [];
    const cpuByPid = new Map<number, number>();
    for (const p of list) {
      cpuByPid.set(p.pid, p.cpu || 0);
    }
    return entries.map((e) => ({
      ...e,
      cpu: cpuByPid.has(e.pid) ? cpuByPid.get(e.pid)! : e.cpu,
    }));
  } catch {
    return entries; // fall back to ps cumulative if si fails
  }
}

export async function collectSystemProcesses(
  memTotal: number,
  cpuCores: number,
): Promise<{ list: ProcessInfo[]; total: number }> {
  try {
    const { stdout } = await execAsync("ps -eo pid,%cpu,rss,comm", {
      timeout: 5000,
      encoding: "utf-8",
    });
    const entries = await resolveCpuEntries(parsePsOutput(stdout));

    const topCpu = [...entries]
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10)
      .map((e) => toProcessInfo(e, "cpu", memTotal, cpuCores));

    const topMem = [...entries]
      .sort((a, b) => b.rssKb - a.rssKb)
      .slice(0, 10)
      .map((e) => toProcessInfo(e, "memory", memTotal, cpuCores));

    // Deduplicate by pid — cpu sort takes priority
    const seen = new Set<number>();
    const result: ProcessInfo[] = [];
    for (const p of [...topCpu, ...topMem]) {
      if (p.pid !== undefined && !seen.has(p.pid)) {
        seen.add(p.pid);
        result.push(p);
      }
    }
    return { list: result, total: entries.length };
  } catch {
    return { list: [], total: 0 };
  }
}

function toProcessInfo(
  e: PsEntry,
  sortBy: "cpu" | "memory",
  memTotal: number,
  cpuCores: number,
): ProcessInfo {
  const memoryBytes = e.rssKb * 1024;
  return {
    id: `sys-${e.pid}-${sortBy}`,
    name: e.name,
    status: "online" as const,
    cpu: Math.round((e.cpu / cpuCores) * 10) / 10,
    memory: Math.round((memoryBytes / memTotal) * 100 * 10) / 10,
    memoryBytes,
    uptime: 0,
    restarts: 0,
    pid: e.pid,
    source: "system" as const,
    sortBy,
  };
}
