
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricPoint, DiskMount, TimeRange } from '@/lib/types';

const GRID_COLOR = 'hsl(var(--border))';
const AXIS_COLOR = 'hsl(var(--muted-foreground))';

function formatAxisTime(ts: number, timeRange: TimeRange): string {
  const d = new Date(ts);
  if (timeRange === '24h') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTooltipTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  unit?: string;
}

function ChartTooltip({ active, payload, label, unit = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-foreground">{formatTooltipTime(Number(label))}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value.toFixed(1)}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}

interface TimeSeriesChartProps {
  data: MetricPoint[];
  dataKey: keyof MetricPoint;
  color: string;
  unit?: string;
  height?: number;
  timeRange: TimeRange;
  animate?: boolean;
}

const CHART_LABELS: Partial<Record<string, string>> = {
  cpu: 'CPU',
  memory: 'Memory',
  disk: 'Disk',
};

export function TimeSeriesChart({ data, dataKey, color, unit = '%', height = 220, timeRange, animate = false }: TimeSeriesChartProps) {
  const gradientId = useMemo(
    () => `grad-${dataKey}-${color.replace(/[^a-z0-9]/gi, '')}`,
    [dataKey, color]
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => formatAxisTime(v, timeRange)}
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Area
          type="monotone"
          dataKey={dataKey as string}
          name={CHART_LABELS[dataKey as string] ?? dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={animate}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface NetworkChartProps {
  data: MetricPoint[];
  height?: number;
  timeRange: TimeRange;
  animate?: boolean;
}

export function NetworkChart({ data, height = 220, timeRange, animate = false }: NetworkChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => formatAxisTime(v, timeRange)}
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<ChartTooltip unit=" KB/s" />} />
        <Line
          type="monotone"
          dataKey="networkIn"
          name="Inbound"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
        <Line
          type="monotone"
          dataKey="networkOut"
          name="Outbound"
          stroke="hsl(var(--chart-5))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DiskBarChartProps {
  data: DiskMount[];
  height?: number;
  animate?: boolean;
}

export function DiskBarChart({ data, height = 220, animate = false }: DiskBarChartProps) {
  const chartData = data.map((d) => ({ mount: d.mount, used: d.used }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="mount"
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'hsl(var(--accent) / 0.4)' }} />
        <Bar
          dataKey="used"
          name="Used"
          fill="hsl(var(--chart-3))"
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
