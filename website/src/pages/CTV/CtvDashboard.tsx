import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
import { CtvReferModal } from '@/components/ctv/CtvReferModal';
import { CtvRecruitModal } from '@/components/ctv/CtvRecruitModal';

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
  const [referOpen, setReferOpen] = useState(false);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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

  useEffect(() => {
    let previousY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousY;

      if (currentY < 24) {
        setIsHeaderHidden(false);
      } else if (delta > 8) {
        setIsHeaderHidden(true);
      } else if (delta < -8) {
        setIsHeaderHidden(false);
      }

      previousY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const isAccountTab = activeTab === 'me';
  const effectiveHeaderHidden = !isAccountTab && isHeaderHidden;

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-gray-900">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbfaf8] pb-24 shadow-xl shadow-gray-200/70">
        <div className={cn('px-3 pt-3', isAccountTab ? 'relative z-10' : 'sticky top-0 z-20')}>
          <motion.header
            data-testid="ctv-motion-header"
            data-scroll-state={effectiveHeaderHidden ? 'hidden' : 'visible'}
            aria-label={t('header.portalMenu')}
            initial={false}
            animate={
              shouldReduceMotion
                ? { opacity: 1, scale: 1, y: 0 }
                : {
                    opacity: effectiveHeaderHidden ? 0 : 1,
                    scale: effectiveHeaderHidden ? 0.98 : 1,
                    y: effectiveHeaderHidden ? -112 : 0,
                  }
            }
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
            onFocusCapture={() => setIsHeaderHidden(false)}
            className="relative overflow-visible rounded-[28px] bg-orange-500 px-3.5 py-3 text-white shadow-[0_14px_32px_rgba(194,65,12,0.24)] ring-1 ring-orange-300/50"
          >
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/40" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-100">{t('brand')}</p>
                <h1 className="mt-0.5 truncate text-base font-bold leading-snug">{t('portal')}</h1>
                <p className="mt-0.5 truncate text-xs font-semibold text-orange-100">
                  {t('hello', { name: profileName })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="[&>div>button]:h-9 [&>div>button]:w-9 [&>div>button]:rounded-full [&>div>button]:bg-white/15 [&>div>button]:text-white [&>div>button]:ring-1 [&>div>button]:ring-white/25 [&>div>button]:hover:bg-white/25 [&>div>button]:hover:text-white">
                  <LanguageToggle compact menuPlacement="below" />
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
                  aria-label={t('notifications')}
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              role="group"
              aria-label={t('quickActions')}
              className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/15 p-1 ring-1 ring-white/20"
            >
              <button
                type="button"
                onClick={() => setReferOpen(true)}
                className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-orange-700 shadow-[0_8px_18px_rgba(194,65,12,0.18)] transition-transform active:scale-[0.98]"
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('forms.referClient.title')}</span>
              </button>
              <button
                type="button"
                onClick={() => setRecruitOpen(true)}
                className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-bold text-white ring-1 ring-white/20 transition-colors active:scale-[0.98] hover:bg-white/20"
              >
                <Network className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('forms.recruitCtv.title')}</span>
              </button>
            </div>
          </motion.header>
        </div>

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
          {activeTab === 'me' ? <CtvMeTab profile={profile} onProfileUpdated={setProfile} /> : null}
        </section>

        <CtvReferModal
          open={referOpen}
          onClose={() => setReferOpen(false)}
          onSuccess={() => {
            setActiveTab('tracking');
            void loadDashboard();
          }}
        />
        <CtvRecruitModal
          open={recruitOpen}
          onClose={() => setRecruitOpen(false)}
          onSuccess={() => {
            setActiveTab('network');
            setHierarchy(null);
            void loadHierarchy();
          }}
        />

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
