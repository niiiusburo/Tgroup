import { describe, expect, it } from 'vitest';

import type { CtvReferral } from '@/lib/api/ctv';
import {
  buildSyntheticReferralFromFocus,
  ctvClientIdsMatch,
  mergeReferralWithFocus,
  resolveReferralsForFocus,
  serviceMatchesFocus,
} from './ctvTrackingFocus';

const baseReferral: CtvReferral = {
  id: 'client-1',
  name: 'Seed Client NK3 CTV',
  phone: '0900000000',
  lobs: ['cosmetic'],
  total_earned: 72700,
  earned_count: 1,
  service_count: 0,
  status: 'earning',
  referred_at: '2026-05-24T08:00:00.000Z',
  services: [],
};

describe('ctvTrackingFocus', () => {
  it('matches client ids case-insensitively', () => {
    expect(ctvClientIdsMatch('ABC-123', 'abc-123')).toBe(true);
    expect(ctvClientIdsMatch('abc-123', 'xyz')).toBe(false);
  });

  it('builds a synthetic referral when the client is missing from tracking', () => {
    const synthetic = buildSyntheticReferralFromFocus({
      clientId: 'client-9',
      clientName: 'Seed Client NK3 CTV',
      serviceLineId: 'line-9',
      serviceName: '1cc Filler Hàn',
      lob: 'cosmetic',
      amount: 72700,
      status: 'reversed',
    });

    expect(synthetic.id).toBe('client-9');
    expect(synthetic.services).toHaveLength(1);
    expect(synthetic.services[0]?.serviceName).toBe('1cc Filler Hàn');
  });

  it('merges a commission service onto an existing referral with no sale lines', () => {
    const merged = mergeReferralWithFocus(baseReferral, {
      clientId: 'client-1',
      serviceLineId: 'line-9',
      serviceName: '1cc Filler Hàn',
      lob: 'cosmetic',
      amount: 72700,
      status: 'reversed',
    });

    expect(merged.services).toHaveLength(1);
    expect(merged.services[0]?.serviceLineId).toBe('line-9');
  });

  it('prepends a missing client when drilling down from recent activity', () => {
    const resolved = resolveReferralsForFocus([baseReferral], {
      clientId: 'client-2',
      clientName: 'Other Client',
      serviceName: 'Botox',
      lob: 'cosmetic',
      amount: 1000,
    });

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.id).toBe('client-2');
    expect(resolved[0]?.services[0]?.serviceName).toBe('Botox');
  });

  it('highlights by service line id or service name', () => {
    const service = {
      id: 'line-9',
      serviceLineId: 'line-9',
      paymentId: null,
      serviceName: '1cc Filler Hàn',
      amount: 72700,
      status: 'reversed' as const,
      source: 'ctv',
      lob: 'cosmetic' as const,
      earnedAt: null,
    };

    expect(
      serviceMatchesFocus(service, {
        clientId: 'client-1',
        serviceLineId: 'line-9',
      })
    ).toBe(true);
    expect(
      serviceMatchesFocus(service, {
        clientId: 'client-1',
        serviceName: '1cc Filler Hàn',
      })
    ).toBe(true);
  });
});