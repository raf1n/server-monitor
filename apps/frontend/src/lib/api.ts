import type { ProcessInfo, ServerInfo } from "./types";

const API_HOST: string | undefined = import.meta.env.VITE_API_URL;
const API_PREFIX = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  const url = `${API_HOST ?? ""}${API_PREFIX}${path}`;
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  if (res.status === 401) {
    const { store } = await import("@/store");
    store.dispatch({ type: "auth/logout" });
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  servers: {
    list: () => request<ServerInfo[]>("/servers"),
  },
  alerts: {
    list: (params?: {
      serverId?: string;
      severity?: string;
      acknowledged?: string;
      limit?: string;
      offset?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set("serverId", params.serverId);
      if (params?.severity) q.set("severity", params.severity);
      if (params?.acknowledged) q.set("acknowledged", params.acknowledged);
      if (params?.limit) q.set("limit", params.limit);
      if (params?.offset) q.set("offset", params.offset);
      return request<
        Array<{
          id: string;
          serverId: string;
          title: string;
          message: string;
          severity: string;
          source: string;
          acknowledged: boolean;
          timestamp: string;
          createdAt: string;
        }>
      >(`/alerts${q.toString() ? `?${q}` : ""}`);
    },
    count: (params?: { serverId?: string; acknowledged?: string; severity?: string }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set("serverId", params.serverId);
      if (params?.acknowledged) q.set("acknowledged", params.acknowledged);
      if (params?.severity) q.set("severity", params.severity);
      return request<{ count: number }>(`/alerts/count${q.toString() ? `?${q}` : ""}`);
    },
    acknowledge: (id: string) =>
      request<{ success: boolean }>(`/alerts/${id}/acknowledge`, {
        method: "PATCH",
      }),
    acknowledgeAll: (serverId?: string) => {
      const q = serverId ? `?serverId=${serverId}` : "";
      return request<{ success: boolean; count: number }>(`/alerts/acknowledge-all${q}`, {
        method: "PATCH",
      });
    },
    delete: (id: string) => request<void>(`/alerts/${id}`, { method: "DELETE" }),
  },
  settings: {
    getAll: (serverId?: string) => {
      const q = serverId ? `?serverId=${serverId}` : "";
      return request<Record<string, string>>(`/settings${q}`);
    },
    set: (key: string, value: string, serverId?: string) =>
      request<{ success: boolean }>("/settings", {
        method: "PUT",
        body: JSON.stringify({ key, value, serverId }),
      }),
    setAll: (settings: Record<string, string>, serverId?: string) =>
      request<{ success: boolean }>("/settings/bulk", {
        method: "PUT",
        body: JSON.stringify({ settings, serverId }),
      }),
  },
  processes: {
    list: (serverId: string, signal?: AbortSignal) =>
      request<ProcessInfo[]>(`/servers/${serverId}/processes`, { signal }),
  },
  users: {
    me: () =>
      request<{
        id: string;
        username: string;
        email?: string;
        createdAt: string;
        updatedAt: string;
      }>("/users/me"),
    update: (data: {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }) =>
      request<{
        id: string;
        username: string;
        email?: string;
        createdAt: string;
        updatedAt: string;
      }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  notifications: {
    list: (params?: { serverId?: string; status?: string; limit?: string }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set("serverId", params.serverId);
      if (params?.status) q.set("status", params.status);
      if (params?.limit) q.set("limit", params.limit);
      return request<
        Array<{
          id: string;
          serverId?: string;
          type: string;
          title: string;
          message: string;
          severity: string;
          status: string;
          destination?: string;
          createdAt: string;
        }>
      >(`/notifications${q.toString() ? `?${q}` : ""}`);
    },
  },
  apiKeys: {
    list: () =>
      request<
        Array<{
          id: string;
          keyPrefix: string;
          serverId?: string;
          label?: string;
          revoked: boolean;
          lastUsedAt?: string;
          createdAt: string;
        }>
      >("/api-keys"),
    create: (data?: { serverId?: string; label?: string }) =>
      request<{
        id: string;
        key: string;
        keyPrefix: string;
        serverId?: string;
        label?: string;
        createdAt: string;
      }>("/api-keys", {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    revoke: (id: string) =>
      request<{ revoked: boolean }>(`/api-keys/${id}/revoke`, { method: "POST" }),
    delete: (id: string) => request<void>(`/api-keys/${id}`, { method: "DELETE" }),
  },
};
