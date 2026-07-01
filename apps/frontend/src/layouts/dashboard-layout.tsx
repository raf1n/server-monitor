import { useEffect, useRef, useState } from "react";
import { Outlet, Navigate, useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { useAppSelector, useAppDispatch, store } from "@/store";
import { selectSelectedId, selectTimeRange, selectServers } from "@/features/servers/serversSelectors";
import { selectServer, setTimeRange } from "@/features/servers/serversSlice";
import { selectIsAuthenticated, selectAuthLoading } from "@/features/auth/authSelectors";
import { useGetMeQuery } from "@/features/auth/authApi";
import { selectAlerts } from "@/features/alerts/alertsSelectors";
import { selectSettings } from "@/features/settings/settingsSelectors";
import { connectSocket } from "@/features/socket/socketActions";
import type { TimeRange } from "@/lib/types";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export default function DashboardLayout() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authLoading = useAppSelector(selectAuthLoading);
  const alerts = useAppSelector(selectAlerts);
  const settings = useAppSelector(selectSettings);
  const servers = useAppSelector(selectServers);
  const selectedId = useAppSelector(selectSelectedId);
  const timeRange = useAppSelector(selectTimeRange);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const initRef = useRef(false);

  useGetMeQuery();

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (initRef.current) return;
    if (API_HOST !== undefined && servers.length === 0) return;
    initRef.current = true;

    const urlServer = searchParams.get("server") || servers[0]?.id || selectedId || "";
    const urlRange = (searchParams.get("range") as TimeRange) || timeRange || "5m";

    if (urlServer && urlServer !== selectedId) {
      dispatch(selectServer(urlServer));
    }
    if (urlRange && urlRange !== timeRange) {
      dispatch(setTimeRange(urlRange));
    }

    dispatch(connectSocket());
  }, [servers, dispatch, searchParams, selectedId, timeRange]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const p = new URLSearchParams();
      p.set("server", state.servers.selectedId);
      p.set("range", state.servers.timeRange);
      setSearchParams(p, { replace: true });
    });
    return unsubscribe;
  }, [setSearchParams]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevAlertIds = useRef(new Set<string>());

  useEffect(() => {
    const handler = () => {
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    };
    document.addEventListener("click", handler, { once: true });
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    // Find IDs that weren't seen before
    const unseen = alerts.filter((a) => !prevAlertIds.current.has(a.id));

    // Update the set with all current IDs
    for (const a of alerts) {
      prevAlertIds.current.add(a.id);
    }

    // Bulk loads (API fetch) bring many unseen IDs at once — skip sound
    // Socket addAlert pushes 1-2 at a time — only sound for those
    if (unseen.length === 0 || unseen.length > 3) return;

    for (const alert of unseen) {
      if (alert.severity !== "critical") continue;
      if (settings.soundEnabled) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
          const ctx = audioCtxRef.current;
          if (ctx.state !== "suspended") {
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
          console.warn("Failed to play alert sound:", err);
        }
      }
      if (settings.notifications && typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("Critical Alert", { body: alert.message, tag: alert.id });
        } else if (Notification.permission === "default") {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === "granted") {
                new Notification("Critical Alert", { body: alert.message, tag: alert.id });
              }
            })
            .catch((err) => console.warn("Notification permission request failed:", err));
        }
      }
    }
  }, [alerts, settings.soundEnabled, settings.notifications]);

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
