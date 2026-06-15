/**
 * @crossref:domain[ctv]
 * @crossref:used-in[website/src/pages/CTV/CtvDashboard.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts, website/src/pages/CTV/ctvTrackingFocus.ts]
 */
import type { CtvCommissionRow, CtvReferral } from '@/lib/api/ctv';
import { normalizeText } from '@/lib/utils';
import { ctvClientIdsMatch, type CtvTrackingFocus } from './ctvTrackingFocus';

export type CtvCommissionAttributionKind = 'own_referral' | 'service_attached' | 'downline_override';

export interface CtvNetworkFocus {
  readonly downlineCtvId: string;
  readonly downlineCtvName?: string | null;
  readonly clientName?: string | null;
  readonly serviceName?: string | null;
  readonly amount?: number;
  readonly overrideLevel?: number;
  readonly lob?: CtvCommissionRow['lob'];
  readonly earningId?: string;
}

export type CtvCommissionNavigateTarget =
  | { readonly tab: 'tracking'; readonly focus: CtvTrackingFocus; readonly row: CtvCommissionRow }
  | { readonly tab: 'network'; readonly focus: CtvNetworkFocus; readonly row: CtvCommissionRow };

function resolveClientId(row: CtvCommissionRow, referrals: CtvReferral[]): string {
  const direct = row.client_id?.trim() || '';
  if (direct) return direct;
  if (!row.client_name) return '';
  const needle = normalizeText(row.client_name);
  const matched = referrals.find((referral) => normalizeText(referral.name ?? '') === needle);
  return matched?.id?.trim() ?? '';
}

export function resolveCommissionNavigateTarget(
  row: CtvCommissionRow,
  referrals: CtvReferral[]
): CtvCommissionNavigateTarget | null {
  const clientId = resolveClientId(row, referrals);
  const hasDownline =
    row.attribution_kind === 'downline_override' && !!row.attributed_ctv_id?.trim();

  if (hasDownline) {
    return {
      tab: 'network',
      focus: {
        downlineCtvId: row.attributed_ctv_id!.trim(),
        downlineCtvName: row.attributed_ctv_name,
        clientName: row.client_name,
        serviceName: row.service_name,
        amount: row.amount,
        overrideLevel: row.override_level ?? row.level ?? 1,
        lob: row.lob,
        earningId: row.id,
      },
      row,
    };
  }

  if (!clientId) return null;

  const onTracking = referrals.some((referral) => ctvClientIdsMatch(referral.id, clientId));

  return {
    tab: 'tracking',
    focus: {
      clientId,
      serviceLineId: row.service_line_id ?? null,
      clientName: row.client_name,
      serviceName: row.service_name,
      lob: row.lob,
      amount: row.amount,
      status: row.status,
      earnedAt: row.earned_at,
      commissionHistoryOnly: !onTracking,
    },
    row,
  };
}

export function ctvDownlineDomId(ctvId: string): string {
  return `ctv-downline-${ctvId.trim().toLowerCase()}`;
}