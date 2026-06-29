import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import type { ServerStats, AlertEvent } from "@/lib/types";
import { DEMO_SERVERS, generateDemoStats, nextDemoTick } from "@/lib/mock-data";
import { setStats, setChartHistory, appendToChartHistory } from "@/features/stats/statsSlice";
import { addAlert } from "@/features/alerts/alertsSlice";
import { setConnection } from "./socketSlice";

const SOCKET_URL: string | undefined = import.meta.env.VITE_SOCKET_URL;

let socket: Socket | null = null;
let demoTimer: ReturnType<typeof setInterval> | null = null;

function cleanup() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function connect(dispatch: any, getState: () => any) {
  cleanup();

  const state = getState();
  const { selectedId } = state.servers;
  if (!selectedId) return;

  if (SOCKET_URL === undefined) {
    dispatch(setConnection("demo"));

    const server = DEMO_SERVERS.find((s: any) => s.id === selectedId) ?? DEMO_SERVERS[0];
    const initial = generateDemoStats(server, state.servers.timeRange);
    dispatch(setStats(initial));
    dispatch(setChartHistory(initial.history ?? []));

    demoTimer = setInterval(() => {
      const prev = getState().stats.stats;
      if (!prev) return;
      const updated = nextDemoTick(prev);
      const latestPoint = updated.history?.[updated.history.length - 1];
      dispatch(setStats(updated));
      if (latestPoint) {
        dispatch(appendToChartHistory(latestPoint));
      }
    }, 2000);

    return;
  }

  dispatch(setConnection("connecting"));

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    withCredentials: true,
  });

  socket.on("connect", () => {
    dispatch(setConnection("connected"));
    socket!.emit("subscribe", { serverId: selectedId });
  });

  socket.on("disconnect", () => {
    dispatch(setConnection("disconnected"));
  });

  socket.on("connect_error", () => {
    dispatch(setConnection("disconnected"));
  });

  socket.on("stats", (data: ServerStats) => {
    const currentId = getState().servers.selectedId;
    if (data.serverId !== currentId) return;

    const latestPoint = data.history?.[data.history.length - 1];
    dispatch(setStats(data));
    if (latestPoint) {
      dispatch(appendToChartHistory(latestPoint));
    }
  });

  socket.on("alert", (alert: AlertEvent & { serverId: string }) => {
    const currentId = getState().servers.selectedId;
    if (alert.serverId !== currentId) return;

    dispatch(
      addAlert({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity as AlertEvent["severity"],
        timestamp:
          typeof alert.timestamp === "number"
            ? alert.timestamp
            : new Date(alert.timestamp).getTime(),
        source: alert.source,
        acknowledged: alert.acknowledged,
      }),
    );
  });
}

export function disconnect() {
  cleanup();
}

export function switchRoom(serverId: string, dispatch: any, getState: () => any) {
  if (demoTimer) {
    cleanup();
    connect(dispatch, getState);
    return;
  }
  if (socket?.connected) {
    socket.emit("subscribe", { serverId });
  }
}
