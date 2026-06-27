/// <reference types="vite/client" />

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { generateDemoStats, nextDemoTick, DEMO_SERVERS } from '@/lib/mock-data';
import type { MetricPoint, ServerStats, TimeRange } from '@/lib/types';
import { TIME_RANGE_POINTS } from '@/lib/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
const STATS_EVENT = 'stats';

const API_BASE = import.meta.env.VITE_SOCKET_URL || '';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'demo';

interface UseStatsOptions {
  refreshInterval?: string;
  autoReconnect?: boolean;
}

interface UseStatsResult {
  stats: ServerStats | null;
  connection: ConnectionState;
  reconnect: () => void;
}

export function useStats(serverId: string, timeRange: TimeRange = '5m', options?: UseStatsOptions): UseStatsResult {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [chartHistory, setChartHistory] = useState<MetricPoint[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverIdRef = useRef(serverId);
  const timeRangeRef = useRef(timeRange);
  const optionsRef = useRef(options);
  const fetchHistoryRef = useRef(true);

  // Sync refs
  useEffect(() => { serverIdRef.current = serverId; }, [serverId]);
  useEffect(() => { timeRangeRef.current = timeRange; }, [timeRange]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const fetchBackendHistory = useCallback(async () => {
    if (!API_BASE) return;
    try {
      const range = timeRangeRef.current;
      const limit = TIME_RANGE_POINTS[range];
      const res = await fetch(`${API_BASE}/servers/${serverIdRef.current}/metrics?range=${range}&limit=${limit}`);
      if (!res.ok) return;
      const data: MetricPoint[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setChartHistory(data);
      }
    } catch {
    }
  }, []);

  const startDemo = useCallback((initial: ServerStats) => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    const tick = Number(optionsRef.current?.refreshInterval) * 1000 || 2000;
    demoTimerRef.current = setInterval(() => {
      setStats((prev) => {
        if (!prev) return prev;
        const updated = nextDemoTick(prev);
        const latestPoint = updated.history?.[updated.history.length - 1];
        if (latestPoint) {
          setChartHistory((prevCH) => {
            const max = TIME_RANGE_POINTS[timeRangeRef.current];
            return [...prevCH.slice(-(max - 1)), latestPoint];
          });
        }
        return updated;
      });
    }, tick);
  }, []);

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    stopDemo();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!SOCKET_URL) {
      setConnection('demo');
      const server = DEMO_SERVERS.find((s) => s.id === serverIdRef.current) ?? DEMO_SERVERS[0];
      const initial = generateDemoStats(server);
      setStats(initial);
      setChartHistory(initial.history);
      startDemo(initial);
      return;
    }

    setConnection('connecting');
    const opts = optionsRef.current ?? {};
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: opts.autoReconnect !== false,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnection('connected');
      socket.emit('subscribe', { serverId: serverIdRef.current });
      fetchBackendHistory();
    });

    socket.on('disconnect', () => {
      setConnection('disconnected');
    });

    socket.on(STATS_EVENT, (data: ServerStats) => {
      if (data.serverId !== serverIdRef.current) return;
      setStats((prev) => {
        if (!prev) return { ...data, history: [] };
        return { ...prev, ...data, history: prev.history };
      });
      const latestPoint = data.history?.[data.history.length - 1];
      if (latestPoint) {
        setChartHistory((prev) => {
          const max = TIME_RANGE_POINTS[timeRangeRef.current];
          return [...prev.slice(-(max - 1)), latestPoint];
        });
      }
    });

    socket.on('connect_error', () => {
      setConnection('disconnected');
    });
  }, [startDemo, stopDemo, fetchBackendHistory]);

  useEffect(() => {
    if (connection === 'connected') {
      fetchBackendHistory();
    }
  }, [timeRange, connection, fetchBackendHistory]);

  useEffect(() => {
    serverIdRef.current = serverId;
    connect();
    return () => {
      stopDemo();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [serverId, connect, stopDemo]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  const resultStats: ServerStats | null = stats
    ? { ...stats, history: chartHistory }
    : null;

  return { stats: resultStats, connection, reconnect };
}
