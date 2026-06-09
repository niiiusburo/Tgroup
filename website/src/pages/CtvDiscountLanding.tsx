/**
 * @crossref:domain[ctv]
 * @crossref:route[path="/ctv/discount/:shortCode"]
 * @crossref:used-in[NK3 public fan landing — KOL parity Mode A]
 * @crossref:uses[website/src/lib/api/discountCodes.ts, CtvDiscountVoucherCard]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CtvDiscountVoucherCard } from '@/components/ctv/CtvDiscountVoucherCard';
import {
  buildStaffVerifyDiscountUrl,
  checkExistingFanCode,
  fetchCtvDiscountLanding,
  generateFanDiscountCode,
  type CtvDiscountLandingInfo,
} from '@/lib/api/discountCodes';
import { cn } from '@/lib/utils';

export default function CtvDiscountLanding() {
  const { shortCode = '' } = useParams();
  const { t } = useTranslation('ctv');
  const [landing, setLanding] = useState<CtvDiscountLandingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [discountValue, setDiscountValue] = useState(10);

  useEffect(() => {
    let cancelled = false;
    const token = shortCode.toUpperCase();
    setLoading(true);
    setError(null);
    void fetchCtvDiscountLanding(token)
      .then(async (data) => {
        if (cancelled) return;
        setLanding(data);
        setDiscountValue(data.ctv.discountValue);
        const existing = await checkExistingFanCode(data.ctv.id);
        if (!cancelled && existing.hasCode) {
          setCode(existing.code);
          setDiscountValue(existing.discountValue);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('discountLanding.notFound'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  const verifyUrl = useMemo(() => (code ? buildStaffVerifyDiscountUrl(code) : ''), [code]);
  const expiryLabel = t('qrDiscount.expiryDays', { days: landing?.ctv.expiryDays ?? 30 });

  const handleClaim = useCallback(async () => {
    if (!landing?.ctv.id || generating) return;
    setGenerating(true);
    try {
      const result = await generateFanDiscountCode(landing.ctv.id);
      setCode(result.code);
      setDiscountValue(result.discountValue);
    } catch {
      setError(t('discountLanding.generateError'));
    } finally {
      setGenerating(false);
    }
  }, [generating, landing?.ctv.id, t]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 via-white to-amber-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !landing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 via-white to-amber-50 px-4">
        <p className="text-center text-sm text-gray-600">{error || t('discountLanding.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600">{t('discountLanding.brand')}</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {t('discountLanding.title', { name: landing.ctv.name })}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{t('discountLanding.preview', { value: `${discountValue}%` })}</p>
        </div>

        {code ? (
          <div className="mt-8">
            <CtvDiscountVoucherCard
              code={code}
              qrValue={verifyUrl}
              discountValue={discountValue}
              discountType="percent"
              slogan={t('qrDiscount.slogan')}
              ctvName={landing.ctv.name}
              expiresLabel={expiryLabel}
              isLive={landing.ctv.isLive}
              isDownloading={false}
              showDownload={false}
            />
            <p className="mt-4 text-center text-xs leading-5 text-gray-500">{t('discountLanding.instructions')}</p>
          </div>
        ) : (
          <div
            className={cn(
              'mt-8 rounded-3xl border border-orange-200 bg-white/90 p-6 text-center shadow-lg backdrop-blur-sm'
            )}
          >
            <Gift className="mx-auto h-10 w-10 text-orange-500" />
            <p className="mt-4 text-sm leading-6 text-gray-700">{t('discountLanding.claimBody')}</p>
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleClaim()}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {generating ? t('discountLanding.claiming') : t('discountLanding.claimCta')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}