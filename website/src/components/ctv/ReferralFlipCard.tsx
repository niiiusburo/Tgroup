/**
 * @crossref:domain[ctv]
 * @crossref:used-in[referral progress flip card: website/src/pages/CTV/tabs/CtvTrackingTab.tsx]
 * @crossref:uses[website/src/lib/api/ctv.ts (CtvReferral types), website/src/lib/formatting.ts, website/src/lib/i18n/ctv.ts, website/src/components/shared (CtvLinkBar), product-map/domains/ctv.yaml]
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ExternalLink, Link2, ReceiptText, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVND } from '@/lib/formatting';
import { useCtvLocale } from '@/lib/i18n/ctv';
import type { CtvLob, CtvReferral, CtvReferralService } from '@/lib/api/ctv';
import { CtvLinkBar } from '@/components/shared';
import { serviceMatchesFocus, type CtvTrackingFocus } from '@/pages/CTV/ctvTrackingFocus';

interface ReferralFlipCardProps {
  readonly referral: CtvReferral;
  readonly initialFlipped?: boolean;
  readonly focus?: CtvTrackingFocus | null;
}

function getLobClass(lob: CtvLob): string {
  return lob === 'cosmetic'
    ? 'bg-rose-50 text-rose-600 ring-rose-500/20'
    : 'bg-orange-50 text-orange-700 ring-orange-500/20';
}

function getProgress(referral: CtvReferral): { current: number; paid: boolean } {
  // Prefer the server's activity-based stage (visited/serviced/paid from the real tables).
  // A client who has paid shows 4/4 even with no recorded service line — which is the point:
  // the CTV sees their client paid, regardless of whether a commission row was written.
  const sp = referral.stage_progress;
  if (typeof sp === 'number' && sp >= 1 && sp <= 4) {
    return { current: sp, paid: sp >= 4 };
  }
  // Legacy fallback (response without stage_progress): infer from services.
  const services = referral.services ?? [];
  if (services.length === 0) {
    return (referral.service_count ?? 0) > 0
      ? { current: 3, paid: false }
      : { current: 1, paid: false };
  }
  const paid = services.length > 0 && services.every((service) => service.status === 'paid');
  return { current: paid ? 4 : 3, paid };
}

function ServiceRow({
  service,
  highlighted = false,
}: {
  readonly service: CtvReferralService;
  readonly highlighted?: boolean;
}) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();

  return (
    <li
      className={cn(
        'grid grid-cols-[1fr_auto] gap-3 rounded-xl border bg-white p-3',
        highlighted ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-300/50' : 'border-gray-100'
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{service.serviceName || ctv.unknownService()}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <span className={cn('rounded-full px-2 py-0.5 ring-1 ring-inset', getLobClass(service.lob))}>
            {ctv.getLobLabel(service.lob)}
          </span>
          <span>{ctv.getServiceStatusLabel(service.status)}</span>
          <span>{ctv.formatShortDate(service.earnedAt)}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-orange-600">{formatVND(service.amount)}</p>
        <p className="text-[10px] font-medium text-gray-400">{t('expected')}</p>
      </div>
    </li>
  );
}

export function ReferralFlipCard({
  referral,
  initialFlipped = false,
  focus = null,
}: ReferralFlipCardProps) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsFlipped(initialFlipped);
  }, [initialFlipped, referral.id, focus?.clientId, focus?.serviceLineId, focus?.serviceName]);
  // The referred client IS a partner row; referral.id is that customer's id, so the
  // admin customer page lives at /customers/:id. CTVs can copy/share this link; anyone
  // with customer access opens the client directly.
  const customerPath = `/customers/${referral.id}`;

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? `${window.location.origin}${customerPath}` : customerPath;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (older browser / denied) — the Open link still works.
    }
  };

  const services = referral.services ?? [];
  const serviceCount = Math.max(referral.service_count ?? 0, services.length);
  const progress = useMemo(() => getProgress(referral), [referral]);
  const hasServices = serviceCount > 0;

  const steps = [
    t('steps.referred'),
    t('steps.visited'),
    t('steps.serviced'),
    t('steps.paid'),
  ];

  return (
    <article
      id={`ctv-referral-${referral.id}`}
      className="relative rounded-[22px] border border-gray-200 bg-white shadow-sm scroll-mt-24"
    >
      <button
        type="button"
        aria-expanded={isFlipped}
        aria-label={t(isFlipped ? 'card.showFrontFor' : 'card.showServicesFor', { name: referral.name })}
        onClick={() => setIsFlipped((value) => !value)}
        className="block w-full rounded-[22px] text-left outline-none transition-shadow duration-150 focus:ring-2 focus:ring-primary/30"
      >
        <div className="relative min-h-[248px] [perspective:1200px]">
          <div
            className={cn(
              'absolute inset-0 rounded-[22px] transition-transform duration-300 motion-reduce:transition-none [transform-style:preserve-3d]',
              isFlipped && '[transform:rotateY(180deg)]'
            )}
          >
            <div
              aria-hidden={isFlipped}
              className={cn(
                'absolute inset-0 rounded-[22px] p-4 [backface-visibility:hidden]',
                isFlipped && 'invisible'
              )}
            >
              <div className="grid grid-cols-[54px_1fr_auto] items-center gap-3">
                <div
                  className={cn(
                    'grid h-12 w-12 place-items-center rounded-full border-4 border-gray-100 bg-white text-sm font-bold',
                    progress.current >= 3 ? 'border-t-orange-500 border-r-orange-500 text-orange-600' : 'border-t-indigo-500 border-r-indigo-500 text-indigo-600'
                  )}
                >
                  {progress.current}/4
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-gray-900">{referral.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {referral.lobs.map((lob) => (
                      <span
                        key={lob}
                        className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset', getLobClass(lob))}
                      >
                        {ctv.getLobLabel(lob)}
                      </span>
                    ))}
                    <span className="text-[11px] font-medium text-gray-400">{ctv.formatShortDate(referral.referred_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  {hasServices ? (
                    <>
                      <p className="text-base font-bold text-orange-600">{formatVND(referral.total_earned)}</p>
                      <p className="text-[10px] font-medium text-gray-400">{t(progress.paid ? 'paidOut' : 'expected')}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-gray-400">-</p>
                      <p className="text-[10px] font-medium text-gray-400">{t('received')}</p>
                    </>
                  )}
                </div>
              </div>

              <div className={cn('mt-7 grid grid-cols-4 gap-1.5', referral.eligible && 'opacity-40')}>
                {steps.map((step, index) => {
                  const number = index + 1;
                  const done = number < progress.current || (number === 4 && progress.paid);
                  const current = number === progress.current && !done;
                  return (
                    <div
                      key={step}
                      className={cn(
                        'text-center text-[10px] font-medium leading-tight text-gray-400',
                        done && 'text-emerald-600',
                        current && 'text-orange-600'
                      )}
                    >
                      <span
                        className={cn(
                          'mx-auto mb-1.5 grid h-6 w-6 place-items-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-400',
                          done && 'bg-emerald-500 text-white',
                          current && 'bg-orange-500 text-white'
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : number}
                      </span>
                      {step}
                    </div>
                  );
                })}
              </div>

              {(referral.link_expires_at || referral.eligible) && (
                <div className="mt-4">
                  {referral.eligible ? (
                    <div
                      className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-500/20"
                      data-testid="ctv-eligible-banner"
                    >
                      <span aria-hidden="true">⚠</span>
                      {t('link.portalEligible')}
                    </div>
                  ) : (
                    <CtvLinkBar
                      ctvName={referral.linked_ctv_name ?? referral.name}
                      anchorAt={referral.link_anchor_at ?? null}
                      expiresAt={referral.link_expires_at ?? null}
                      active={referral.link_active ?? true}
                      eligible={referral.eligible ?? false}
                      compact
                    />
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
                <Sparkles className="h-4 w-4" />
                {hasServices
                  ? t('card.serviceCount', { count: serviceCount })
                  : t('card.noServices')}
              </div>
            </div>

            <div
              aria-hidden={!isFlipped}
              className={cn(
                'absolute inset-0 flex rounded-[22px] bg-gray-50 [transform:rotateY(180deg)] [backface-visibility:hidden]',
                !isFlipped && 'invisible'
              )}
            >
              <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-[22px]">
                <div className="flex items-start justify-between gap-3 bg-gray-900 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{referral.name}</p>
                    <p className="mt-1 text-[11px] font-medium text-gray-300">{t('card.servicesUnderReferral')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-orange-200">{formatVND(referral.total_earned)}</p>
                    <p className="text-[10px] font-medium text-gray-300">{t('card.serviceCount', { count: serviceCount })}</p>
                  </div>
                </div>

                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                  {hasServices ? (
                    services.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        highlighted={serviceMatchesFocus(service, focus)}
                      />
                    ))
                  ) : (
                    <li className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
                      <ReceiptText className="mb-2 h-5 w-5 text-gray-400" />
                      {t('card.emptyBack')}
                    </li>
                  )}
                </ul>

                <div className="flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('card.tapToReturn')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>

      {isFlipped && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={() => setIsFlipped(false)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('card.back')}
          </button>
        </div>
      )}

      {/* Shareable deep-link to the customer record (sibling of the flip button so it
          doesn't toggle the card and stays valid HTML). */}
      <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-2.5 py-1.5">
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={t('card.copyLink')}
          title={t('card.copyLink')}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? t('card.linkCopied') : t('card.copyLink')}
        </button>
        <a
          href={customerPath}
          target="_blank"
          rel="noreferrer"
          aria-label={t('card.openCustomer')}
          title={t('card.openCustomer')}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('card.openCustomer')}
        </a>
      </div>
    </article>
  );
}
