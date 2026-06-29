import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logoutAction } from "@/store/actions";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;
const API_PREFIX = "/api";

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_HOST ?? ""}${API_PREFIX}`,
  credentials: "include",
  headers: { "Content-Type": "application/json" },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const requestUrl = typeof args === "string" ? args : args.url;
    if (!requestUrl.startsWith("/auth/")) {
      api.dispatch(logoutAction());
      window.location.href = "/login";
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Auth", "Servers", "Alerts", "Settings", "Stats"],
  endpoints: () => ({}),
});
