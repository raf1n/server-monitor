import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AlertEvent } from "@/lib/types";
import { alertsApi } from "./alertsApi";

export interface AlertsState {
  alerts: AlertEvent[];
  alertsLoading: boolean;
  alertsError: string | null;
}

const initialState: AlertsState = {
  alerts: [],
  alertsLoading: false,
  alertsError: null,
};

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    addAlert(state, action: PayloadAction<AlertEvent>) {
      state.alerts.unshift(action.payload);
    },
    setAlertAcknowledged(state, action: PayloadAction<string>) {
      const alert = state.alerts.find((a) => a.id === action.payload);
      if (alert) alert.acknowledged = true;
    },
    setAllAlertsAcknowledged(state) {
      state.alerts.forEach((a) => {
        a.acknowledged = true;
      });
    },
    clearAlertsError(state) {
      state.alertsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        alertsApi.endpoints.listAlerts.matchPending,
        (state) => {
          state.alertsLoading = true;
          state.alertsError = null;
        },
      )
      .addMatcher(
        alertsApi.endpoints.listAlerts.matchFulfilled,
        (state, action) => {
          state.alerts = action.payload;
          state.alertsLoading = false;
        },
      )
      .addMatcher(
        alertsApi.endpoints.listAlerts.matchRejected,
        (state, action) => {
          state.alertsLoading = false;
          state.alertsError =
            (action.error?.message as string) ?? "Failed to fetch alerts";
        },
      );
  },
});

export const {
  addAlert,
  setAlertAcknowledged,
  setAllAlertsAcknowledged,
  clearAlertsError,
} = alertsSlice.actions;
export default alertsSlice.reducer;
