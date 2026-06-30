import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { AlertEvent } from "@/lib/types";

export const selectAlerts = (state: RootState) => state.alerts.alerts;
export const selectAlertsLoading = (state: RootState) => state.alerts.alertsLoading;
export const selectAlertsError = (state: RootState) => state.alerts.alertsError;

export const selectUnacknowledgedAlerts = createSelector(selectAlerts, (alerts: AlertEvent[]) =>
  alerts.filter((a) => !a.acknowledged),
);

export const selectUnacknowledgedCount = createSelector(
  selectAlerts,
  (alerts: AlertEvent[]) => alerts.filter((a) => !a.acknowledged).length,
);

export const selectAlertsBySeverity = (severity: AlertEvent["severity"]) =>
  createSelector(selectAlerts, (alerts) => alerts.filter((a) => a.severity === severity));
