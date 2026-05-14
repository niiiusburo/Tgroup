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

export function login(email: string, password: string, rememberMe = false) {
  return apiFetch<LoginResponse>('/Auth/login', { method: 'POST', body: { email, password, rememberMe } });
}

export function fetchMe() {
  return apiFetch<LoginResponse>('/Auth/me');
}

export function changePassword(oldPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean; message: string }>('/Auth/change-password', {
    method: 'POST',
    body: { oldPassword, newPassword },
  });
}

