/**
 * @crossref:domain[ctv]
 * @crossref:used-in[CTV self-profile API client; website/src/components/ctv/CtvQrDiscountPanel.tsx, website/src/pages/CTV/tabs/CtvNetworkTab.tsx]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/lib/pii.ts, api/src/routes/ctvProfile.js, product-map/domains/ctv.yaml]
 * Calls /api/ctv/me and /api/ctv/me/password; masks PII before returning.
 */
import { apiFetch } from './core';
import { maskEmail, maskPhone } from '@/lib/pii';

export interface CtvProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: string;
  readonly isLive?: boolean;
}

export interface UpdateCtvSelfProfileInput {
  readonly name: string;
}

export interface ChangeCtvSelfPasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}

function maskCtvProfile(profile: CtvProfile): CtvProfile {
  return { ...profile, phone: maskPhone(profile.phone), email: maskEmail(profile.email) };
}

export async function fetchCtvProfile(): Promise<CtvProfile> {
  const profile = await apiFetch<CtvProfile>('/ctv/me');
  return maskCtvProfile(profile);
}

export async function updateCtvSelfProfile(input: UpdateCtvSelfProfileInput): Promise<CtvProfile> {
  const profile = await apiFetch<CtvProfile>('/ctv/me', { method: 'PATCH', body: input });
  return maskCtvProfile(profile);
}

export function changeCtvSelfPassword(input: ChangeCtvSelfPasswordInput): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/ctv/me/password', { method: 'POST', body: input });
}
