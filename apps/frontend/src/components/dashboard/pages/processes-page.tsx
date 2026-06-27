import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cpu,
  Loader2,
  Search,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { ProcessInfo, ServerStats } from "@/lib/types";

interface ProcessesPageProps {
  stats: ServerStats | null;
  loading: boolean;
  serverId: string;
  compactMode?: boolean;
}

type SortKey = "name" | "status" | "cpu" | "memory" | "uptime" | "restarts";
type SortDir = "asc" | "desc";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  online: {
    label: "online",
    className: "bg-success/15 text-success border-success/30",
  },
  stopped: { label: "stopped", className: "bg-muted text-muted-foreground" },
  errored: {
    label: "errored",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  stopping: { label: "stopping", className: "text-warning border-warning/30" },
};

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  pm2: {
    label: "PM2",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  system: {
    label: "System",
    className: "bg-secondary text-secondary-foreground border-border",
  },
};

function formatUptime(seconds: number): string {
  if (seconds === 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatMemory(bytes: number): string {
  if (bytes === 0) return "-";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function cpuColor(cpu: number): string {
  if (cpu >= 70) return "text-destructive";
  if (cpu >= 40) return "text-warning";
  return "text-foreground";
}

export function ProcessesPage({
  stats,
  loading,
  serverId,
  compactMode = false,
}: ProcessesPageProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewFilter, setViewFilter] = useState<"cpu" | "memory" | "pm2">("cpu");
  const [apiProcesses, setApiProcesses] = useState<ProcessInfo[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_API_URL === undefined || !serverId) {
      setApiProcesses([]);
      return;
    }

    setApiLoading(true);
    const controller = new AbortController();
    api.processes.list(serverId, controller.signal)
      .then((data) => setApiProcesses(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Failed to fetch processes:', err);
      })
      .finally(() => setApiLoading(false));
    return () => controller.abort();
  }, [serverId]);

  const processes = stats?.processes ?? apiProcesses;

  const systemCount = processes.filter((p) => p.source === "system").length;
  const pm2Count = processes.filter((p) => p.source === "pm2").length;

  const filtered = useMemo(() => {
    const byView = processes.filter((p) => {
      if (viewFilter === "pm2") return p.source === "pm2";
      return p.sortBy === viewFilter;
    });

    const q = search.toLowerCase().trim();
    let list = q
      ? byView.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.status.includes(q) ||
            (p.source || "").includes(q),
        )
      : [...byView];

    if (filterStatus !== "all") {
      list = list.filter((p) => p.status === filterStatus);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "uptime") cmp = a.uptime - b.uptime;
      else if (sortKey === "restarts") cmp = a.restarts - b.restarts;
      else if (sortKey === "cpu") cmp = a.cpu - b.cpu;
      else cmp = a.memory - b.memory;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [processes, search, sortKey, sortDir, filterStatus, viewFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const onlineCount = processes.filter((p) => p.status === "online").length;
  const erroredCount = processes.filter((p) => p.status === "errored").length;
  const stoppedCount = processes.filter((p) => p.status === "stopped").length;

  const statusFilters = ["all", "online", "stopped", "errored"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!serverId && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/40" />
        <h2 className="text-base font-semibold text-foreground">
          Waiting for an agent to connect
        </h2>
        <p className="text-sm text-muted-foreground">
          Start the backend and run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            pnpm dev:agent
          </code>{" "}
          to see processes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Processes</h1>
        <p className="text-sm text-muted-foreground">
          {systemCount} system + {pm2Count} PM2 processes on the selected server
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Activity className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {onlineCount}
            </p>
            <p className="text-xs text-muted-foreground">Running</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {erroredCount}
            </p>
            <p className="text-xs text-muted-foreground">Errored</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Workflow className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {stoppedCount}
            </p>
            <p className="text-xs text-muted-foreground">Stopped</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {stats?.activeProcesses ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </Card>
      </div>

      <div className={cn('rounded-lg border border-border bg-card shadow-sm', compactMode && 'text-xs')}>
        <div className={cn('flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between', compactMode ? 'px-3 py-2' : 'px-5 py-4')}>
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {viewFilter === "pm2"
                ? "PM2"
                : viewFilter.charAt(0).toUpperCase() + viewFilter.slice(1)}{" "}
              Processes
            </h3>
            <Badge variant="secondary" className="text-[10px]">
              {filtered.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
              {(["cpu", "memory", "pm2"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewFilter(v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewFilter === v
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "pm2"
                    ? "PM2"
                    : v === "cpu"
                      ? "CPU"
                      : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
              {statusFilters.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filterStatus === s
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter processes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter processes"
                className="h-9 w-full border-border bg-secondary/50 pl-9 text-sm sm:w-52"
              />
            </div>
          </div>
        </div>

        {apiLoading && filtered.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Loading processes...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Workflow className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              No processes found
            </p>
            <p className="text-xs text-muted-foreground/70">
              The agent hasn't reported any processes yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-5">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Name <SortIcon column="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Source
                    </span>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("status")}
                      className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Status <SortIcon column="status" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => toggleSort("cpu")}
                      className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      {viewFilter === "memory" ? "Memory %" : "CPU"}{" "}
                      <SortIcon column="cpu" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => toggleSort("memory")}
                      className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Memory <SortIcon column="memory" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => toggleSort("uptime")}
                      className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Uptime <SortIcon column="uptime" />
                    </button>
                  </TableHead>
                  <TableHead className="pr-5 text-right">
                    <button
                      onClick={() => toggleSort("restarts")}
                      className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    >
                      Restarts <SortIcon column="restarts" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((proc) => {
                  const badge =
                    STATUS_BADGE[proc.status] ?? STATUS_BADGE.online;
                  const sourceBadge =
                    SOURCE_BADGE[proc.source || "system"] ??
                    SOURCE_BADGE.system;
                  return (
                    <TableRow
                      key={proc.id}
                      className="border-border transition-colors hover:bg-accent/50"
                    >
                      <TableCell className={cn('font-mono font-medium text-foreground', compactMode ? 'pl-3 text-xs' : 'pl-5 text-sm')}>
                        {proc.name}
                        {proc.pid ? (
                          <span className={cn('text-muted-foreground', compactMode ? 'ml-1' : 'ml-2')}>
                            ({proc.pid})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px]",
                            sourceBadge.className,
                          )}
                        >
                          {sourceBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("gap-1.5 capitalize", badge.className)}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              proc.status === "online"
                                ? "bg-success"
                                : proc.status === "errored"
                                  ? "bg-destructive"
                                  : "bg-muted-foreground",
                            )}
                          />
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums",
                          compactMode ? "text-xs" : "text-sm",
                          cpuColor(
                            viewFilter === "memory" ? proc.memory : proc.cpu,
                          ),
                        )}
                      >
                        {viewFilter === "memory"
                          ? proc.memory.toFixed(1)
                          : proc.cpu.toFixed(1)}
                        %
                      </TableCell>
                      <TableCell className={cn("text-right font-mono tabular-nums text-foreground", compactMode ? "text-xs" : "text-sm")}>
                        {formatMemory(proc.memoryBytes)}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono tabular-nums text-muted-foreground", compactMode ? "text-xs" : "text-sm")}>
                        {formatUptime(proc.uptime)}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono tabular-nums text-muted-foreground", compactMode ? "pr-3 text-xs" : "pr-5 text-sm")}>
                        {proc.restarts}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
