import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Search,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import type { ProcessInfo } from "@/lib/types";

type SortKey = "name" | "source" | "status" | "cpu" | "memory" | "uptime";
type SortDir = "asc" | "desc";

interface ProcessTableProps {
  processes: ProcessInfo[];
  loading?: boolean;
  hasServer?: boolean;
  compactMode?: boolean;
}

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  online: {
    label: "online",
    variant: "default",
    className:
      "bg-success/15 text-success border-success/30 hover:bg-success/20",
  },
  stopped: {
    label: "stopped",
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
  },
  errored: { label: "errored", variant: "destructive", className: "" },
  stopping: {
    label: "stopping",
    variant: "outline",
    className: "text-warning border-warning/30",
  },
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

export function ProcessTable({
  processes,
  loading = false,
  hasServer = true,
  compactMode = false,
}: ProcessTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewFilter, setViewFilter] = useState<"cpu" | "memory" | "pm2">("cpu");

  const filtered = useMemo(() => {
    const byView = processes.filter((p) => {
      if (viewFilter === "pm2") return p.source === "pm2";
      return p.sortBy === viewFilter;
    });

    const q = search.toLowerCase().trim();
    const list = q
      ? byView.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.status.includes(q) ||
            (p.source || "").includes(q),
        )
      : [...byView];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "source")
        cmp = (a.source || "").localeCompare(b.source || "");
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "uptime") cmp = a.uptime - b.uptime;
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [processes, search, sortKey, sortDir, viewFilter]);

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

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card shadow-sm', compactMode && 'text-xs')}>
      <div className={cn('flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between', compactMode ? 'px-3 py-2' : 'px-5 py-4')}>
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Processes</h3>
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter processes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full border-border bg-secondary/50 pl-9 text-sm sm:w-56"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 && !hasServer ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            Waiting for agent data
          </p>
          <p className="text-xs text-muted-foreground/70">
            Run an agent to see processes
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Workflow className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No processes found
          </p>
          <p className="text-xs text-muted-foreground/70">
            Try adjusting your search filter
          </p>
        </div>
      ) : (
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
                <button
                  onClick={() => toggleSort("source")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Source <SortIcon column="source" />
                </button>
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
              <TableHead className="pr-5 text-right">
                <button
                  onClick={() => toggleSort("uptime")}
                  className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Uptime <SortIcon column="uptime" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((proc) => {
              const badge = STATUS_BADGE[proc.status] ?? STATUS_BADGE.online;
              const sourceBadge =
                SOURCE_BADGE[proc.source || "system"] ?? SOURCE_BADGE.system;
              return (
                <TableRow
                  key={proc.id}
                  className="border-border transition-colors hover:bg-accent/50"
                >
                  <TableCell className={cn('font-mono font-medium text-foreground', compactMode ? 'pl-3 text-xs' : 'pl-5 text-sm')}>
                    {proc.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("gap-1 text-[10px]", sourceBadge.className)}
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
                      'text-right font-mono tabular-nums',
                      compactMode ? 'text-xs' : 'text-sm',
                      cpuColor(
                        viewFilter === 'memory' ? proc.memory : proc.cpu,
                      ),
                    )}
                  >
                    {viewFilter === 'memory'
                      ? proc.memory.toFixed(1)
                      : proc.cpu.toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className={cn('text-right font-mono tabular-nums text-foreground', compactMode ? 'text-xs' : 'text-sm')}>
                    {formatMemory(proc.memoryBytes)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono tabular-nums text-muted-foreground', compactMode ? 'pr-3 text-xs' : 'pr-5 text-sm')}>
                    {formatUptime(proc.uptime)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
