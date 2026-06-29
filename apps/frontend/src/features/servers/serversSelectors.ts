import type { RootState } from "@/store";
import type { TimeRange } from "@/lib/types";

export const selectServers = (state: RootState) => state.servers.servers;
export const selectSelectedId = (state: RootState) => state.servers.selectedId;
export const selectTimeRange = (state: RootState) =>
  state.servers.timeRange as TimeRange;

export const selectSelectedServer = (state: RootState) =>
  state.servers.servers.find((s) => s.id === state.servers.selectedId) ?? null;
