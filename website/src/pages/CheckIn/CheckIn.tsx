/**
 * @crossref:domain[integrations customers-partners]
 * @crossref:route[path="/checkin"]
 * @crossref:used-in[public NK2 phone/tablet Face ID check-in]
 * @crossref:uses[website/src/lib/api/partners.ts publicFaceCheckIn, api/src/routes/faceCheckin.js, docs/FACE-ID-SCOPE.md]
 *
 * Public route: no useAuth, no ProtectedRoute, no customer navigation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ScanFace, SwitchCamera, UserX } from 'lucide-react';
import { useFaceCaptureController } from '@/components/shared/useFaceCaptureController';
import { ApiError, publicFaceCheckIn } from '@/lib/api';

type CheckInStatus =
  | { kind: 'idle' }
  | { kind: 'capturing' }
  | { kind: 'verifying' }
  | { kind: 'match'; greeting: string | null }
  | { kind: 'no_match' }
  | { kind: 'multiple'; count: number }
  | { kind: 'error'; message: string };

const RESET_DELAY_MS = 6000;
const RETRY_NOTICE_DELAY_MS = 2200;
const MAX_TRANSIENT_FACE_RETRIES = 4;
const TRANSIENT_FACE_ERROR_CODES = new Set(['NO_FACE', 'MULTIPLE_FACES', 'LOW_QUALITY']);

function isTransientFaceError(err: unknown) {
  return err instanceof ApiError && err.status === 422 && Boolean(err.code && TRANSIENT_FACE_ERROR_CODES.has(err.code));
}

export function CheckIn() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<CheckInStatus>({ kind: 'idle' });
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const transientRetryCountRef = useRef(0);

  const clearRetryNotice = useCallback(() => {
    if (retryNoticeTimerRef.current) clearTimeout(retryNoticeTimerRef.current);
    retryNoticeTimerRef.current = null;
    setScanNotice(null);
  }, []);

  const resetScanner = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    clearRetryNotice();
    inFlightRef.current = false;
    transientRetryCountRef.current = 0;
    setStatus({ kind: 'idle' });
  }, [clearRetryNotice]);

  const handleCapture = useCallback(async (image: Blob) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    clearRetryNotice();
    setStatus({ kind: 'verifying' });

    try {
      const data = await publicFaceCheckIn(image);
      transientRetryCountRef.current = 0;
      if (data.result === 'match') {
        setStatus({ kind: 'match', greeting: data.greeting });
      } else if (data.result === 'multiple') {
        setStatus({ kind: 'multiple', count: data.candidates });
      } else {
        setStatus({ kind: 'no_match' });
      }
    } catch (err) {
      if (isTransientFaceError(err) && transientRetryCountRef.current < MAX_TRANSIENT_FACE_RETRIES) {
        transientRetryCountRef.current += 1;
        inFlightRef.current = false;
        setScanNotice(t('checkIn.noFaceRetry', 'Face not clear yet. Keep looking at the camera.'));
        setStatus({ kind: 'capturing' });
        retryNoticeTimerRef.current = setTimeout(() => {
          retryNoticeTimerRef.current = null;
          setScanNotice(null);
        }, RETRY_NOTICE_DELAY_MS);
        return;
      }

      const message = err instanceof Error
        ? err.message
        : t('checkIn.errorGeneric', 'Something went wrong. Please try again.');
      setStatus({ kind: 'error', message });
    }
  }, [clearRetryNotice, t]);

  const controller = useFaceCaptureController({
    isOpen: status.kind === 'idle' || status.kind === 'capturing',
    captureMode: 'single',
    defaultFacingMode: 'user',
    cameraErrorMessage: t('checkIn.cameraError', 'Cannot access camera. Check permissions.'),
    captureFailedMessage: t('checkIn.captureFailed', 'Capture failed. Please try again.'),
    onCapture: handleCapture,
  });

  useEffect(() => {
    if (status.kind === 'idle') {
      setStatus({ kind: 'capturing' });
    }
  }, [controller.detectionState, status.kind]);

  useEffect(() => {
    const terminal = ['match', 'no_match', 'multiple', 'error'].includes(status.kind);
    if (terminal) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        resetScanner();
      }, RESET_DELAY_MS);
    }
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetScanner, status.kind]);

  const handleManualReset = useCallback(() => {
    resetScanner();
  }, [resetScanner]);

  useEffect(() => () => {
    if (retryNoticeTimerRef.current) clearTimeout(retryNoticeTimerRef.current);
  }, []);

  const showCamera = status.kind === 'idle' || status.kind === 'capturing';
  const terminal = ['match', 'no_match', 'multiple', 'error'].includes(status.kind);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 px-5 py-6 text-gray-900 select-none">
      <header className="mb-5 text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold leading-snug">
          {t('checkIn.title', 'Check In')}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {t('checkIn.subtitle', 'Look at the camera to check in')}
        </p>
      </header>

      <main className="relative w-full max-w-md aspect-[3/4] sm:aspect-square overflow-hidden rounded-xl bg-gray-900 shadow-2xl ring-1 ring-gray-200">
        {showCamera && (
          <>
            <video
              ref={controller.videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              data-testid="checkin-privacy-blur"
              className="pointer-events-none absolute inset-0 bg-gray-950/10 backdrop-blur-[3px]"
            />
          </>
        )}

        {status.kind === 'verifying' && (
          <Overlay>
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" aria-hidden />
            <p className="text-lg font-medium">{t('checkIn.verifying', 'Verifying...')}</p>
          </Overlay>
        )}

        {status.kind === 'match' && (
          <Overlay tone="success">
            <CheckCircle2 className="mb-4 h-20 w-20 text-emerald-500" aria-hidden />
            <p className="text-xl font-semibold">
              {status.greeting
                ? t('checkIn.welcomeBackName', { name: status.greeting, defaultValue: 'Welcome back, {{name}}' })
                : t('checkIn.welcomeBack', 'Welcome back!')}
            </p>
            <p className="mt-1 text-sm text-emerald-700">{t('checkIn.youAreCheckedIn', "You're checked in.")}</p>
          </Overlay>
        )}

        {status.kind === 'no_match' && (
          <Overlay tone="warn">
            <UserX className="mb-4 h-20 w-20 text-amber-500" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.noMatchTitle', 'We could not recognize you')}</p>
            <p className="mt-1 text-sm text-amber-700">{t('checkIn.noMatchHint', 'Please check in at the front desk.')}</p>
          </Overlay>
        )}

        {status.kind === 'multiple' && (
          <Overlay tone="warn">
            <AlertTriangle className="mb-4 h-20 w-20 text-amber-500" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.multipleTitle', 'Multiple possible matches')}</p>
            <p className="mt-1 text-sm text-amber-700">{t('checkIn.multipleHint', 'Please check in at the front desk.')}</p>
          </Overlay>
        )}

        {status.kind === 'error' && (
          <Overlay tone="error">
            <AlertTriangle className="mb-4 h-20 w-20 text-red-500" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.errorTitle', 'Something went wrong')}</p>
            <p className="mt-1 max-w-xs text-sm text-red-700">{status.message}</p>
          </Overlay>
        )}

        {showCamera && (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-900/70 px-4 py-2 text-xs font-medium text-white backdrop-blur">
            <ScanFace className="h-4 w-4" aria-hidden />
            <span>{scanNotice || t('checkIn.scanning', 'Scanning for face...')}</span>
          </div>
        )}

        {showCamera && (
          <button
            type="button"
            onClick={controller.handleSwitchCamera}
            disabled={controller.isStarting}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-sm backdrop-blur transition hover:bg-gray-800/80 active:scale-[0.98] disabled:opacity-50"
            aria-label={t('checkIn.flipCamera', 'Flip camera')}
          >
            <SwitchCamera className="h-5 w-5" aria-hidden />
          </button>
        )}

        {showCamera && controller.error && (
          <Overlay tone="error">
            <AlertTriangle className="mb-4 h-16 w-16 text-red-500" aria-hidden />
            <p className="px-4 text-center text-sm text-red-700">{controller.error}</p>
          </Overlay>
        )}
      </main>

      <div className="mt-8 flex flex-col items-center gap-3">
        {showCamera && (
          <button
            type="button"
            onClick={() => controller.handleCapture()}
            disabled={controller.isStarting}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white ring-4 ring-primary/20 transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50"
            aria-label={t('checkIn.capture', 'Capture')}
          >
            <ScanFace className="h-8 w-8" aria-hidden />
          </button>
        )}
        {terminal && (
          <button
            type="button"
            onClick={handleManualReset}
            className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            <span>{t('checkIn.tryAgain', 'Try again')}</span>
          </button>
        )}
      </div>

      <footer className="absolute bottom-4 left-0 right-0 px-4 text-center text-xs text-gray-400">
        <p>{t('checkIn.footer', 'Identity check-in only. No login required.')}</p>
      </footer>
    </div>
  );
}

function Overlay({
  children,
  tone = 'info',
}: {
  readonly children: React.ReactNode;
  readonly tone?: 'info' | 'success' | 'warn' | 'error';
}) {
  const toneClass = {
    info: 'bg-white/95 text-gray-900',
    success: 'bg-emerald-50/95 text-emerald-950',
    warn: 'bg-amber-50/95 text-amber-950',
    error: 'bg-red-50/95 text-red-950',
  }[tone];

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center backdrop-blur-sm ${toneClass}`}>
      {children}
    </div>
  );
}

export default CheckIn;
