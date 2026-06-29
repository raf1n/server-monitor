import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./base-api";
import { socketMiddleware } from "@/features/socket/socketListener";
import authReducer from "@/features/auth/authSlice";
import serversReducer from "@/features/servers/serversSlice";
import settingsReducer from "@/features/settings/settingsSlice";
import alertsReducer from "@/features/alerts/alertsSlice";
import statsReducer from "@/features/stats/statsSlice";
import socketReducer from "@/features/socket/socketSlice";

export const store = configureStore({
  reducer: {
    api: apiSlice.reducer,
    auth: authReducer,
    servers: serversReducer,
    settings: settingsReducer,
    alerts: alertsReducer,
    stats: statsReducer,
    socket: socketReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(apiSlice.middleware)
      .prepend(socketMiddleware.middleware),
  devTools: { name: "ServerMonitor Store" },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { useAppDispatch, useAppSelector } from "./hooks";
