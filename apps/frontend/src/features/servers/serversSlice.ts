import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ServerInfo, TimeRange } from "@/lib/types";
import { DEMO_SERVERS } from "@/lib/mock-data";
import { serversApi } from "./serversApi";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;

export interface ServersState {
  servers: ServerInfo[];
  selectedId: string;
  timeRange: TimeRange;
}

const initialState: ServersState = {
  servers: API_HOST ? [] : DEMO_SERVERS,
  selectedId: API_HOST ? "" : (DEMO_SERVERS[0]?.id ?? ""),
  timeRange: "5m",
};

const serversSlice = createSlice({
  name: "servers",
  initialState,
  reducers: {
    selectServer(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    setTimeRange(state, action: PayloadAction<TimeRange>) {
      state.timeRange = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(serversApi.endpoints.getServers.matchFulfilled, (state, action) => {
      state.servers = action.payload;
      if (!state.servers.find((s) => s.id === state.selectedId)) {
        state.selectedId = state.servers[0]?.id ?? state.selectedId;
      }
    });
  },
});

export const { selectServer, setTimeRange } = serversSlice.actions;
export default serversSlice.reducer;
