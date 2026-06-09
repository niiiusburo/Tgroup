/**
 * @crossref:domain[auth]
 * @crossref:used-in[NK3 frontend API client: website/src/lib/api/auth]
 * @crossref:uses[product-map/domains/auth.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { apiFetch } from './core';

// ─── Auth ─────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  // Cosmetic LOB v2 additions (additive, optional for backward compat)
  lob_scope?: string[];
  is_ctv?: boolean;
  isCtv?: boolean;
  referred_by_ctv_id?: string | null;
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
  // Cosmetic LOB v2: CTV users may get explicit redirect target from backend
  redirectTo?: string;
}

export function login(identifier: string, password: string) {
  return apiFetch<LoginResponse>('/Auth/login', { method: 'POST', body: { email: identifier, password } });
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
