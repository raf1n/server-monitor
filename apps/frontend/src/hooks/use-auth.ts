import { useState, useCallback } from 'react';

const STORAGE_KEY = 'auth_token';
const API_HOST: string | undefined = import.meta.env.VITE_API_URL;
const API_PREFIX = '/api';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function decodeToken(token: string): { username?: string; email?: string | null; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

interface UseAuthResult {
  token: string | null;
  isAuthenticated: boolean;
  username: string;
  email: string | null;
  role: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthResult {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const decoded = token ? decodeToken(token) : null;
  const username = decoded?.username || 'User';
  const email = decoded?.email || null;
  const role = decoded?.role || 'viewer';

  const login = useCallback(async (username: string, password: string) => {
    if (API_HOST === undefined) return;
    const res = await fetch(`${API_HOST ?? ''}${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Login failed');
      throw new Error(text);
    }
    const data = await res.json();
    localStorage.setItem(STORAGE_KEY, data.accessToken);
    setToken(data.accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return { token, isAuthenticated: !!token, username, email, role, login, logout };
}
