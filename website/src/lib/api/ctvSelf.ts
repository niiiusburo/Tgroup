import { apiFetch } from './core';
import { maskEmail, maskPhone } from '@/lib/pii';

export interface CtvProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: string;
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
