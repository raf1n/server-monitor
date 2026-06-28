import type { SliceCreator, SocketSlice } from '../types';
import type { ServerStats, AlertEvent } from '@/lib/types';
import { HISTORY_BUFFER } from '@/lib/types';
import { generateDemoStats, nextDemoTick, DEMO_SERVERS } from '@/lib/mock-data';
import { io } from 'socket.io-client';

const SOCKET_URL: string | undefined = import.meta.env.VITE_SOCKET_URL;

export const createSocketSlice: SliceCreator<SocketSlice> = (set, get) => ({
  socket: null,
  connection: 'connecting',
  _demoTimer: null,

  connectSocket: () => {
    const { selectedId, settings, _demoTimer, socket: existing } = get();
    if (!selectedId) return;
    if (_demoTimer) { clearInterval(_demoTimer); set({ _demoTimer: null }); }
    if (existing) existing.disconnect();

    // ── Demo mode ──
    if (SOCKET_URL === undefined) {
      set({ connection: 'demo' });
      const server = DEMO_SERVERS.find((s) => s.id === selectedId) ?? DEMO_SERVERS[0];
      const initial = generateDemoStats(server, get().timeRange ?? '5m');
      // Write directly into stats slice state
      set({ stats: initial, chartHistory: initial.history ?? [] } as any);

      const timer = setInterval(() => {
        const { stats: prev } = get() as any;
        if (!prev) return;
        const updated = nextDemoTick(prev);
        const latestPoint = updated.history?.[updated.history.length - 1];
        set(((s: any) => ({
          stats: updated,
          chartHistory: latestPoint
            ? [...s.chartHistory.slice(-(HISTORY_BUFFER - 1)), latestPoint]
            : s.chartHistory,
        })) as any);
      }, Number(settings?.refreshInterval ?? 2) * 1000 || 2000);

      set({ _demoTimer: timer });
      return;
    }

    // ── Live mode ──
    set({ connection: 'connecting' });

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      withCredentials: true,
    });

    socket.on('connect', () => {
      set({ connection: 'connected' });
      socket.emit('subscribe', { serverId: get().selectedId });
      get().fetchStatsHistory();
    });

    socket.on('disconnect', () => set({ connection: 'disconnected' }));
    socket.on('connect_error', () => set({ connection: 'disconnected' }));

    socket.on('stats', (data: ServerStats) => {
      if (data.serverId !== get().selectedId) return;
      const latestPoint = data.history?.[data.history.length - 1];
      set(((s: any) => ({
        stats: s.stats ? { ...s.stats, ...data, history: s.stats.history } : data,
        chartHistory: latestPoint
          ? [...s.chartHistory.slice(-(HISTORY_BUFFER - 1)), latestPoint]
          : s.chartHistory,
      })) as any);
    });

    socket.on('alert', (alert: AlertEvent & { serverId: string }) => {
      if (alert.serverId !== get().selectedId) return;
      set(((s: any) => ({
        alerts: [
          {
            id: alert.id,
            title: alert.title,
            message: alert.message,
            severity: alert.severity,
            timestamp: typeof alert.timestamp === 'number' ? alert.timestamp : new Date(alert.timestamp).getTime(),
            source: alert.source,
            acknowledged: alert.acknowledged,
          },
          ...s.alerts,
        ],
      })) as any);
    });

    set({ socket });
  },

  switchRoom: (serverId: string) => {
    const { socket, connection } = get();
    if (connection === 'demo') {
      get().connectSocket();
      return;
    }
    if (socket?.connected) {
      socket.emit('subscribe', { serverId });
    }
  },

  reconnectSocket: () => {
    const { _demoTimer, socket } = get();
    if (_demoTimer) { clearInterval(_demoTimer); set({ _demoTimer: null }); }
    if (socket) socket.disconnect();
    set({ socket: null, stats: null, chartHistory: [] } as any);
    get().connectSocket();
  },
});
