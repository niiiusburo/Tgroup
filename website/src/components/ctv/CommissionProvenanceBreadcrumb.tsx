/**
 * @crossref:domain[ctv]
 * @crossref:used-in[website/src/pages/CTV/tabs/CtvHomeTab.tsx, CtvCommissionTab.tsx, CtvTrackingTab.tsx, CtvNetworkTab.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (CtvCommissionRow), product-map/domains/ctv.yaml]
 */
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { CtvCommissionRow } from '@/lib/api/ctv';
import { useCtvLocale } from '@/lib/i18n/ctv';
import { cn } from '@/lib/utils';

interface CommissionProvenanceBreadcrumbProps {
  readonly row: Pick<
    CtvCommissionRow,
    | 'attribution_kind'
    | 'attributed_ctv_name'
    | 'client_name'
    | 'service_name'
    | 'override_level'
    | 'level'
    | 'lob'
  >;
  readonly compact?: boolean;
  readonly className?: string;
}

function Crumb({
  label,
  accent,
  compact,
}: {
  readonly label: string;
  readonly accent?: boolean;
  readonly compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[9rem] truncate rounded-md px-1.5 py-0.5 font-semibold',
        compact ? 'text-[10px]' : 'text-[11px]',
        accent ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function CommissionProvenanceBreadcrumb({
  row,
  compact = false,
  className,
}: CommissionProvenanceBreadcrumbProps) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const kind = row.attribution_kind ?? 'service_attached';
  const clientLabel = row.client_name || ctv.unknownClient();
  const serviceLabel = row.service_name || ctv.unknownService();
  const downlineLabel = row.attributed_ctv_name || t('provenance.unknownDownline');
  const overrideLevel = row.override_level ?? row.level ?? 1;

  const segments: Array<{ key: string; label: string; accent?: boolean }> = [];

  if (kind === 'downline_override') {
    segments.push(
      { key: 'downline', label: downlineLabel, accent: true },
      { key: 'client', label: clientLabel },
      { key: 'service', label: serviceLabel },
      {
        key: 'you',
        label: t('provenance.yourOverride', { level: overrideLevel }),
        accent: true,
      }
    );
  } else if (kind === 'own_referral') {
    segments.push(
      { key: 'you', label: t('provenance.youReferred'), accent: true },
      { key: 'client', label: clientLabel },
      { key: 'service', label: serviceLabel }
    );
  } else {
    segments.push(
      { key: 'you', label: t('provenance.youOnServiceCard'), accent: true },
      { key: 'client', label: clientLabel },
      { key: 'service', label: serviceLabel }
    );
  }

  const kindBadge =
    kind === 'downline_override'
      ? t('provenance.kindDownline')
      : kind === 'own_referral'
        ? t('provenance.kindReferral')
        : t('provenance.kindServiceCard');

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 font-bold uppercase tracking-wide',
            compact ? 'text-[9px]' : 'text-[10px]',
            kind === 'downline_override'
              ? 'bg-emerald-100 text-emerald-800'
              : kind === 'own_referral'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-amber-100 text-amber-900'
          )}
        >
          {kindBadge}
        </span>
        {row.lob ? (
          <span className={cn('font-medium text-gray-400', compact ? 'text-[10px]' : 'text-xs')}>
            {ctv.getLobLabel(row.lob)}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'mt-1 flex min-w-0 flex-wrap items-center gap-0.5 text-gray-600',
          compact ? 'text-[10px]' : 'text-xs'
        )}
        aria-label={t('provenance.ariaTrail')}
      >
        {segments.map((segment, index) => (
          <span key={segment.key} className="inline-flex min-w-0 items-center gap-0.5">
            {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" aria-hidden /> : null}
            <Crumb label={segment.label} accent={segment.accent} compact={compact} />
          </span>
        ))}
      </div>
    </div>
  );
}