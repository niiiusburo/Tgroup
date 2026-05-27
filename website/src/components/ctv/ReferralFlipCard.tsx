import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ReceiptText, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVND } from '@/lib/formatting';
import type { CtvLob, CtvReferral, CtvReferralService } from '@/lib/api/ctv';

interface ReferralFlipCardProps {
  readonly referral: CtvReferral;
}

function getDateLocale(language: string): string {
  return language.startsWith('en') ? 'en-US' : 'vi-VN';
}

function formatShortDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getLobClass(lob: CtvLob): string {
  return lob === 'cosmetic'
    ? 'bg-rose-50 text-rose-600 ring-rose-500/20'
    : 'bg-orange-50 text-orange-700 ring-orange-500/20';
}

function getServiceStatusKey(status: string): string {
  if (status === 'paid') return 'serviceStatus.paid';
  if (status === 'reversed') return 'serviceStatus.reversed';
  return 'serviceStatus.pending';
}

function getProgress(referral: CtvReferral): { current: number; paid: boolean } {
  const services = referral.services ?? [];
  if (services.length === 0) {
    return (referral.service_count ?? 0) > 0
      ? { current: 3, paid: false }
      : { current: 1, paid: false };
  }
  const paid = services.length > 0 && services.every((service) => service.status === 'paid');
  return { current: paid ? 4 : 3, paid };
}

function ServiceRow({ service }: { readonly service: CtvReferralService }) {
  const { t, i18n } = useTranslation('ctv');
  const dateLocale = getDateLocale(i18n.language);

  return (
    <li className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-gray-100 bg-white p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{service.serviceName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <span className={cn('rounded-full px-2 py-0.5 ring-1 ring-inset', getLobClass(service.lob))}>
            {t(`lobs.${service.lob}`)}
          </span>
          <span>{t(getServiceStatusKey(service.status))}</span>
          <span>{formatShortDate(service.earnedAt, dateLocale)}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-orange-600">{formatVND(service.amount)}</p>
        <p className="text-[10px] font-medium text-gray-400">{t('expected')}</p>
      </div>
    </li>
  );
}

export function ReferralFlipCard({ referral }: ReferralFlipCardProps) {
  const { t, i18n } = useTranslation('ctv');
  const [isFlipped, setIsFlipped] = useState(false);
  const services = referral.services ?? [];
  const serviceCount = Math.max(referral.service_count ?? 0, services.length);
  const progress = useMemo(() => getProgress(referral), [referral]);
  const hasServices = serviceCount > 0;
  const dateLocale = getDateLocale(i18n.language);

  const steps = [
    t('steps.referred'),
    t('steps.visited'),
    t('steps.serviced'),
    t('steps.paid'),
  ];

  return (
    <article className="relative rounded-[22px] border border-gray-200 bg-white shadow-sm">
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
                        {t(`lobs.${lob}`)}
                      </span>
                    ))}
                    <span className="text-[11px] font-medium text-gray-400">{formatShortDate(referral.referred_at, dateLocale)}</span>
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

              <div className="mt-7 grid grid-cols-4 gap-1.5">
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
                    services.map((service) => <ServiceRow key={service.id} service={service} />)
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
        <div className="flex justify-center pb-3">
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
    </article>
  );
}
