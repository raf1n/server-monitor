import { apiSlice } from "@/store/base-api";
import type { AlertEvent, Thresholds } from "@/lib/types";

interface ListAlertsParams {
  serverId?: string;
  severity?: string;
  acknowledged?: string;
  limit?: string;
  offset?: string;
}

interface AlertResponse {
  id: string;
  serverId: string;
  title: string;
  message: string;
  severity: string;
  source: string;
  acknowledged: boolean;
  timestamp: string;
  createdAt: string;
}

function mapAlert(a: AlertResponse): AlertEvent {
  return {
    id: a.id,
    title: a.title,
    message: a.message,
    severity: a.severity as AlertEvent["severity"],
    timestamp: new Date(a.timestamp).getTime(),
    source: a.source,
    acknowledged: a.acknowledged,
  };
}

export const alertsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getThresholds: build.query<Thresholds, void>({
      query: () => "/alerts/thresholds",
      providesTags: ["Settings"],
    }),
    listAlerts: build.query<AlertEvent[], ListAlertsParams>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params?.serverId) q.set("serverId", params.serverId);
        if (params?.severity) q.set("severity", params.severity);
        if (params?.acknowledged) q.set("acknowledged", params.acknowledged);
        if (params?.limit) q.set("limit", params.limit);
        if (params?.offset) q.set("offset", params.offset);
        return `/alerts${q.toString() ? `?${q}` : ""}`;
      },
      transformResponse: (response: AlertResponse[]) => response.map(mapAlert),
      providesTags: ["Alerts"],
    }),
    acknowledgeAlert: build.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/alerts/${id}/acknowledge`,
        method: "PATCH",
      }),
      invalidatesTags: ["Alerts"],
    }),
    acknowledgeAllAlerts: build.mutation<
      { success: boolean; count: number },
      string | undefined
    >({
      query: (serverId) => {
        const q = serverId ? `?serverId=${serverId}` : "";
        return { url: `/alerts/acknowledge-all${q}`, method: "PATCH" };
      },
      invalidatesTags: ["Alerts"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetThresholdsQuery,
  useListAlertsQuery,
  useAcknowledgeAlertMutation,
  useAcknowledgeAllAlertsMutation,
} = alertsApi;
