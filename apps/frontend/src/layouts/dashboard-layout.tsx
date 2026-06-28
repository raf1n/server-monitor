import { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import {
  useStore,
  useIsAuthenticated,
  useAuthLoading,
  useInitApp,
  useAlerts,
  useSettings,
} from '@/store';
import type { TimeRange } from '@/lib/types';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export default function DashboardLayout() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const alerts = useAlerts();
  const settings = useSettings();
  const initApp = useInitApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const initRef = useRef(false);

  // URL params ↔ store sync
  const [searchParams, setSearchParams] = useSearchParams();

  // On mount: read URL params into store, then init everything
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const urlServer = searchParams.get('server') || '';
    const urlRange = (searchParams.get('range') as TimeRange) || '5m';
    const state = useStore.getState();
    if (urlServer) state.selectServer(urlServer);
    if (urlRange && urlRange !== '5m') state.setTimeRange(urlRange);

    initApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with store (replace, don't push)
  useEffect(() => {
    return useStore.subscribe((state) => {
      const p = new URLSearchParams();
      p.set('server', state.selectedId);
      p.set('range', state.timeRange);
      setSearchParams(p, { replace: true });
    });
  }, [setSearchParams]);

  // Alert sound + push notifications
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevCriticalIds = useRef(new Set<string>());

  useEffect(() => {
    const handler = () => {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    };
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const newCritical = alerts.filter(
      (a) => a.severity === 'critical' && !prevCriticalIds.current.has(a.id),
    );
    for (const alert of newCritical) {
      prevCriticalIds.current.add(alert.id);
      if (settings.soundEnabled) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
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
        } catch (err) {
          console.warn('Failed to play alert sound:', err);
        }
      }
      if (settings.notifications && typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification('Critical Alert', { body: alert.message, tag: alert.id });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === 'granted') {
                new Notification('Critical Alert', { body: alert.message, tag: alert.id });
              }
            })
            .catch((err) => console.warn('Notification permission request failed:', err));
        }
      }
    }
  }, [alerts, settings.soundEnabled, settings.notifications]);

  // Auth guard — AFTER all hooks
  const isLive = API_HOST !== undefined;
  if (isLive && authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (isLive && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileToggle={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((p) => !p)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
