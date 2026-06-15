import { describe, expect, it } from 'vitest';

import type { CtvCommissionRow, CtvReferral } from '@/lib/api/ctv';
import { resolveCommissionNavigateTarget } from './ctvCommissionNavigate';

const referral: CtvReferral = {
  id: 'client-1',
  name: 'Seed Client NK3 CTV',
  phone: '0909123456',
  lobs: ['cosmetic'],
  total_earned: 1000,
  earned_count: 1,
  service_count: 1,
  status: 'earning',
  referred_at: null,
  services: [],
};

describe('resolveCommissionNavigateTarget', () => {
  it('routes downline override to network tab', () => {
    const row: CtvCommissionRow = {
      id: 'e-1',
      client_id: 'client-zz',
      client_name: 'ZZ Client',
      service_name: 'Service A',
      amount: 50000,
      source: 'ctv',
      lob: 'cosmetic',
      earned_at: '2026-06-14',
      status: 'pending',
      attribution_kind: 'downline_override',
      attributed_ctv_id: 'downline-ctv',
      attributed_ctv_name: 'Downline Member',
      override_level: 1,
      level: 1,
    };
    const target = resolveCommissionNavigateTarget(row, []);
    expect(target?.tab).toBe('network');
    if (target?.tab === 'network') {
      expect(target.focus.downlineCtvId).toBe('downline-ctv');
    }
  });

  it('routes own referral to tracking tab', () => {
    const row: CtvCommissionRow = {
      id: 'e-2',
      client_id: 'client-1',
      client_name: 'Seed Client NK3 CTV',
      service_name: '1cc Filler',
      amount: 240000,
      source: 'ctv',
      lob: 'cosmetic',
      earned_at: '2026-06-14',
      status: 'pending',
      attribution_kind: 'own_referral',
      client_referred_by_me: true,
      level: 0,
    };
    const target = resolveCommissionNavigateTarget(row, [referral]);
    expect(target?.tab).toBe('tracking');
    if (target?.tab === 'tracking') {
      expect(target.focus.clientId).toBe('client-1');
      expect(target.focus.commissionHistoryOnly).toBeFalsy();
    }
  });

  it('routes commission history to tracking with commissionHistoryOnly when client is not on the list', () => {
    const row: CtvCommissionRow = {
      id: 'e-3',
      client_id: 'client-zz',
      client_name: 'ZZ Commission Only',
      service_name: '1cc Filler Hàn',
      amount: 72700,
      source: 'ctv',
      lob: 'cosmetic',
      earned_at: '2026-06-14',
      status: 'reversed',
      attribution_kind: 'service_attached',
      level: 0,
    };
    const target = resolveCommissionNavigateTarget(row, [referral]);
    expect(target?.tab).toBe('tracking');
    if (target?.tab === 'tracking') {
      expect(target.focus.clientId).toBe('client-zz');
      expect(target.focus.commissionHistoryOnly).toBe(true);
    }
  });

  it('returns null when no client id can be resolved', () => {
    const row: CtvCommissionRow = {
      id: 'e-4',
      client_name: null,
      service_name: 'Mystery service',
      amount: 1000,
      source: 'ctv',
      lob: 'cosmetic',
      earned_at: '2026-06-14',
      status: 'pending',
      attribution_kind: 'service_attached',
      level: 0,
    };
    expect(resolveCommissionNavigateTarget(row, [referral])).toBeNull();
  });
});