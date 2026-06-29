import { apiSlice } from "@/store/base-api";
import type { MetricPoint, ServerStats } from "@/lib/types";

export const statsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getStatsHistory: build.query<MetricPoint[], { serverId: string; range: string }>({
      query: ({ serverId, range }) =>
        `/servers/${serverId}/metrics?range=${range}`,
      providesTags: (_result, _error, { serverId }) => [
        { type: "Stats", id: serverId },
      ],
    }),
    getLatestStats: build.query<ServerStats, { serverId: string }>({
      query: ({ serverId }) => `/servers/${serverId}/metrics/latest`,
      providesTags: (_result, _error, { serverId }) => [
        { type: "Stats", id: serverId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStatsHistoryQuery,
  useGetLatestStatsQuery,
  useLazyGetStatsHistoryQuery,
} = statsApi;
