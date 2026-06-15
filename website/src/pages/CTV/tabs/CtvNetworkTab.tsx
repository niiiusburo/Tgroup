/**
 * @crossref:domain[ctv]
 * @crossref:used-in[network tab of website/src/pages/CTV/CtvDashboard.tsx (CTV portal /ctv)]
 * @crossref:uses[website/src/components/ctv/CtvHierarchyPanel.tsx, website/src/components/ctv/CtvQrDiscountPanel.tsx, website/src/lib/api/ctv.ts (CtvHierarchyResponse type), website/src/lib/api/ctvSelf.ts (CtvProfile type), product-map/domains/ctv.yaml]
 */
import { useEffect, useState } from 'react';
import { Network, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CommissionProvenanceBreadcrumb } from '@/components/ctv/CommissionProvenanceBreadcrumb';
import { CtvHierarchyPanel } from '@/components/ctv/CtvHierarchyPanel';
import { CtvQrDiscountPanel } from '@/components/ctv/CtvQrDiscountPanel';
import type { CtvCommissionRow, CtvHierarchyResponse } from '@/lib/api/ctv';
import type { CtvProfile } from '@/lib/api/ctvSelf';
import type { CtvNetworkFocus } from '@/pages/CTV/ctvCommissionNavigate';
import { cn } from '@/lib/utils';

type ReferralSubTab = 'network' | 'qr';

interface CtvNetworkTabProps {
  readonly hierarchy: CtvHierarchyResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly profile: CtvProfile | null;
  readonly profileName: string;
  readonly focus?: CtvNetworkFocus | null;
  readonly commissionSource?: CtvCommissionRow | null;
  readonly onFocusClear?: () => void;
}

export function CtvNetworkTab({
  hierarchy,
  isLoading,
  error,
  onRetry,
  profile,
  profileName,
  focus = null,
  commissionSource = null,
  onFocusClear,
}: CtvNetworkTabProps) {
  const { t } = useTranslation('ctv');
  const [subTab, setSubTab] = useState<ReferralSubTab>('network');

  useEffect(() => {
    if (focus?.downlineCtvId) setSubTab('network');
  }, [focus?.downlineCtvId, focus?.earningId]);

  const subTabs: Array<{ key: ReferralSubTab; label: string; Icon: typeof Network }> = [
    { key: 'network', label: t('referralQr.subTabs.network'), Icon: Network },
    { key: 'qr', label: t('referralQr.subTabs.qr'), Icon: QrCode },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{t('referralQr.pageTitle')}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t('referralQr.pageSubtitle')}</p>

      <div
        role="tablist"
        aria-label={t('referralQr.subTabList')}
        className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm shadow-gray-200/40"
      >
        {subTabs.map(({ key, label, Icon }) => {
          const selected = subTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSubTab(key)}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors',
                selected
                  ? 'bg-orange-500 text-white shadow-[0_8px_18px_rgba(234,88,12,0.22)]'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4" role="tabpanel">
        {subTab === 'network' ? (
          <div>
            <h3 className="sr-only">{t('hierarchy.title')}</h3>
            <p className="sr-only">{t('hierarchy.subtitle')}</p>
            {focus ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                      {t('network.focusBreadcrumb')}
                    </p>
                    <p className="mt-1 truncate font-semibold">
                      {focus.downlineCtvName || t('provenance.unknownDownline')}
                      {focus.clientName ? ` → ${focus.clientName}` : null}
                      {focus.serviceName ? ` · ${focus.serviceName}` : null}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/80">{t('network.focusHint')}</p>
                    {commissionSource ? (
                      <div className="mt-2 rounded-xl bg-white/80 p-2 ring-1 ring-emerald-200/60">
                        <CommissionProvenanceBreadcrumb row={commissionSource} compact />
                      </div>
                    ) : null}
                  </div>
                  {onFocusClear ? (
                    <button
                      type="button"
                      onClick={onFocusClear}
                      className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200"
                    >
                      {t('tracking.clearFocus')}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <CtvHierarchyPanel
              hierarchy={hierarchy}
              isLoading={isLoading}
              error={error}
              onRetry={onRetry}
              focusDownlineId={focus?.downlineCtvId ?? null}
            />
          </div>
        ) : (
          <CtvQrDiscountPanel profile={profile} profileName={profileName} />
        )}
      </div>
    </div>
  );
}