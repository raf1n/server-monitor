import { GlobeLock, Loader2, Radio, ShieldHalf, Waypoints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store";
import { selectSelectedId } from "@/features/servers/serversSelectors";
import { selectSettings } from "@/features/settings/settingsSelectors";
import { selectStats, selectStatsLoading } from "@/features/stats/statsSelectors";
import { PortsTable } from "@/components/dashboard/ports-table";

export function PortsPage() {
  const stats = useAppSelector(selectStats);
  const loading = useAppSelector(selectStatsLoading);
  const serverId = useAppSelector(selectSelectedId);
  const settings = useAppSelector(selectSettings);
  const compactMode = settings.compactMode;

  const ports = stats?.ports ?? [];

  const totalCount = ports.length;
  const privilegedCount = ports.filter((p) => p.localPort < 1024).length;
  const registeredCount = ports.filter((p) => p.localPort >= 1024 && p.localPort < 49152).length;
  const dynamicCount = ports.filter((p) => p.localPort >= 49152).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!serverId && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/40" />
        <h2 className="text-base font-semibold text-foreground">Waiting for an agent to connect</h2>
        <p className="text-sm text-muted-foreground">
          Start the backend and run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pnpm dev:agent</code>{" "}
          to see listening ports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Ports</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount} listening port{totalCount !== 1 ? "s" : ""} on the selected server
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Total Listening</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <GlobeLock className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{privilegedCount}</p>
            <p className="text-xs text-muted-foreground">Privileged ({"<"}1024)</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <ShieldHalf className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{registeredCount}</p>
            <p className="text-xs text-muted-foreground">Registered (1024–49151)</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Waypoints className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{dynamicCount}</p>
            <p className="text-xs text-muted-foreground">Dynamic (49152+)</p>
          </div>
        </Card>
      </div>

      {ports.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card py-16 text-center">
          <Waypoints className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No ports found</p>
          <p className="text-xs text-muted-foreground/70">
            No listening ports detected on this server
          </p>
        </div>
      ) : (
        <PortsTable ports={ports} loading={false} compactMode={compactMode} />
      )}
    </div>
  );
}
