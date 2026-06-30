import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { selectStats, selectStatsLoading } from "@/features/stats/statsSelectors";
import {
  selectAlerts,
  selectAlertsLoading,
  selectAlertsError,
} from "@/features/alerts/alertsSelectors";
import {
  useListAlertsQuery,
  useAcknowledgeAlertMutation,
  useAcknowledgeAllAlertsMutation,
} from "@/features/alerts/alertsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Severity } from "@/lib/types";

const SEVERITY_META: Record<
  Severity,
  { icon: React.ComponentType<{ className?: string }>; color: string; badge: string; label: string }
> = {
  critical: {
    icon: ShieldAlert,
    color: "text-destructive bg-destructive/10",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning bg-warning/10",
    badge: "bg-warning/15 text-warning border-warning/30",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-primary bg-primary/10",
    badge: "bg-primary/15 text-primary border-primary/30",
    label: "Info",
  },
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AlertsPage() {
  const stats = useAppSelector(selectStats);
  const loading = useAppSelector(selectStatsLoading);
  const apiAlerts = useAppSelector(selectAlerts);
  const apiLoading = useAppSelector(selectAlertsLoading);
  const error = useAppSelector(selectAlertsError);
  const [acknowledgeAlert] = useAcknowledgeAlertMutation();
  const [acknowledgeAll] = useAcknowledgeAllAlertsMutation();

  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const hasApi = import.meta.env.VITE_API_URL !== undefined;
  useListAlertsQuery({}, { skip: !hasApi });
  const sourceAlerts = useMemo(
    () => (hasApi ? apiAlerts : (stats?.alerts ?? [])),
    [hasApi, apiAlerts, stats],
  );
  const isLiveLoading = loading || apiLoading;

  const filtered = useMemo(() => {
    let list =
      severityFilter === "all"
        ? sourceAlerts
        : sourceAlerts.filter((a) => a.severity === severityFilter);
    if (!showAcknowledged) {
      list = list.filter((a) => !a.acknowledged);
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [sourceAlerts, severityFilter, showAcknowledged]);

  const criticalCount = sourceAlerts.filter(
    (a) => a.severity === "critical" && !a.acknowledged,
  ).length;
  const warningCount = sourceAlerts.filter(
    (a) => a.severity === "warning" && !a.acknowledged,
  ).length;
  const unacknowledgedCount = sourceAlerts.filter((a) => !a.acknowledged).length;

  const severityFilters: Array<{ value: Severity | "all"; label: string; color: string }> = [
    { value: "all", label: "All", color: "" },
    { value: "critical", label: "Critical", color: "text-destructive" },
    { value: "warning", label: "Warning", color: "text-warning" },
    { value: "info", label: "Info", color: "text-primary" },
  ];

  if (isLiveLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          {error
            ? `Error: ${error}`
            : unacknowledgedCount > 0
              ? `${unacknowledgedCount} unacknowledged alert${unacknowledgedCount !== 1 ? "s" : ""} requiring attention`
              : "All alerts have been acknowledged"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Unacknowledged Critical</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Unacknowledged Warnings</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 border-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{sourceAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Total Alerts</p>
          </div>
        </Card>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Alert History</h3>
            <Badge variant="secondary" className="text-[10px]">
              {filtered.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
              {severityFilters.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverityFilter(s.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    severityFilter === s.value
                      ? "bg-accent text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn(severityFilter === s.value ? "" : s.color)}>{s.label}</span>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              className={cn(
                "h-8 gap-1.5 text-xs font-medium",
                showAcknowledged ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {showAcknowledged ? "Showing all" : "Unacknowledged only"}
            </Button>

            {hasApi && unacknowledgedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => acknowledgeAll(undefined)}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Ack all
              </Button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-success/50" />
            <p className="text-sm font-medium text-muted-foreground">All clear</p>
            <p className="text-xs text-muted-foreground/70">
              {showAcknowledged ? "No alerts match your filter" : "No unacknowledged alerts"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((alert) => {
              const meta = SEVERITY_META[alert.severity];
              const Icon = meta.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/40",
                    alert.acknowledged && "opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      meta.color,
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {alert.title}
                      </span>
                      <Badge variant="outline" className={cn("shrink-0 text-[10px]", meta.badge)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
                      <span>{formatFullDate(alert.timestamp)}</span>
                      <span>·</span>
                      <span>{formatRelative(alert.timestamp)}</span>
                      <span>·</span>
                      <span className="font-mono">{alert.source}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.acknowledged ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-success/30 bg-success/10 text-[10px] text-success"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Acknowledged
                      </Badge>
                    ) : (
                      <>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-warning/30 bg-warning/10 text-[10px] text-warning"
                        >
                          Pending
                        </Badge>
                        {hasApi && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="h-7 w-7 p-0"
                            title="Acknowledge"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
