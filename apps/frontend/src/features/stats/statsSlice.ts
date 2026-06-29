import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ServerStats, MetricPoint } from "@/lib/types";
import { HISTORY_BUFFER } from "@/lib/types";
import { statsApi } from "./statsApi";

export interface StatsState {
  stats: ServerStats | null;
  chartHistory: MetricPoint[];
}

const initialState: StatsState = {
  stats: null,
  chartHistory: [],
};

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    setStats(state, action: PayloadAction<ServerStats | null>) {
      state.stats = action.payload;
    },
    setChartHistory(state, action: PayloadAction<MetricPoint[]>) {
      state.chartHistory = action.payload;
    },
    appendToChartHistory(state, action: PayloadAction<MetricPoint>) {
      state.chartHistory = [
        ...state.chartHistory.slice(-(HISTORY_BUFFER - 1)),
        action.payload,
      ];
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      statsApi.endpoints.getStatsHistory.matchFulfilled,
      (state, action) => {
        if (Array.isArray(action.payload) && action.payload.length > 0) {
          state.chartHistory = action.payload;
        }
      },
    );
    builder.addMatcher(
      statsApi.endpoints.getLatestStats.matchFulfilled,
      (state, action) => {
        state.stats = action.payload;
      },
    );
  },
});

export const { setStats, setChartHistory, appendToChartHistory } =
  statsSlice.actions;
export default statsSlice.reducer;
