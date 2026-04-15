import { apiFetch } from './core';

// ─── System Preferences ───────────────────────────────────────────

export interface ApiSystemPreference {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemPreferencesResponse {
  items: ApiSystemPreference[];
  groups: Record<string, ApiSystemPreference[]>;
  aggregates: {
    total: number;
    categories: number;
  };
}

export function fetchSystemPreferences(params?: {
  category?: string;
  key?: string;
  is_public?: boolean;
}) {
  return apiFetch<SystemPreferencesResponse>('/SystemPreferences', {
    params: {
      category: params?.category,
      key: params?.key,
      is_public: params?.is_public,
    },
  });
}

export function fetchSystemPreference(key: string) {
  return apiFetch<ApiSystemPreference>(`/SystemPreferences/${key}`);
}

export function upsertSystemPreference(data: {
  key: string;
  value: string;
  type?: string;
  category?: string;
  description?: string;
  is_public?: boolean;
}) {
  return apiFetch<ApiSystemPreference>('/SystemPreferences', { method: 'POST', body: data });
}

export function updateSystemPreference(key: string, data: Partial<{
  value: string;
  type: string;
  category: string;
  description: string;
  is_public: boolean;
}>) {
  return apiFetch<ApiSystemPreference>(`/SystemPreferences/${key}`, { method: 'PUT', body: data });
}

export function deleteSystemPreference(key: string) {
  return apiFetch<void>(`/SystemPreferences/${key}`, { method: 'DELETE' });
}

