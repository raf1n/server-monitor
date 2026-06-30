import { apiSlice } from "@/store/base-api";
import type { UserProfile } from "./types";

interface LoginRequest {
  username: string;
  password: string;
}

const authApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<UserProfile, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
    login: build.mutation<UserProfile, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Servers", "Alerts", "Settings"],
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetMeQuery, useLoginMutation, useLogoutMutation, useLazyGetMeQuery } = authApi;
export { authApi };
