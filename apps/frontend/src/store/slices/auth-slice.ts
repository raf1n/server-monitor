import type { SliceCreator, AuthSlice } from '../types';

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;
const API_PREFIX = '/api';

export const createAuthSlice: SliceCreator<AuthSlice> = (set, get) => ({
  // ── State ──
  user: null,
  authLoading: true,
  isAuthenticated: false,

  // ── Actions ──
  initAuth: async () => {
    if (API_HOST === undefined) {
      set({ authLoading: false });
      return;
    }
    try {
      const res = await fetch(`${API_HOST}${API_PREFIX}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          set({ user: data, isAuthenticated: true, authLoading: false });
          return;
        }
      }
    } catch {}
    set({ user: null, isAuthenticated: false, authLoading: false });
  },

  login: async (username, password) => {
    if (API_HOST === undefined) return;
    const res = await fetch(`${API_HOST}${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Login failed');
      throw new Error(text);
    }
    const meRes = await fetch(`${API_HOST}${API_PREFIX}/auth/me`, {
      credentials: 'include',
    });
    if (meRes.ok) {
      const data = await meRes.json();
      if (data?.id) set({ user: data, isAuthenticated: true });
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    if (API_HOST) {
      fetch(`${API_HOST}${API_PREFIX}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    }
  },
});
