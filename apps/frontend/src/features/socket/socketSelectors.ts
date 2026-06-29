import type { RootState } from "@/store";

export const selectConnection = (state: RootState) => state.socket.connection;
export const selectIsConnected = (state: RootState) =>
  state.socket.connection === "connected";
export const selectIsDemoMode = (state: RootState) =>
  state.socket.connection === "demo";
