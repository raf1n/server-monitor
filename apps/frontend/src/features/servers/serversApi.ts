import { apiSlice } from "@/store/base-api";
import type { ServerInfo } from "@/lib/types";

export const serversApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getServers: build.query<ServerInfo[], void>({
      query: () => "/servers",
      providesTags: ["Servers"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetServersQuery } = serversApi;
