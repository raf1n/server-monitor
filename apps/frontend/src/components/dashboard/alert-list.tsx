
import { useMemo } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertEvent, Severity } from '@/lib/types';

interface AlertListProps {
  alerts: AlertEvent[];
  loading?: boolean;
}

const SEVERITY_META: Record<Severity, { icon: React.ComponentType<{ className?: string }>; color: string; badge: string; label: string }> = {
  critical: {
    icon: ShieldAlert,
    color: 'text-destructive bg-destructive/10',
    badge: 'bg-destructive/15 text-destructive border-destructive/30',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning bg-warning/10',
    badge: 'bg-warning/15 text-warning border-warning/30',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-primary bg-primary/10',
    badge: 'bg-primary/15 text-primary border-primary/30',
    label: 'Info',
  },
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AlertList({ alerts, loading = false }: AlertListProps) {
  const sorted = useMemo(
    () => [...alerts].sort((a, b) => b.timestamp - a.timestamp),
    [alerts]
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Recent Events</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {sorted.length}
        </Badge>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-success/50" />
          <p className="text-sm font-medium text-muted-foreground">All clear</p>
          <p className="text-xs text-muted-foreground/70">No recent alerts to show</p>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <div className="divide-y divide-border">
            {sorted.map((alert) => {
              const meta = SEVERITY_META[alert.severity];
              const Icon = meta.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40"
                >
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', meta.color)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {alert.title}
                      </span>
                      <Badge variant="outline" className={cn('shrink-0 text-[10px]', meta.badge)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                      <span>{formatRelative(alert.timestamp)}</span>
                      <span>·</span>
                      <span className="font-mono">{alert.source}</span>
                    </div>
                  </div>
                  {alert.acknowledged && (
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
