import { apiFetch } from './core';

// ─── Auth ─────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
}

export interface AuthPermissions {
  groupId: string;
  groupName: string;
  effectivePermissions: string[];
  locations: { id: string; name: string }[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  permissions: AuthPermissions;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/Auth/login', { method: 'POST', body: { email, password } });
}

export function fetchMe() {
  return apiFetch<LoginResponse>('/auth/me');
}

