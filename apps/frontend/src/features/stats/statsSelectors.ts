import type { RootState } from "@/store";

export const selectStats = (state: RootState) => state.stats.stats;
export const selectChartHistory = (state: RootState) =>
  state.stats.chartHistory;
export const selectStatsLoading = (state: RootState) =>
  state.socket.connection === "connecting";
