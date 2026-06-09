/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 CTV portal and referral surface: website/src/components/ctv/CtvQrDiscountPanel]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Link2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { CtvProfile } from '@/lib/api/ctvSelf';
import {
  buildStaffVerifyDiscountUrl,
  generateCtvDiscountCode,
} from '@/lib/api/discountCodes';
import { cn } from '@/lib/utils';

import { CtvDiscountCodesHistory } from './CtvDiscountCodesHistory';
import { CtvDiscountVoucherCard } from './CtvDiscountVoucherCard';
import { formatDiscountValue, renderKolStyleVoucherPng } from './ctvDiscountVoucherCanvas';

const DEFAULT_NON_LIVE_PERCENT = 10;
const DEFAULT_EXPIRY_DAYS = 30;

const LINK_GLASS =
  'rounded-3xl border border-white/40 bg-white/70 p-4 shadow-[0_12px_32px_rgba(44,62,80,0.08)] backdrop-blur-[18px] backdrop-saturate-[180%] sm:p-5';

interface CtvQrDiscountPanelProps {
  readonly profile: CtvProfile | null;
  readonly profileName: string;
}

function buildShortCode(profile: CtvProfile | null): string {
  const source = profile?.id ?? '000000';
  return `CTV-${source.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function buildDiscountLandingUrl(shortCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/ctv/discount/${shortCode}`;
}

function isMobileBrowser(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOSDevice(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function CtvQrDiscountPanel({ profile, profileName }: CtvQrDiscountPanelProps) {
  const { t } = useTranslation('ctv');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(DEFAULT_NON_LIVE_PERCENT);
  const copyTimerRef = useRef<number | null>(null);

  const shortCode = useMemo(() => buildShortCode(profile), [profile]);
  const landingUrl = useMemo(() => buildDiscountLandingUrl(shortCode), [shortCode]);
  const staffVerifyUrl = useMemo(
    () => (activeCode ? buildStaffVerifyDiscountUrl(activeCode) : ''),
    [activeCode]
  );

  const isLive = profile?.isLive === true;
  const tierLabel = isLive ? t('qrDiscount.tierLive') : t('qrDiscount.tierOff');
  const expiryLabel = t('qrDiscount.expiryDays', { days: DEFAULT_EXPIRY_DAYS });

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(landingUrl);
      setCopyState('copied');
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('idle');
    }
  }, [landingUrl]);

  const handleShareLink = useCallback(async () => {
    const shareNavigator = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (shareNavigator.share) {
      try {
        await shareNavigator.share({
          title: t('qrDiscount.shareTitle', { name: profileName }),
          text: t('qrDiscount.shareText', { percent: discountPercent, name: profileName }),
          url: landingUrl,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await handleCopyLink();
  }, [discountPercent, handleCopyLink, landingUrl, profileName, t]);

  const handleDownloadImage = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const generated = await generateCtvDiscountCode({ forceNew: true });
      const code = generated.code;
      setActiveCode(code);
      setDiscountPercent(generated.discountValue);

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const qrCanvas = document.querySelector('#ctv-qr-canvas canvas') as HTMLCanvasElement | null;
      if (!qrCanvas) throw new Error('QR canvas not found');

      const blob = await renderKolStyleVoucherPng({
        qrCanvas,
        code,
        discountValue: generated.discountValue,
        discountType: generated.discountType,
        brandLine: t('qrDiscount.brandLine'),
        footerLine: t('qrDiscount.scanAtDesk'),
        discountBanner: t('qrDiscount.canvasDiscount', {
          value: formatDiscountValue(generated.discountValue, generated.discountType),
        }),
        codeLabel: t('qrDiscount.yourCodeLabel'),
      });

      const fileName = t('qrDiscount.downloadFilename', { code });
      const imageFile = new File([blob], fileName, { type: 'image/png' });

      if (isMobileBrowser() && navigator.canShare?.({ files: [imageFile] })) {
        try {
          await navigator.share({
            files: [imageFile],
            title: t('qrDiscount.shareVoucherTitle'),
            text: t('qrDiscount.shareVoucherText'),
          });
          return;
        } catch (shareError) {
          if ((shareError as DOMException)?.name === 'AbortError') return;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isIOSDevice()) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, t]);

  return (
    <div className="space-y-5">
      <div className={cn(LINK_GLASS, 'flex items-start justify-between gap-3')}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 sm:text-xs">
            {t('qrDiscount.currentTier')}
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
            {t('qrDiscount.discountNow', { value: `${discountPercent}%` })}
          </p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">{expiryLabel}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs',
            isLive ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
          )}
        >
          {tierLabel}
        </span>
      </div>
      <p className="px-1 text-xs leading-5 text-gray-500 sm:text-sm">{t('qrDiscount.tierHint')}</p>

      <section className={LINK_GLASS}>
        <div className="flex items-center gap-2 text-orange-600">
          <Link2 className="h-4 w-4" />
          <h3 className="text-sm font-bold text-gray-900">{t('qrDiscount.modeLinkTitle')}</h3>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm">{t('qrDiscount.modeLinkBody')}</p>
        <a
          href={landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block break-all rounded-2xl border border-orange-100/80 bg-white/80 px-3 py-2.5 font-mono text-[11px] text-orange-700 underline-offset-2 hover:underline sm:text-xs"
        >
          {landingUrl}
        </a>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-3 text-xs font-bold text-white transition-transform hover:scale-[1.02]"
          >
            <Copy className="h-3.5 w-3.5" />
            {copyState === 'copied' ? t('qrDiscount.copied') : t('qrDiscount.copyLink')}
          </button>
          <button
            type="button"
            onClick={() => void handleShareLink()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-700 transition-transform hover:scale-[1.02]"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t('qrDiscount.shareLink')}
          </button>
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-800 transition-transform hover:scale-[1.02]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('qrDiscount.openPreview')}
          </a>
        </div>
      </section>

      <section>
        <p className="mb-3 px-1 text-xs font-semibold text-gray-600 sm:text-sm">{t('qrDiscount.modeQrTitle')}</p>
        <p className="mb-4 px-1 text-xs leading-5 text-gray-500 sm:text-sm">{t('qrDiscount.modeQrBody')}</p>
        {activeCode ? (
          <CtvDiscountVoucherCard
            code={activeCode}
            qrValue={staffVerifyUrl}
            discountValue={discountPercent}
            discountType="percent"
            slogan={t('qrDiscount.slogan')}
            ctvName={profileName}
            expiresLabel={expiryLabel}
            isLive={isLive}
            isDownloading={isDownloading}
            onDownload={() => void handleDownloadImage()}
          />
        ) : (
          <div className={LINK_GLASS}>
            <p className="text-center text-sm text-gray-600">{t('qrDiscount.generateHint')}</p>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownloadImage()}
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-orange-500 text-sm font-bold text-white disabled:opacity-60"
            >
              {isDownloading ? t('qrDiscount.downloading') : t('qrDiscount.generateAndDownload')}
            </button>
          </div>
        )}
      </section>

      <CtvDiscountCodesHistory />
    </div>
  );
}