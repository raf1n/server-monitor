import { apiSlice } from "@/store/base-api";

const settingsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<Record<string, string>, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    saveSettings: build.mutation<
      { success: boolean },
      { settings: Record<string, string>; serverId?: string }
    >({
      query: ({ settings, serverId }) => ({
        url: "/settings/bulk",
        method: "PUT",
        body: { settings, serverId },
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSettingsQuery, useSaveSettingsMutation } = settingsApi;
