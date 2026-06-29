
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  loading = false,
  action,
}: ChartCardProps) {
  return (
    <div className={cn("flex flex-col rounded-lg border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">
        {loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
