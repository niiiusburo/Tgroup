/**
 * @crossref:domain[earnings-commissions]
 * @crossref:used-in[commission nav/link helpers: website/src/pages/Commission.tsx, website/src/pages/Customers.tsx, website/src/components/commission/EarningsPayoutsTabs.tsx, website/src/components/commission/NewClientsTab.tsx]
 * @crossref:uses[website/src/components/commission/CommissionFlowTabs.tsx, website/src/contexts/BusinessUnitContext.tsx, website/src/lib/utils.ts, product-map/domains/earnings-commissions.yaml]
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeDollarSign, ChevronRight, ExternalLink, Stethoscope, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useBusinessUnitOptional } from '@/contexts/BusinessUnitContext';
import type { CommissionTabType } from './CommissionFlowTabs';

export type CommissionLob = 'dental' | 'cosmetic' | 'all';

export const COMMISSION_TABS: readonly CommissionTabType[] = ['config', 'ctvs', 'discountCodes', 'newClients', 'earnings', 'payouts'];

export function isCommissionTab(value: string | null | undefined): value is CommissionTabType {
  return Boolean(value && COMMISSION_TABS.includes(value as CommissionTabType));
}

export function buildCommissionPath(tab: CommissionTabType, lob?: CommissionLob) {
  const params = new URLSearchParams({ tab });
  if (lob && lob !== 'all') params.set('lob', lob);
  return `/commission?${params.toString()}`;
}

export function buildCustomerProfilePath({
  clientId,
  tab = 'profile',
  serviceLineId,
  returnTab,
  lob,
}: {
  readonly clientId?: string | null;
  readonly tab?: 'profile' | 'appointments' | 'records' | 'payment';
  readonly serviceLineId?: string | null;
  readonly returnTab?: CommissionTabType;
  readonly lob?: CommissionLob;
}) {
  if (!clientId) return '';
  const params = new URLSearchParams({ tab, from: 'commission' });
  if (serviceLineId) params.set('serviceLineId', serviceLineId);
  if (returnTab) params.set('returnTab', returnTab);
  if (lob && lob !== 'all') params.set('lob', lob);
  return `/customers/${clientId}?${params.toString()}`;
}

export function CommissionTabHeader({
  tab,
  count,
  description,
  nextTab,
  previousTab,
}: {
  readonly tab: CommissionTabType;
  readonly count?: string;
  readonly description?: string;
  readonly nextTab?: CommissionTabType;
  readonly previousTab?: CommissionTabType;
}) {
  const { t } = useTranslation('commission');
  const businessUnit = useBusinessUnitOptional();
  const activeLob = businessUnit?.currentLOB;

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Link to={buildCommissionPath('config', activeLob)} className="hover:text-primary">
            {t('title')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-gray-900">{t(`tabs.${tab}`)}</span>
          {count ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{count}</span> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {previousTab ? (
          <Link
            to={buildCommissionPath(previousTab, activeLob)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(`tabs.${previousTab}`)}
          </Link>
        ) : null}
        {nextTab ? (
          <Link
            to={buildCommissionPath(nextTab, activeLob)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            {t(`tabs.${nextTab}`)}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ClientProfileLink({
  clientId,
  name,
  returnTab,
  lob,
  className,
}: {
  readonly clientId?: string | null;
  readonly name?: string | null;
  readonly returnTab: CommissionTabType;
  readonly lob?: CommissionLob;
  readonly className?: string;
}) {
  const label = name || '-';
  const path = buildCustomerProfilePath({ clientId, tab: 'profile', returnTab, lob });
  if (!path) return <span className={className}>{label}</span>;

  return (
    <Link
      to={path}
      className={cn('inline-flex min-w-0 items-center gap-1.5 font-semibold text-gray-900 transition-colors hover:text-primary hover:underline', className)}
    >
      <UserRound className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
    </Link>
  );
}

export function ServiceDrilldownLink({
  clientId,
  serviceLineId,
  serviceName,
  returnTab,
  lob,
  className,
}: {
  readonly clientId?: string | null;
  readonly serviceLineId?: string | null;
  readonly serviceName?: string | null;
  readonly returnTab: CommissionTabType;
  readonly lob?: CommissionLob;
  readonly className?: string;
}) {
  const label = serviceName || '-';
  const path = buildCustomerProfilePath({ clientId, tab: 'records', serviceLineId, returnTab, lob });
  if (!path || !serviceLineId) return <span className={className}>{label}</span>;

  return (
    <Link
      to={path}
      className={cn('inline-flex min-w-0 items-center gap-1.5 text-gray-800 transition-colors hover:text-primary hover:underline', className)}
    >
      <Stethoscope className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
    </Link>
  );
}

export function CommissionReturnTrail({
  returnTab,
  serviceLineId,
  lob,
}: {
  readonly returnTab?: string | null;
  readonly serviceLineId?: string | null;
  readonly lob?: string | null;
}) {
  const { t } = useTranslation('commission');
  const targetTab = isCommissionTab(returnTab) ? returnTab : 'newClients';
  const targetLob = lob === 'dental' || lob === 'cosmetic' ? lob : undefined;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-orange-700">
            <Link to={buildCommissionPath('config', targetLob)} className="hover:underline">
              {t('title')}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-orange-300" />
            <Link to={buildCommissionPath(targetTab, targetLob)} className="hover:underline">
              {t(`tabs.${targetTab}`)}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-orange-300" />
            <span className="text-orange-950">{serviceLineId ? t('breadcrumbs.serviceDetail') : t('breadcrumbs.clientProfile')}</span>
          </div>
          <p className="mt-1 text-sm text-orange-900">{t('breadcrumbs.returnHint')}</p>
        </div>
        <Link
          to={buildCommissionPath(targetTab, targetLob)}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-orange-700 ring-1 ring-orange-200 transition-colors hover:bg-orange-100"
        >
          <BadgeDollarSign className="h-4 w-4" />
          {t('breadcrumbs.backToCommission')}
        </Link>
      </div>
    </div>
  );
}
