import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type StatStatus = "good" | "warning" | "critical";

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  data: Array<{ value: number }>;
  dataKey?: string;
  status: StatStatus;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: number;
}

const STATUS_STYLES: Record<StatStatus, { color: string; ring: string; text: string; bg: string }> =
  {
    good: {
      color: "hsl(var(--success))",
      ring: "ring-success/20",
      text: "text-success",
      bg: "bg-success/10",
    },
    warning: {
      color: "hsl(var(--warning))",
      ring: "ring-warning/20",
      text: "text-warning",
      bg: "bg-warning/10",
    },
    critical: {
      color: "hsl(var(--destructive))",
      ring: "ring-destructive/20",
      text: "text-destructive",
      bg: "bg-destructive/10",
    },
  };

function statusFromValue(value: number, thresholds: [number, number]): StatStatus {
  if (value >= thresholds[1]) return "critical";
  if (value >= thresholds[0]) return "warning";
  return "good";
}

export { statusFromValue };

export function StatCard({
  title,
  value,
  unit = "%",
  data,
  dataKey = "value",
  status,
  loading = false,
  icon: Icon,
  delta,
}: StatCardProps) {
  const styles = STATUS_STYLES[status];
  const gradientId = useMemo(() => `spark-${title.replace(/\s+/g, "-").toLowerCase()}`, [title]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="mt-4 h-9 w-28" />
        <Skeleton className="mt-3 h-16 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:ring-1",
        styles.ring,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
          </div>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            styles.bg,
            styles.text,
          )}
        >
          {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
        </div>
      </div>

      {delta !== undefined && (
        <div className="mt-1.5 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              delta >= 0 ? "text-warning" : "text-success",
            )}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs last interval</span>
        </div>
      )}

      <div className="mt-3 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={styles.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={styles.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={styles.color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
