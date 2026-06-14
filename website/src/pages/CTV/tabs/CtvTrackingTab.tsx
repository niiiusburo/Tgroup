/**
 * @crossref:domain[ctv]
 * @crossref:used-in[referral tracking tab of website/src/pages/CTV/CtvDashboard.tsx (CTV portal /ctv); receives focus handoff from commission tab]
 * @crossref:uses[website/src/components/ctv/ReferralFlipCard.tsx, website/src/lib/api.ts (CtvReferral type, stage_progress semantics), website/src/lib/utils.ts (normalizeText), product-map/domains/ctv.yaml]
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, ListChecks, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ReferralFlipCard } from '@/components/ctv/ReferralFlipCard';
import type { CtvReferral } from '@/lib/api';
import { cn, normalizeText } from '@/lib/utils';
import {
  ctvClientIdsMatch,
  ctvReferralDomId,
  resolveReferralsForFocus,
  type CtvTrackingFocus,
} from '@/pages/CTV/ctvTrackingFocus';

type FilterKey = 'all' | 'active' | 'completed' | 'waitingPayment';

interface CtvTrackingTabProps {
  readonly referrals: CtvReferral[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly focus?: CtvTrackingFocus | null;
  readonly onFocusClear?: () => void;
}

function isCompleted(referral: CtvReferral): boolean {
  // Prefer the server's activity-based stage: a client who has paid is "completed",
  // even when no itemized service line exists (e.g. deposit-only payment).
  if (typeof referral.stage_progress === 'number') return referral.stage_progress >= 4;
  const services = referral.services ?? [];
  return services.length > 0 && services.every((service) => service.status === 'paid');
}

function isWaitingPayment(referral: CtvReferral): boolean {
  // Serviced but not yet paid.
  if (typeof referral.stage_progress === 'number') return referral.stage_progress === 3;
  return (referral.services ?? []).some((service) => service.status === 'pending');
}

function matchesFilter(referral: CtvReferral, filter: FilterKey): boolean {
  if (filter === 'completed') return isCompleted(referral);
  if (filter === 'waitingPayment') return isWaitingPayment(referral);
  if (filter === 'active') return !isCompleted(referral);
  return true;
}

function matchesSearch(referral: CtvReferral, searchTerm: string): boolean {
  const query = normalizeText(searchTerm.trim());
  if (!query) return true;
  const serviceNames = (referral.services ?? []).map((service) => service.serviceName).join(' ');
  return normalizeText(`${referral.name} ${referral.phone} ${serviceNames}`).includes(query);
}

function LoadingList() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white p-4" />
      ))}
    </div>
  );
}

function EmptyState({ title, body, icon }: { readonly title: string; readonly body: string; readonly icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-orange-50 text-orange-500">{icon}</div>
      <h3 className="mt-4 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}

export function CtvTrackingTab({
  referrals,
  isLoading,
  error,
  onRetry,
  focus = null,
  onFocusClear,
}: CtvTrackingTabProps) {
  const { t } = useTranslation('ctv');
  const [searchTerm, setSearchTerm] = useState(() => focus?.clientName ?? '');
  const [filter, setFilter] = useState<FilterKey>('all');
  const resolvedReferrals = useMemo(
    () => resolveReferralsForFocus(referrals, focus),
    [focus, referrals]
  );

  useEffect(() => {
    if (!focus?.clientId) return;
    if (focus.clientName) setSearchTerm(focus.clientName);
    setFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [focus?.clientId, focus?.clientName, focus?.serviceLineId, focus?.serviceName]);

  useEffect(() => {
    if (!focus?.clientId || isLoading) return;
    const timer = window.setTimeout(() => {
      document.getElementById(ctvReferralDomId(focus.clientId))?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [focus?.clientId, focus?.serviceLineId, focus?.serviceName, isLoading, referrals.length]);

  const filteredReferrals = useMemo(() => {
    const filtered = resolvedReferrals.filter(
      (referral) => matchesFilter(referral, filter) && matchesSearch(referral, searchTerm)
    );
    if (!focus?.clientId) return filtered;
    const focused = resolvedReferrals.find((referral) => ctvClientIdsMatch(referral.id, focus.clientId));
    if (!focused || filtered.some((referral) => ctvClientIdsMatch(referral.id, focused.id))) return filtered;
    return [focused, ...filtered];
  }, [filter, focus?.clientId, resolvedReferrals, searchTerm]);

  const filterCounts = useMemo(
    () => ({
      all: resolvedReferrals.length,
      active: resolvedReferrals.filter((referral) => !isCompleted(referral)).length,
      completed: resolvedReferrals.filter(isCompleted).length,
      waitingPayment: resolvedReferrals.filter(isWaitingPayment).length,
    }),
    [resolvedReferrals]
  );

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'active', label: t('filters.active') },
    { key: 'completed', label: t('filters.completed') },
    { key: 'waitingPayment', label: t('filters.waitingPayment') },
  ];
  const hasSearchOrFilter = searchTerm.trim().length > 0 || filter !== 'all';

  const focusReferral = focus?.clientId
    ? resolvedReferrals.find((referral) => ctvClientIdsMatch(referral.id, focus.clientId)) ?? null
    : null;
  const searchHighlighted = !!focus?.clientId;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t('subtitle')}</p>

      {focus ? (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
                {t('tracking.focusBreadcrumb')}
              </p>
              <p className="mt-1 truncate font-semibold">
                {focus.clientName || focusReferral?.name || t('tracking.unknownClient')}
                {focus.serviceName ? ` · ${focus.serviceName}` : null}
              </p>
              <p className="mt-1 text-xs text-orange-800/80">
                {focusReferral ? t('tracking.focusHint') : t('tracking.focusMissingClient')}
              </p>
            </div>
            {onFocusClear ? (
              <button
                type="button"
                onClick={onFocusClear}
                className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-200"
              >
                {t('tracking.clearFocus')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <label
        className={cn(
          'mt-4 flex h-12 items-center gap-3 rounded-2xl border bg-white px-4 text-sm shadow-sm shadow-gray-200/40 transition-colors',
          searchHighlighted
            ? 'border-orange-300 bg-orange-50/70 ring-2 ring-orange-200'
            : 'border-gray-200'
        )}
      >
        <Search className={cn('h-4 w-4 shrink-0', searchHighlighted ? 'text-orange-500' : 'text-gray-400')} />
        <span className="sr-only">{t('searchLabel')}</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
        />
      </label>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors',
                selected
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:text-orange-600'
              )}
            >
              {item.label}
              <span className={cn('ml-1 font-semibold', selected ? 'text-orange-100' : 'text-gray-400')}>
                {filterCounts[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <>
            <p className="sr-only">{t('loading')}</p>
            <LoadingList />
          </>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-white px-5 py-8 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-gray-900">{t('errorTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">{error || t('errorBody')}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-gray-900 px-4 text-xs font-bold text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('retry')}
            </button>
          </div>
        ) : filteredReferrals.length > 0 ? (
          <div className="space-y-3">
            {filteredReferrals.map((referral) => {
              const isFocused = ctvClientIdsMatch(focus?.clientId, referral.id);
              return (
                <ReferralFlipCard
                  key={
                    isFocused
                      ? `focus-${focus?.clientId}-${focus?.serviceLineId ?? focus?.serviceName ?? 'client'}`
                      : `${referral.id}:${referral.lobs.join('-')}`
                  }
                  referral={referral}
                  initialFlipped={isFocused}
                  focus={isFocused ? focus : null}
                />
              );
            })}
          </div>
        ) : hasSearchOrFilter ? (
          <EmptyState icon={<Search className="h-5 w-5" />} title={t('noSearchTitle')} body={t('noSearchBody')} />
        ) : (
          <EmptyState icon={<ListChecks className="h-5 w-5" />} title={t('emptyTitle')} body={t('emptyBody')} />
        )}
      </div>
    </div>
  );
}
