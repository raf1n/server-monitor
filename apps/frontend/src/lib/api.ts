const API_BASE = import.meta.env.VITE_SOCKET_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error('No API base URL configured');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  alerts: {
    list: (params?: { serverId?: string; severity?: string; acknowledged?: string; limit?: string; offset?: string }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set('serverId', params.serverId);
      if (params?.severity) q.set('severity', params.severity);
      if (params?.acknowledged) q.set('acknowledged', params.acknowledged);
      if (params?.limit) q.set('limit', params.limit);
      if (params?.offset) q.set('offset', params.offset);
      return request<Array<{ id: string; serverId: string; title: string; message: string; severity: string; source: string; acknowledged: boolean; timestamp: string; createdAt: string }>>(`/alerts${q.toString() ? `?${q}` : ''}`);
    },
    count: (params?: { serverId?: string; acknowledged?: string; severity?: string }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set('serverId', params.serverId);
      if (params?.acknowledged) q.set('acknowledged', params.acknowledged);
      if (params?.severity) q.set('severity', params.severity);
      return request<{ count: number }>(`/alerts/count${q.toString() ? `?${q}` : ''}`);
    },
    acknowledge: (id: string) => request<{ success: boolean }>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
    acknowledgeAll: (serverId?: string) => {
      const q = serverId ? `?serverId=${serverId}` : '';
      return request<{ success: boolean; count: number }>(`/alerts/acknowledge-all${q}`, { method: 'PATCH' });
    },
    delete: (id: string) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),
  },
  settings: {
    getAll: (serverId?: string) => {
      const q = serverId ? `?serverId=${serverId}` : '';
      return request<Record<string, string>>(`/settings${q}`);
    },
    set: (key: string, value: string, serverId?: string) =>
      request<{ success: boolean }>('/settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value, serverId }),
      }),
  },
  notifications: {
    list: (params?: { serverId?: string; status?: string; limit?: string }) => {
      const q = new URLSearchParams();
      if (params?.serverId) q.set('serverId', params.serverId);
      if (params?.status) q.set('status', params.status);
      if (params?.limit) q.set('limit', params.limit);
      return request<Array<{ id: string; serverId?: string; type: string; title: string; message: string; severity: string; status: string; destination?: string; createdAt: string }>>(`/notifications${q.toString() ? `?${q}` : ''}`);
    },
  },
};
