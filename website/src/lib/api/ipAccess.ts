/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[IP access control API client; website/src/hooks/useIpAccessControl.ts, website/src/lib/api.ts (barrel)]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/types/ipAccessControl.ts, api/src/routes/ipAccess.js, product-map/domains/settings-system.yaml]
 * Calls /api/IpAccess settings/entries/check.
 */
import { apiFetch } from './core';
import type { IpEntry, IpAccessMode } from '@/types/ipAccessControl';

// ─── IP Access Control API ─────────────────────────────────────────

export interface IpAccessSettingsResponse {
  id: string;
  mode: IpAccessMode;
  lastUpdated: string;
}

export interface IpAccessEntriesResponse {
  entries: IpEntry[];
}

export interface IpAccessCheckResponse {
  allowed: boolean;
  reason?: string;
  clientIp: string;
}

export function fetchIpAccessSettings() {
  return apiFetch<IpAccessSettingsResponse>('/IpAccess/settings');
}

export function updateIpAccessSettings(mode: IpAccessMode) {
  return apiFetch<IpAccessSettingsResponse>('/IpAccess/settings', {
    method: 'PUT',
    body: { mode },
  });
}

export function fetchIpAccessEntries() {
  return apiFetch<IpAccessEntriesResponse>('/IpAccess/entries');
}

export function createIpAccessEntry(data: {
  ipAddress: string;
  type: 'whitelist' | 'blacklist';
  description?: string;
}) {
  return apiFetch<IpEntry>('/IpAccess/entries', {
    method: 'POST',
    body: data,
  });
}

export function updateIpAccessEntry(
  id: string,
  data: Partial<{ description: string; type: 'whitelist' | 'blacklist'; isActive: boolean }>
) {
  return apiFetch<IpEntry>(`/IpAccess/entries/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export function deleteIpAccessEntry(id: string) {
  return apiFetch<void>(`/IpAccess/entries/${id}`, {
    method: 'DELETE',
  });
}

export function checkIpAccessStatus() {
  return apiFetch<IpAccessCheckResponse>('/IpAccess/check');
}
