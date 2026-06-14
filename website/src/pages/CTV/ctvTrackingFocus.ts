/**
 * @crossref:domain[ctv]
 * @crossref:used-in[website/src/pages/CTV/CtvDashboard.tsx, website/src/pages/CTV/tabs/CtvTrackingTab.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (CtvReferral types), product-map/domains/ctv.yaml]
 */
import type { CtvLob, CtvReferral, CtvReferralService, CtvServiceStatus } from '@/lib/api/ctv';
import { normalizeText } from '@/lib/utils';

export interface CtvTrackingFocus {
  readonly clientId: string;
  readonly serviceLineId?: string | null;
  readonly clientName?: string | null;
  readonly serviceName?: string | null;
  readonly lob?: CtvLob;
  readonly amount?: number;
  readonly status?: CtvServiceStatus;
  readonly earnedAt?: string | null;
}

export function normalizeCtvClientId(id: string | null | undefined): string {
  return String(id ?? '').trim().toLowerCase();
}

export function ctvClientIdsMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = normalizeCtvClientId(left);
  const b = normalizeCtvClientId(right);
  return !!a && !!b && a === b;
}

function serviceLineMatches(
  service: CtvReferralService,
  serviceLineId: string | null | undefined,
  serviceName: string | null | undefined
): boolean {
  if (serviceLineId) {
    const needle = normalizeCtvClientId(serviceLineId);
    if (normalizeCtvClientId(service.id) === needle) return true;
    if (normalizeCtvClientId(service.serviceLineId) === needle) return true;
  }
  if (serviceName && service.serviceName) {
    return normalizeText(service.serviceName) === normalizeText(serviceName);
  }
  return false;
}

function buildFocusService(focus: CtvTrackingFocus): CtvReferralService | null {
  if (!focus.serviceLineId && !focus.serviceName) return null;
  const serviceId = focus.serviceLineId || `focus-${focus.clientId}`;
  return {
    id: serviceId,
    serviceLineId: focus.serviceLineId ?? null,
    paymentId: null,
    serviceName: focus.serviceName ?? null,
    amount: Math.abs(focus.amount ?? 0),
    status: focus.status ?? 'pending',
    source: 'ctv',
    lob: focus.lob ?? 'cosmetic',
    earnedAt: focus.earnedAt ?? null,
  };
}

export function buildSyntheticReferralFromFocus(focus: CtvTrackingFocus): CtvReferral {
  const focusService = buildFocusService(focus);
  const services = focusService ? [focusService] : [];
  return {
    id: focus.clientId,
    name: focus.clientName ?? null,
    phone: '',
    lobs: [focus.lob ?? 'cosmetic'],
    total_earned: Math.abs(focus.amount ?? 0),
    earned_count: services.length,
    service_count: services.length,
    status: 'earning',
    referred_at: null,
    services,
    stage_progress: 3,
  };
}

export function mergeReferralWithFocus(
  referral: CtvReferral,
  focus: CtvTrackingFocus | null | undefined
): CtvReferral {
  if (!focus || !ctvClientIdsMatch(referral.id, focus.clientId)) return referral;
  const focusService = buildFocusService(focus);
  if (!focusService) return referral;
  const alreadyPresent = (referral.services ?? []).some((service) =>
    serviceLineMatches(service, focus.serviceLineId, focus.serviceName)
  );
  if (alreadyPresent) return referral;
  const services = [focusService, ...(referral.services ?? [])];
  return {
    ...referral,
    services,
    service_count: Math.max(referral.service_count ?? 0, services.length),
  };
}

export function resolveReferralsForFocus(
  referrals: CtvReferral[],
  focus: CtvTrackingFocus | null | undefined
): CtvReferral[] {
  if (!focus?.clientId) return referrals;
  const existing = referrals.find((referral) => ctvClientIdsMatch(referral.id, focus.clientId));
  if (!existing) {
    return [buildSyntheticReferralFromFocus(focus), ...referrals];
  }
  return referrals.map((referral) =>
    ctvClientIdsMatch(referral.id, focus.clientId)
      ? mergeReferralWithFocus(referral, focus)
      : referral
  );
}

export function serviceMatchesFocus(
  service: CtvReferralService,
  focus: CtvTrackingFocus | null | undefined
): boolean {
  if (!focus) return false;
  return serviceLineMatches(service, focus.serviceLineId, focus.serviceName);
}

export function ctvReferralDomId(clientId: string | null | undefined): string {
  return `ctv-referral-${normalizeCtvClientId(clientId)}`;
}