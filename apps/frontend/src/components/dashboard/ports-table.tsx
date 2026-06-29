import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  Waypoints,
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
import type { PortInfo } from "@/lib/types";

type SortKey = "localPort" | "localAddress" | "protocol" | "process" | "pid";
type SortDir = "asc" | "desc";

interface PortsTableProps {
  ports: PortInfo[];
  loading?: boolean;
  compactMode?: boolean;
}

function portColor(port: number): string {
  if (port < 1024) return "text-destructive";
  if (port < 49152) return "text-warning";
  return "text-foreground";
}

export function PortsTable({
  ports,
  loading = false,
  compactMode = false,
}: PortsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("localPort");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterProtocol, setFilterProtocol] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = [...ports];

    if (filterProtocol !== "all") {
      list = list.filter((p) => p.protocol === filterProtocol);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          String(p.localPort).includes(q) ||
          p.localAddress.toLowerCase().includes(q) ||
          p.process.toLowerCase().includes(q) ||
          p.protocol.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "localPort") cmp = a.localPort - b.localPort;
      else if (sortKey === "pid") cmp = (a.pid ?? -1) - (b.pid ?? -1);
      else if (sortKey === "localAddress")
        cmp = a.localAddress.localeCompare(b.localAddress);
      else if (sortKey === "protocol")
        cmp = a.protocol.localeCompare(b.protocol);
      else cmp = a.process.localeCompare(b.process);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [ports, search, sortKey, sortDir, filterProtocol]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
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

  const protocols = useMemo(() => {
    const set = new Set(ports.map((p) => p.protocol));
    return Array.from(set).sort();
  }, [ports]);

  const privilegedCount = ports.filter((p) => p.localPort < 1024).length;
  const registeredCount = ports.filter(
    (p) => p.localPort >= 1024 && p.localPort < 49152,
  ).length;
  const dynamicCount = ports.filter((p) => p.localPort >= 49152).length;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (ports.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm",
        compactMode && "text-xs",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between",
          compactMode ? "px-3 py-2" : "px-5 py-4",
        )}
      >
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Listening Ports
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {protocols.length > 1 && (
            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
              {["all", ...protocols].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterProtocol(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    filterProtocol === p
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "all" ? "All" : p.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter ports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter ports"
              className="h-9 w-full border-border bg-secondary/50 pl-9 text-sm sm:w-48"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-border px-5 py-3 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">
            Privileged (1–1023):{" "}
            <span className="font-medium text-foreground">
              {privilegedCount}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-warning" />
          <span className="text-xs text-muted-foreground">
            Registered (1024–49151):{" "}
            <span className="font-medium text-foreground">
              {registeredCount}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-foreground/30" />
          <span className="text-xs text-muted-foreground">
            Dynamic (49152+):{" "}
            <span className="font-medium text-foreground">{dynamicCount}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="pl-5">
                <button
                  onClick={() => toggleSort("localPort")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Port <SortIcon column="localPort" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("protocol")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Protocol <SortIcon column="protocol" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("localAddress")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Address <SortIcon column="localAddress" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("process")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Process <SortIcon column="process" />
                </button>
              </TableHead>
              <TableHead className="pr-5 text-right">
                <button
                  onClick={() => toggleSort("pid")}
                  className="flex w-full items-center justify-end gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  PID <SortIcon column="pid" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Waypoints className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium">No ports match your filter</p>
                    <p className="text-xs text-muted-foreground/70">
                      Try adjusting the search or protocol filter
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((port) => (
                <TableRow
                  key={`${port.protocol}-${port.localPort}-${port.localAddress}`}
                  className="border-border transition-colors hover:bg-accent/50"
                >
                  <TableCell
                    className={cn(
                      "font-mono font-medium",
                      compactMode ? "pl-3 text-xs" : "pl-5 text-sm",
                    )}
                  >
                    <span className={portColor(port.localPort)}>
                      {port.localPort}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase"
                    >
                      {port.protocol}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {port.localAddress}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {port.process || (
                      <span className="italic text-muted-foreground/60">
                        unknown
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right font-mono text-xs text-muted-foreground">
                    {port.pid ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
