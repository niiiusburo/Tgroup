/**
 * @crossref:domain[ctv]
 * @crossref:used-in[voucher card UI: website/src/components/ctv/CtvQrDiscountPanel.tsx, website/src/pages/CtvDiscountLanding.tsx]
 * @crossref:uses[website/src/components/ctv/ctvDiscountVoucherCanvas.ts (formatDiscountValue), website/src/lib/utils.ts, qrcode, product-map/domains/ctv.yaml]
 */
import { useEffect, useRef } from 'react';
import { Gift, MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { formatDiscountValue } from './ctvDiscountVoucherCanvas';

const tamLogo = '/favicon.svg';

const VOUCHER_STYLES = `
  @keyframes ctv-voucher-heartbeat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.03); }
    28% { transform: scale(0.97); }
    42% { transform: scale(1.02); }
    70% { transform: scale(1); }
  }
  .ctv-voucher-heartbeat { animation: ctv-voucher-heartbeat 1.5s ease-in-out infinite; }
  @keyframes ctv-voucher-beam-spin { to { transform: rotate(360deg); } }
  .ctv-voucher-glass {
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 12px 32px rgba(44, 62, 80, 0.08), 0 1.5px 4px rgba(44, 62, 80, 0.1);
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    border: 1px solid rgba(222, 226, 230, 0.35);
  }
`;

export interface CtvDiscountVoucherCardProps {
  readonly code: string;
  readonly qrValue: string;
  readonly discountValue: number;
  readonly discountType?: 'percent' | 'fixed';
  readonly slogan: string;
  readonly ctvName: string;
  readonly expiresLabel?: string;
  readonly isLive?: boolean;
  readonly isDownloading?: boolean;
  readonly onDownload?: () => void;
  readonly showDownload?: boolean;
  readonly compact?: boolean;
}

export function CtvDiscountVoucherCard({
  code,
  qrValue,
  discountValue,
  discountType = 'percent',
  slogan,
  ctvName,
  expiresLabel,
  isLive = false,
  isDownloading = false,
  onDownload,
  showDownload = true,
  compact = false,
}: CtvDiscountVoucherCardProps) {
  const { t } = useTranslation('ctv');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !qrValue) return;
    void QRCode.toCanvas(canvas, qrValue, {
      width: compact ? 128 : 150,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#1f2937', light: '#ffffff' },
    });
  }, [compact, qrValue]);

  const discountText = formatDiscountValue(discountValue, discountType);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VOUCHER_STYLES }} />

      <div
        className={cn(
          'overflow-hidden rounded-3xl',
          compact ? 'p-0' : '-mx-1 rounded-[28px] bg-gradient-to-tr from-amber-50 via-orange-50 to-yellow-50 p-4 sm:p-5'
        )}
      >
        {!compact ? (
          <div className="mb-4 flex flex-col items-center">
            <img src={tamLogo} alt={t('brandAssets.tamGroupAlt')} className="h-20 w-20 object-contain opacity-90 sm:h-24 sm:w-24" />
          </div>
        ) : null}

        <div className="ctv-voucher-heartbeat relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-red-500 p-4 shadow-lg shadow-red-500/35">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm sm:h-14 sm:w-14">
                <Gift className="h-6 w-6 text-white sm:h-7 sm:w-7" />
              </div>
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-bounce rounded-full bg-yellow-300" style={{ animationDelay: '0.1s' }} />
              <span className="absolute -bottom-1 -left-1 h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: '0.3s' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-white sm:text-2xl">
                {t('qrDiscount.discountNow', { value: discountText })}
              </p>
              <p className="mt-0.5 text-xs text-white/90 sm:text-sm">{slogan}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-white/80">{ctvName}</p>
            </div>
            <span className="shrink-0 text-2xl" aria-hidden>
              🎁
            </span>
          </div>
          {isLive ? (
            <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {t('qrDiscount.tierLive')}
            </span>
          ) : null}
        </div>

        <div className="ctv-voucher-glass relative mt-4 overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="absolute left-0 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-50" />
          <div className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-orange-50" />

          <div className="space-y-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:text-xs">
              {t('qrDiscount.yourCodeLabel')}
            </p>
            <p className="my-1 font-mono text-2xl font-bold tracking-wider text-gray-900 sm:text-4xl">{code}</p>
            {expiresLabel ? <p className="text-[10px] text-gray-500 sm:text-xs">{expiresLabel}</p> : null}
          </div>

          <div className="my-4 border-t border-dashed border-gray-300" />

          <div className="flex flex-col items-center space-y-2">
            <div id="ctv-qr-canvas" className="rounded-xl bg-white p-2 shadow-sm">
              <canvas ref={qrCanvasRef} className="block" />
            </div>
            <p className="flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-xs">
              <MapPin className="h-3 w-3 shrink-0 text-teal-600" />
              {t('qrDiscount.scanAtDesk')}
            </p>
          </div>
        </div>

        {showDownload && onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="ctv-voucher-heartbeat relative mt-4 w-full cursor-pointer overflow-hidden rounded-2xl transition-transform hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400" />
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_300deg,#ec4899_330deg,#f97316_360deg)]"
                style={{ animation: 'ctv-voucher-beam-spin 3s linear infinite' }}
              />
            </div>
            <div className="relative m-[2px] rounded-2xl bg-white/95 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-lg sm:h-14 sm:w-14',
                      isDownloading ? 'animate-spin' : 'animate-pulse'
                    )}
                  >
                    {isDownloading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-t-transparent sm:h-7 sm:w-7" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </div>
                  {!isDownloading ? (
                    <>
                      <span className="absolute -right-1 -top-1 h-3 w-3 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '0.1s' }} />
                      <span className="absolute -bottom-1 -left-1 h-2 w-2 animate-bounce rounded-full bg-pink-400" style={{ animationDelay: '0.3s' }} />
                    </>
                  ) : null}
                </div>
                <p className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-center text-2xl font-bold text-transparent sm:text-3xl">
                  {isDownloading ? t('qrDiscount.downloading') : t('qrDiscount.saveCodeNow')}
                </p>
                <span className="shrink-0 animate-pulse text-2xl" aria-hidden>
                  💖
                </span>
              </div>
            </div>
          </button>
        ) : null}
      </div>
    </>
  );
}
