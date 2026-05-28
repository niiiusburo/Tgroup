import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Home, ListChecks, Network, UserRound, Wallet } from 'lucide-react';

import { LanguageToggle } from '@/components/shared/LanguageToggle';
import {
  fetchCtvCommissionSummary,
  fetchCtvHierarchy,
  fetchCtvProfile,
  fetchCtvReferrals,
  type CtvCommissionSummary,
  type CtvHierarchyResponse,
  type CtvProfile,
  type CtvReferral,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { CtvCommissionTab } from './tabs/CtvCommissionTab';
import { CtvHomeTab } from './tabs/CtvHomeTab';
import { CtvMeTab } from './tabs/CtvMeTab';
import { CtvNetworkTab } from './tabs/CtvNetworkTab';
import { CtvTrackingTab } from './tabs/CtvTrackingTab';

type TabKey = 'home' | 'commission' | 'tracking' | 'network' | 'me';

const TABS: Array<{
  key: TabKey;
  labelKey: string;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { key: 'home', labelKey: 'tabs.home', Icon: Home },
  { key: 'commission', labelKey: 'tabs.commission', Icon: Wallet },
  { key: 'tracking', labelKey: 'tabs.referrals', Icon: ListChecks },
  { key: 'network', labelKey: 'tabs.network', Icon: Network },
  { key: 'me', labelKey: 'tabs.me', Icon: UserRound },
];

export default function CtvDashboard() {
  const { t, i18n } = useTranslation('ctv');
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [referrals, setReferrals] = useState<CtvReferral[]>([]);
  const [summary, setSummary] = useState<CtvCommissionSummary | null>(null);
  const [profile, setProfile] = useState<CtvProfile | null>(null);
  const [hierarchy, setHierarchy] = useState<CtvHierarchyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHierarchyLoading, setIsHierarchyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

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
      setReferrals([]);
      setError(referralsResult.reason instanceof Error ? referralsResult.reason.message : 'CTV data could not load');
    }

    setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
    setIsLoading(false);
  }, []);

  const loadHierarchy = useCallback(async () => {
    setIsHierarchyLoading(true);
    setHierarchyError(null);

    try {
      const data = await fetchCtvHierarchy();
      if (!isMountedRef.current) return;
      setHierarchy(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      setHierarchy(null);
      setHierarchyError(err instanceof Error ? err.message : 'Please try again in a few minutes.');
    } finally {
      if (isMountedRef.current) setIsHierarchyLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadDashboard();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'network' && !hierarchy && !isHierarchyLoading) {
      void loadHierarchy();
    }
  }, [activeTab, hierarchy, isHierarchyLoading, loadHierarchy]);

  const profileName = profile?.name || t('profileFallback');
  const isVietnamese = i18n.language?.startsWith('vi');
  const tabFallbacks: Record<TabKey, string> = {
    home: isVietnamese ? 'Tổng quan' : 'Home',
    commission: isVietnamese ? 'Hoa hồng' : 'Commission',
    tracking: t('tabs.referrals'),
    network: isVietnamese ? 'Mạng lưới' : 'Network',
    me: isVietnamese ? 'Tôi' : 'Me',
  };
  const activeTitle = useMemo(() => {
    if (activeTab === 'home') return t('portal');
    if (activeTab === 'commission') return t('commission.myCommission', { defaultValue: isVietnamese ? 'Hoa hồng của tôi' : 'My commission' });
    if (activeTab === 'network') return t('hierarchy.title');
    if (activeTab === 'me') return t('header.meTitle', { defaultValue: isVietnamese ? 'Tài khoản' : 'Account' });
    return t('title');
  }, [activeTab, isVietnamese, t]);

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-gray-900">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf8] pb-24 shadow-xl shadow-gray-200/70">
        <header className="sticky top-0 z-20 bg-orange-500 px-5 pb-4 pt-4 text-white shadow-lg shadow-orange-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-100">{t('brand')}</p>
              <h1 className="mt-1 truncate text-lg font-bold">{t('portal')}</h1>
              <p className="mt-1 truncate text-xs font-semibold text-orange-100">
                {t('hello', { name: profileName })}
              </p>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <LanguageToggle compact dropdownPlacement="below" />
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20"
                aria-label={t('notifications')}
              >
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              aria-pressed={activeTab === 'tracking'}
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors',
                activeTab === 'tracking'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'bg-white/15 text-white ring-1 ring-white/25'
              )}
            >
              <ListChecks className="h-4 w-4" />
              {t('summary.referredClients')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('network')}
              aria-pressed={activeTab === 'network'}
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-colors',
                activeTab === 'network'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'bg-white/15 text-white ring-1 ring-white/25'
              )}
            >
              <Network className="h-4 w-4" />
              {t('tabs.recruiting')}
            </button>
          </div>
        </header>

        <section className="px-5 py-5">
          <h2 className="sr-only">{activeTitle}</h2>

          {activeTab === 'home' ? (
            <CtvHomeTab summary={summary} referrals={referrals} profileName={profileName} isLoading={isLoading} />
          ) : null}
          {activeTab === 'commission' ? <CtvCommissionTab summary={summary} isLoading={isLoading} /> : null}
          {activeTab === 'tracking' ? (
            <CtvTrackingTab
              referrals={referrals}
              isLoading={isLoading}
              error={error}
              onRetry={() => void loadDashboard()}
            />
          ) : null}
          {activeTab === 'network' ? (
            <CtvNetworkTab
              hierarchy={hierarchy}
              isLoading={isHierarchyLoading}
              error={hierarchyError}
              onRetry={() => void loadHierarchy()}
            />
          ) : null}
          {activeTab === 'me' ? <CtvMeTab profile={profile} /> : null}
        </section>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 shadow-[0_-2px_10px_rgba(249,115,22,0.05)] backdrop-blur">
          <div className="mx-auto flex max-w-[430px]">
            {TABS.map(({ key, labelKey, Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-tight transition-colors',
                    active ? 'text-orange-600' : 'text-gray-400'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={cn('grid h-7 w-10 place-items-center rounded-full', active ? 'bg-orange-100' : '')}>
                    <Icon className={cn('h-5 w-5', active ? 'stroke-[2.5]' : '')} />
                  </span>
                  <span className="max-w-[4.5rem] text-center">{t(labelKey, { defaultValue: tabFallbacks[key] })}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
