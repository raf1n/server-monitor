import { useMemo } from "react";
import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useAppSelector } from "@/store";
import { useGetServersQuery } from "@/features/servers/serversApi";
import { useGetStatsHistoryQuery, useGetLatestStatsQuery } from "@/features/stats/statsApi";
import { useGetThresholdsQuery } from "@/features/alerts/alertsApi";
import {
  selectSelectedId,
  selectTimeRange,
  selectServers,
} from "@/features/servers/serversSelectors";
import { selectSettings } from "@/features/settings/settingsSelectors";
import {
  selectStats,
  selectChartHistory,
  selectStatsLoading,
} from "@/features/stats/statsSelectors";
import { selectAlerts } from "@/features/alerts/alertsSelectors";
import { AlertList } from "@/components/dashboard/alert-list";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DiskBarChart, NetworkChart, TimeSeriesChart } from "@/components/dashboard/charts";
import { ProcessTable } from "@/components/dashboard/process-table";
import { PortsTable } from "@/components/dashboard/ports-table";
import { StatCard, statusFromValue } from "@/components/dashboard/stat-card";
import { TIME_RANGE_POINTS } from "@/lib/types";

export function DashboardHome() {
  const stats = useAppSelector(selectStats);
  const loading = useAppSelector(selectStatsLoading);
  const chartHistory = useAppSelector(selectChartHistory);
  const serverId = useAppSelector(selectSelectedId);
  const timeRange = useAppSelector(selectTimeRange);
  const settings = useAppSelector(selectSettings);
  const servers = useAppSelector(selectServers);
  const apiAlerts = useAppSelector(selectAlerts);

  const { data: apiServers = [] } = useGetServersQuery(undefined, {
    skip: !import.meta.env.VITE_API_URL,
  });
  const allServers = servers.length > 0 ? servers : apiServers;

  const isLive = !!import.meta.env.VITE_API_URL;
  useGetStatsHistoryQuery(
    { serverId: serverId!, range: timeRange },
    { skip: !isLive || !serverId },
  );
  useGetLatestStatsQuery({ serverId: serverId! }, { skip: !isLive || !serverId });

  const { data: thresholds } = useGetThresholdsQuery(undefined, {
    skip: !isLive,
  });

  const history = useMemo(() => {
    const now = Date.now();
    const rangeMs = timeRange === "5m" ? 300_000 : timeRange === "1h" ? 3_600_000 : 86_400_000;
    const server = allServers.find((s) => s.id === serverId);
    let max = TIME_RANGE_POINTS[timeRange];
    if (server?.agentIntervalMs && server.agentIntervalMs > 0) {
      const expected = Math.floor(rangeMs / server.agentIntervalMs);
      max = Math.min(Math.max(expected, 1), 96);
    }
    const inRange = chartHistory.filter((p) => now - p.timestamp <= rangeMs);
    if (inRange.length <= max) return inRange;
    const step = inRange.length / max;
    return Array.from({ length: max }, (_, i) => inRange[Math.floor(i * step)]);
  }, [chartHistory, timeRange, allServers, serverId]);

  const cpuData = useMemo(() => history.map((p) => ({ value: p.cpu })), [history]);
  const memData = useMemo(() => history.map((p) => ({ value: p.memory })), [history]);
  const diskData = useMemo(() => history.map((p) => ({ value: p.disk })), [history]);
  const procData = useMemo(
    () => history.map(() => ({ value: stats?.activeProcesses ?? 0 })),
    [history, stats],
  );

  const thresholdConfig = useMemo(() => {
    if (thresholds) {
      return {
        cpu: [thresholds.cpuWarn, thresholds.cpuCritical] as [number, number],
        mem: [thresholds.memWarn, thresholds.memCritical] as [number, number],
        disk: [thresholds.diskCritical, thresholds.diskCritical] as [number, number],
      };
    }
    return {
      cpu: [
        Number(settings.cpuWarnThreshold) || 70,
        Number(settings.cpuCriticalThreshold) || 85,
      ] as [number, number],
      mem: [
        Number(settings.memWarnThreshold) || 80,
        Number(settings.memCriticalThreshold) || 90,
      ] as [number, number],
      disk: [
        Number(settings.diskCriticalThreshold) || 90,
        Number(settings.diskCriticalThreshold) || 90,
      ] as [number, number],
    };
  }, [
    thresholds,
    settings.cpuCriticalThreshold,
    settings.cpuWarnThreshold,
    settings.memCriticalThreshold,
    settings.memWarnThreshold,
    settings.diskCriticalThreshold,
  ]);

  const cpuStatus = stats ? statusFromValue(stats.cpu, thresholdConfig.cpu) : "good";
  const memStatus = stats ? statusFromValue(stats.memory, thresholdConfig.mem) : "good";
  const diskStatus = stats ? statusFromValue(stats.disk, thresholdConfig.disk) : "good";
  const procStatus: "good" | "warning" | "critical" =
    stats && stats.activeProcesses === 0 ? "warning" : "good";

  return (
    <div className={settings.compactMode ? "space-y-3" : "space-y-6"}>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics for{" "}
          <span className="font-medium text-foreground">
            {allServers.find((s) => s.id === serverId)?.name}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="CPU Usage"
          value={stats?.cpu ?? 0}
          data={cpuData}
          status={cpuStatus}
          loading={loading}
          icon={Cpu}
        />
        <StatCard
          title="Memory Usage"
          value={stats?.memory ?? 0}
          data={memData}
          status={memStatus}
          loading={loading}
          icon={MemoryStick}
        />
        <StatCard
          title="Disk Usage"
          value={stats?.disk ?? 0}
          data={diskData}
          status={diskStatus}
          loading={loading}
          icon={HardDrive}
        />
        <StatCard
          title="Active Processes"
          value={stats?.activeProcesses ?? 0}
          unit=""
          data={procData}
          status={procStatus}
          loading={loading}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="CPU Usage Over Time"
          subtitle="Percentage of total CPU capacity"
          loading={loading}
        >
          <TimeSeriesChart
            data={history}
            dataKey="cpu"
            color="hsl(var(--chart-1))"
            timeRange={timeRange}
            animate={settings.chartAnimations}
          />
        </ChartCard>
        <ChartCard
          title="Memory Usage Over Time"
          subtitle="Percentage of total memory"
          loading={loading}
        >
          <TimeSeriesChart
            data={history}
            dataKey="memory"
            color="hsl(var(--chart-2))"
            timeRange={timeRange}
            animate={settings.chartAnimations}
          />
        </ChartCard>
        <ChartCard
          title="Disk Usage Per Mount"
          subtitle="Used space by filesystem mount"
          loading={loading}
        >
          <DiskBarChart data={stats?.mounts ?? []} animate={settings.chartAnimations} />
        </ChartCard>
        <ChartCard
          title="Network Traffic"
          subtitle="Inbound and outbound throughput (KB/s)"
          loading={loading}
        >
          <NetworkChart data={history} timeRange={timeRange} animate={settings.chartAnimations} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProcessTable
            processes={stats?.processes ?? []}
            loading={loading}
            hasServer={allServers.length > 0}
            compactMode={settings.compactMode}
          />
        </div>
        <AlertList alerts={isLive ? apiAlerts : (stats?.alerts ?? [])} loading={loading} />
      </div>

      <PortsTable ports={stats?.ports ?? []} loading={loading} compactMode={settings.compactMode} />
    </div>
  );
}
