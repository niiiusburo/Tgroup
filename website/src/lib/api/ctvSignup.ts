import { apiFetch } from './core';

export interface SignupTerms {
  readonly id: number;
  readonly language: string;
  readonly version: number;
  readonly title: string;
  readonly contentHtml: string;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

export interface CtvSignupPayload {
  readonly phone: string;
  readonly name: string;
  readonly email?: string;
  readonly dob?: string;
  readonly address?: string;
  readonly idNumber?: string;
  readonly password: string;
  readonly referrerPhone?: string;
  readonly signatureImage?: string;
  readonly signupTermsId?: number;
}

export interface CtvSignupResponse {
  readonly success: boolean;
  readonly id: string;
  readonly message: string;
}

export interface ReferrerLookupResponse {
  readonly found: boolean;
  readonly id?: string;
  readonly name?: string;
  readonly phone?: string;
  readonly email?: string;
}

export interface OcrResponse {
  readonly name?: string | null;
  readonly dob?: string | null;
  readonly id_number?: string | null;
}

export function fetchSignupTerms(language: string) {
  return apiFetch<SignupTerms>(`/signup-terms/active?language=${language}`);
}

export function checkReferrerPhone(phone: string) {
  return apiFetch<ReferrerLookupResponse>(`/ctv/signup/check-referrer-phone?phone=${encodeURIComponent(phone)}`);
}

export function submitCtvSignup(payload: CtvSignupPayload) {
  return apiFetch<CtvSignupResponse>('/ctv/signup', {
    method: 'POST',
    body: payload,
  });
}

export function submitOcr(imageBase64: string) {
  return apiFetch<OcrResponse>('/ctv/signup/ocr', {
    method: 'POST',
    body: { image: imageBase64 },
  });
}
