import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Bell,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { ReferralFlipCard } from '@/components/ctv/ReferralFlipCard';
import { ReferClientModal } from '@/components/ctv/ReferClientModal';
import { formatVND } from '@/lib/formatting';
import { cn, normalizeText } from '@/lib/utils';
import {
  fetchCtvCommissionSummary,
  fetchCtvProfile,
  fetchCtvReferrals,
  type CtvCommissionSummary,
  type CtvProfile,
  type CtvReferral,
} from '@/lib/api';

type FilterKey = 'all' | 'active' | 'completed' | 'waitingPayment';

function isCompleted(referral: CtvReferral): boolean {
  const services = referral.services ?? [];
  return services.length > 0 && services.every((service) => service.status === 'paid');
}

function isWaitingPayment(referral: CtvReferral): boolean {
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

function getFallbackPending(referrals: CtvReferral[]): number {
  return referrals.reduce(
    (total, referral) =>
      total + (referral.services ?? [])
        .filter((service) => service.status === 'pending')
        .reduce((subtotal, service) => subtotal + service.amount, 0),
    0
  );
}

function getFallbackPaid(referrals: CtvReferral[]): number {
  return referrals.reduce(
    (total, referral) =>
      total + (referral.services ?? [])
        .filter((service) => service.status === 'paid')
        .reduce((subtotal, service) => subtotal + service.amount, 0),
    0
  );
}

function LoadingList() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((step) => (
              <div key={step} className="mx-auto h-11 w-12 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  icon,
}: {
  readonly title: string;
  readonly body: string;
  readonly icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-orange-50 text-orange-500">
        {icon}
      </div>
      <h2 className="mt-4 text-sm font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}

export function CtvDashboard() {
  const { t } = useTranslation('ctv');
  const isMountedRef = useRef(true);
  const [referrals, setReferrals] = useState<CtvReferral[]>([]);
  const [summary, setSummary] = useState<CtvCommissionSummary | null>(null);
  const [profile, setProfile] = useState<CtvProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReferModal, setShowReferModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [referralsResult, summaryResult, profileResult] = await Promise.allSettled([
      fetchCtvReferrals(),
      fetchCtvCommissionSummary(),
      fetchCtvProfile(),
    ]);

    if (!isMountedRef.current) return;

    if (referralsResult.status === 'fulfilled') {
      setReferrals(referralsResult.value.referrals);
    } else {
      setError(referralsResult.reason instanceof Error ? referralsResult.reason.message : null);
      setReferrals([]);
    }

    setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadDashboard();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadDashboard]);

  const filteredReferrals = useMemo(
    () => referrals.filter((referral) => matchesFilter(referral, filter) && matchesSearch(referral, searchTerm)),
    [filter, referrals, searchTerm]
  );

  const filterCounts = useMemo(
    () => ({
      all: referrals.length,
      active: referrals.filter((referral) => !isCompleted(referral)).length,
      completed: referrals.filter(isCompleted).length,
      waitingPayment: referrals.filter(isWaitingPayment).length,
    }),
    [referrals]
  );

  const pendingTotal = summary?.totals.pending ?? getFallbackPending(referrals);
  const paidTotal = summary?.totals.paid ?? getFallbackPaid(referrals);
  const profileName = profile?.name || t('profileFallback');
  const hasSearchOrFilter = searchTerm.trim().length > 0 || filter !== 'all';

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'active', label: t('filters.active') },
    { key: 'completed', label: t('filters.completed') },
    { key: 'waitingPayment', label: t('filters.waitingPayment') },
  ];

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-gray-900">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf8] shadow-xl shadow-gray-200/70">
        <header className="bg-orange-500 px-5 pb-4 pt-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-100">{t('brand')}</p>
              <h1 className="mt-1 text-lg font-bold">{t('portal')}</h1>
              <p className="mt-1 text-xs font-semibold text-orange-100">{t('hello', { name: profileName })}</p>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20"
              aria-label={t('notifications')}
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowReferModal(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-orange-600 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              {t('tabs.referrals')}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 text-sm font-bold text-white ring-1 ring-white/25"
            >
              <Sparkles className="h-4 w-4" />
              {t('tabs.recruiting')}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
            <div className="rounded-xl bg-white/12 px-3 py-2">
              <p className="text-orange-100">{t('summary.clients')}</p>
              <p className="mt-1 text-base text-white">{referrals.length}</p>
            </div>
            <div className="rounded-xl bg-white/12 px-3 py-2">
              <p className="text-orange-100">{t('summary.pending')}</p>
              <p className="mt-1 truncate text-base text-white">{formatVND(pendingTotal)}</p>
            </div>
            <div className="rounded-xl bg-white/12 px-3 py-2">
              <p className="text-orange-100">{t('summary.paid')}</p>
              <p className="mt-1 truncate text-base text-white">{formatVND(paidTotal)}</p>
            </div>
          </div>
        </header>

        <section className="px-5 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">{t('subtitle')}</p>
          </div>

          <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 text-sm shadow-sm shadow-gray-200/40">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
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
                <h2 className="mt-4 text-sm font-bold text-gray-900">{t('errorTitle')}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">{error || t('errorBody')}</p>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-gray-900 px-4 text-xs font-bold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('retry')}
                </button>
              </div>
            ) : filteredReferrals.length > 0 ? (
              <div className="space-y-3">
                {filteredReferrals.map((referral) => (
                  <ReferralFlipCard key={`${referral.id}:${referral.lobs.join('-')}`} referral={referral} />
                ))}
              </div>
            ) : hasSearchOrFilter ? (
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title={t('noSearchTitle')}
                body={t('noSearchBody')}
              />
            ) : (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title={t('emptyTitle')}
                body={t('emptyBody')}
              />
            )}
          </div>
        </section>
      </div>

      {showReferModal && (
        <ReferClientModal
          onClose={() => setShowReferModal(false)}
          onSuccess={() => void loadDashboard()}
        />
      )}
    </main>
  );
}

export default CtvDashboard;
