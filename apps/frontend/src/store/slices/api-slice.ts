import type { SliceCreator, ApiSlice } from '../types';

export const createApiSlice: SliceCreator<ApiSlice> = (_set, get) => ({
  initApp: async () => {
    const state = get();

    // 1. Auth
    await state.initAuth();
    if (import.meta.env.VITE_API_URL !== undefined && !get().isAuthenticated) return;

    // 2. Settings (from localStorage, instant)
    get()._loadSettings();

    // 3. Servers (fetch list)
    await state.initServers();

    // 4. Alerts (fetch initial data)
    await state.initAlerts();

    // 5. Single socket (handles both stats + alert events)
    state.connectSocket();
  },
});
