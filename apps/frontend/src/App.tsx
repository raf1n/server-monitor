import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { AlertList } from '@/components/dashboard/alert-list';
import { ChartCard } from '@/components/dashboard/chart-card';
import {
  DiskBarChart,
  NetworkChart,
  TimeSeriesChart,
} from '@/components/dashboard/charts';
import { ProcessTable } from '@/components/dashboard/process-table';
import { Sidebar } from '@/components/dashboard/sidebar';
import { StatCard, statusFromValue } from '@/components/dashboard/stat-card';
import { Topbar } from '@/components/dashboard/topbar';
import { AlertsPage } from '@/components/dashboard/pages/alerts-page';
import { ProcessesPage } from '@/components/dashboard/pages/processes-page';
import { ServersPage } from '@/components/dashboard/pages/servers-page';
import { SettingsPage } from '@/components/dashboard/pages/settings-page';
import { useStats } from '@/hooks/use-stats';
import { useAlerts } from '@/hooks/use-alerts';
import { useSettings } from '@/hooks/use-settings';
import { DEMO_SERVERS } from '@/lib/mock-data';
import type { TimeRange, ServerInfo, AlertEvent } from '@/lib/types';
import { TIME_RANGE_POINTS } from '@/lib/types';

const API_BASE = import.meta.env.VITE_SOCKET_URL || '';

function DashboardHome({
  stats,
  loading,
  serverId,
  servers,
  timeRange,
  criticalThreshold,
  compactMode,
  chartAnimations,
}: {
  stats: ReturnType<typeof useStats>['stats'];
  loading: boolean;
  serverId: string;
  servers: ServerInfo[];
  timeRange: TimeRange;
  criticalThreshold: string;
  compactMode: boolean;
  chartAnimations: boolean;
}) {
  const history = useMemo(
    () => (stats?.history ?? []).slice(-TIME_RANGE_POINTS[timeRange]),
    [stats, timeRange]
  );

  const cpuData = useMemo(
    () => history.map((p) => ({ value: p.cpu })),
    [history]
  );
  const memData = useMemo(
    () => history.map((p) => ({ value: p.memory })),
    [history]
  );
  const diskData = useMemo(
    () => history.map((p) => ({ value: p.disk })),
    [history]
  );
  const procData = useMemo(
    () => history.map((p) => ({ value: stats?.activeProcesses ?? 0 })),
    [history, stats]
  );

  const threshold = Number(criticalThreshold) || 85;
  const warningAt = Math.max(threshold - 5, 50);
  const cpuStatus = stats ? statusFromValue(stats.cpu, [warningAt, threshold]) : 'good';
  const memStatus = stats ? statusFromValue(stats.memory, [warningAt, threshold]) : 'good';
  const diskStatus = stats ? statusFromValue(stats.disk, [warningAt + 5, threshold + 5]) : 'good';
  const procStatus: 'good' | 'warning' | 'critical' = stats && stats.activeProcesses === 0 ? 'warning' : 'good';

  return (
    <div className={compactMode ? 'space-y-3' : 'space-y-6'}>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics for{' '}
          <span className="font-medium text-foreground">
            {servers.find((s) => s.id === serverId)?.name}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="CPU Usage" value={stats?.cpu ?? 0} data={cpuData} status={cpuStatus} loading={loading} icon={Cpu} />
        <StatCard title="Memory Usage" value={stats?.memory ?? 0} data={memData} status={memStatus} loading={loading} icon={MemoryStick} />
        <StatCard title="Disk Usage" value={stats?.disk ?? 0} data={diskData} status={diskStatus} loading={loading} icon={HardDrive} />
        <StatCard title="Active Processes" value={stats?.activeProcesses ?? 0} unit="" data={procData} status={procStatus} loading={loading} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="CPU Usage Over Time" subtitle="Percentage of total CPU capacity" loading={loading}>
          <TimeSeriesChart data={history} dataKey="cpu" color="hsl(var(--chart-1))" timeRange={timeRange} animate={chartAnimations} />
        </ChartCard>
        <ChartCard title="Memory Usage Over Time" subtitle="Percentage of total memory" loading={loading}>
          <TimeSeriesChart data={history} dataKey="memory" color="hsl(var(--chart-2))" timeRange={timeRange} animate={chartAnimations} />
        </ChartCard>
        <ChartCard title="Disk Usage Per Mount" subtitle="Used space by filesystem mount" loading={loading}>
          <DiskBarChart data={stats?.mounts ?? []} animate={chartAnimations} />
        </ChartCard>
        <ChartCard title="Network Traffic" subtitle="Inbound and outbound throughput (KB/s)" loading={loading}>
          <NetworkChart data={history} timeRange={timeRange} animate={chartAnimations} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProcessTable processes={stats?.processes ?? []} loading={loading} hasServer={servers.length > 0} compactMode={compactMode} />
        </div>
        <AlertList alerts={stats?.alerts ?? []} loading={loading} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [serverId, setServerId] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleNavigate = useCallback((id: string) => {
    setActiveNav(id);
    setMobileSidebarOpen(false);
  }, []);

  const { settings } = useSettings();

  useEffect(() => {
    if (!API_BASE) {
      setServers(DEMO_SERVERS);
      setServerId(DEMO_SERVERS[0]?.id ?? '');
      return;
    }
    const fetchServers = () => {
      fetch(`${API_BASE}/servers`)
        .then((res) => res.json())
        .then((data: ServerInfo[]) => {
          setServers(data);
          setServerId((prev) => {
            if (prev && data.find((s) => s.id === prev)) return prev;
            return data[0]?.id ?? prev;
          });
        })
        .catch(() => {});
    };
    fetchServers();
    const interval = setInterval(fetchServers, 15_000);
    return () => clearInterval(interval);
  }, []);

  const { stats, connection, reconnect } = useStats(serverId, timeRange, {
    refreshInterval: settings.refreshInterval,
    autoReconnect: settings.autoReconnect,
  });
  const loading = connection === 'connecting';

  const { alerts: apiAlerts, unacknowledgedCount: apiAlertCount, acknowledgeAlert: apiAckAlert, acknowledgeAll: apiAckAll } = useAlerts(
    import.meta.env.VITE_SOCKET_URL ? serverId : undefined
  );
  const hasApi = !!import.meta.env.VITE_SOCKET_URL;
  const alertSource = hasApi ? apiAlerts : (stats?.alerts ?? []);
  const totalAlertCount = hasApi
    ? apiAlertCount
    : alertSource.filter((a) => !a.acknowledged).length;

  // Shared AudioContext for alert sounds (resumed on first user click)
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const handler = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  // Alert sound + push notification for new critical alerts
  const prevCriticalIds = useRef(new Set<string>());
  useEffect(() => {
    const newCritical = alertSource.filter(
      (a) => a.severity === 'critical' && !prevCriticalIds.current.has(a.id)
    );
    for (const alert of newCritical) {
      prevCriticalIds.current.add(alert.id);

      if (settings.soundEnabled) {
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state !== 'suspended') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }
        } catch {}
      }

      if (settings.notifications && typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification('Critical Alert', {
            body: alert.message,
            tag: alert.id,
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification('Critical Alert', {
                body: alert.message,
                tag: alert.id,
              });
            }
          });
        }
      }
    }
  }, [alertSource, settings.soundEnabled, settings.notifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={activeNav} onNavigate={handleNavigate} alertCount={totalAlertCount} mobileOpen={mobileSidebarOpen} onMobileToggle={() => setMobileSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => setMobileSidebarOpen((p) => !p)}
          servers={servers}
          selectedServerId={serverId}
          onServerChange={setServerId}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          connection={connection}
          onReconnect={reconnect}
          alertCount={totalAlertCount}
          alerts={alertSource}
          onAcknowledgeAlert={hasApi ? apiAckAlert : (id) => {}}
          onAcknowledgeAll={hasApi ? apiAckAll : () => {}}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            {activeNav === 'dashboard' && (
              <DashboardHome
                stats={stats}
                loading={loading}
                serverId={serverId}
                servers={servers}
                timeRange={timeRange}
                criticalThreshold={settings.criticalThreshold}
                compactMode={settings.compactMode}
                chartAnimations={settings.chartAnimations}
              />
            )}
            {activeNav === 'servers' && (
              <ServersPage
                servers={servers}
                selectedServerId={serverId}
                onServerChange={setServerId}
                showSensitiveData={settings.showSensitiveData}
              />
            )}
            {activeNav === 'processes' && (
              <ProcessesPage stats={stats} loading={loading} serverId={serverId} compactMode={settings.compactMode} />
            )}
            {activeNav === 'alerts' && (
              <AlertsPage stats={stats} loading={loading} serverId={serverId} />
            )}
            {activeNav === 'settings' && (
              <SettingsPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );}
