/**
 * @crossref:route[path="/checkin" — public Face ID check-in kiosk (iPad, no login)]
 *
 * PUBLIC ROUTE — no ProtectedRoute, no useAuth, no JWT. See docs/FACE-ID-SCOPE.md.
 *
 * Flow:
 *   1. Camera preview (getUserMedia via useFaceCaptureController).
 *   2. Auto-captures when face is steady.
 *   3. POST /api/public/face/checkin (no token, recognize-only).
 *   4. Shows greeting ("Welcome back, Lan N.") or no-match / multiple / error.
 *   5. Auto-resets to capture after ~6s for the next client.
 *
 * Hard NO (anti-patterns from docs/FACE-ID-SCOPE.md):
 *   - DO NOT import useAuth.
 *   - DO NOT call /api/face/recognize (admin-only).
 *   - DO NOT navigate to /customers/:id.
 *   - DO NOT issue or store any token.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanFace, CheckCircle2, UserX, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useFaceCaptureController } from '@/components/shared/useFaceCaptureController';

type CheckInStatus =
  | { kind: 'idle' }
  | { kind: 'capturing' }
  | { kind: 'verifying' }
  | { kind: 'match'; greeting: string | null }
  | { kind: 'no_match' }
  | { kind: 'multiple'; count: number }
  | { kind: 'error'; message: string };

const RESET_DELAY_MS = 6000;

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export function CheckIn() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<CheckInStatus>({ kind: 'idle' });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Recognize-only submission to the PUBLIC endpoint.
  const handleCapture = useCallback(async (image: Blob) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus({ kind: 'verifying' });
    try {
      const fd = new FormData();
      fd.append('image', image);
      const res = await fetch(`${API_BASE}/public/face/checkin`, {
        method: 'POST',
        body: fd,
        // NOTE: no Authorization header. no credentials beyond same-origin.
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        const reason = data?.reason || 'NETWORK_ERROR';
        const message = data?.message || t('checkIn.errorGeneric', 'Something went wrong. Please try again.');
        if (reason === 'rate_limited') {
          setStatus({ kind: 'error', message });
        } else {
          setStatus({ kind: 'error', message });
        }
        return;
      }
      if (data.result === 'match') {
        setStatus({ kind: 'match', greeting: typeof data.greeting === 'string' ? data.greeting : null });
      } else if (data.result === 'multiple') {
        setStatus({ kind: 'multiple', count: Number(data.candidates) || 0 });
      } else {
        setStatus({ kind: 'no_match' });
      }
    } catch {
      setStatus({ kind: 'error', message: t('checkIn.errorGeneric', 'Something went wrong. Please try again.') });
    }
  }, [t]);

  const controller = useFaceCaptureController({
    isOpen: status.kind === 'idle' || status.kind === 'capturing',
    captureMode: 'single',
    cameraErrorMessage: t('checkIn.cameraError', 'Cannot access camera. Check permissions.'),
    captureFailedMessage: t('checkIn.captureFailed', 'Capture failed. Please try again.'),
    onCapture: handleCapture,
  });

  // Mark capturing once controller is active.
  useEffect(() => {
    if (status.kind === 'idle') {
      setStatus({ kind: 'capturing' });
    }
  }, [controller.detectionState, status.kind]);

  // Auto-reset to ready after any terminal state.
  useEffect(() => {
    const terminal = status.kind === 'match' || status.kind === 'no_match' || status.kind === 'multiple' || status.kind === 'error';
    if (terminal) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        inFlightRef.current = false;
        setStatus({ kind: 'idle' });
      }, RESET_DELAY_MS);
    }
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [status]);

  const handleManualReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    inFlightRef.current = false;
    setStatus({ kind: 'idle' });
  }, []);

  const showCamera = status.kind === 'idle' || status.kind === 'capturing';
  const terminal = status.kind === 'match' || status.kind === 'no_match' || status.kind === 'multiple' || status.kind === 'error';

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6 select-none">
      <header className="mb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('checkIn.title', 'Check In')}</h1>
        <p className="mt-2 text-slate-300 text-sm sm:text-base">{t('checkIn.subtitle', 'Look at the camera to check in')}</p>
      </header>

      <div className="relative w-full max-w-md aspect-[3/4] sm:aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        {/* Live camera feed */}
        {showCamera && (
          <video
            ref={controller.videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Status overlays */}
        {status.kind === 'verifying' && (
          <Overlay>
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" aria-hidden />
            <p className="text-lg">{t('checkIn.verifying', 'Verifying...')}</p>
          </Overlay>
        )}

        {status.kind === 'match' && (
          <Overlay tone="success">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" aria-hidden />
            <p className="text-xl font-semibold">
              {status.greeting
                ? t('checkIn.welcomeBackName', { name: status.greeting, defaultValue: `Welcome back, {{name}}` })
                : t('checkIn.welcomeBack', 'Welcome back!')}
            </p>
            <p className="mt-1 text-emerald-200/80 text-sm">{t('checkIn.youAreCheckedIn', "You're checked in.")}</p>
          </Overlay>
        )}

        {status.kind === 'no_match' && (
          <Overlay tone="warn">
            <UserX className="w-20 h-20 text-amber-400 mb-4" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.noMatchTitle', 'We could not recognize you')}</p>
            <p className="mt-1 text-amber-200/80 text-sm">{t('checkIn.noMatchHint', 'Please check in at the front desk.')}</p>
          </Overlay>
        )}

        {status.kind === 'multiple' && (
          <Overlay tone="warn">
            <AlertTriangle className="w-20 h-20 text-amber-400 mb-4" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.multipleTitle', 'Multiple possible matches')}</p>
            <p className="mt-1 text-amber-200/80 text-sm">{t('checkIn.multipleHint', 'Please check in at the front desk.')}</p>
          </Overlay>
        )}

        {status.kind === 'error' && (
          <Overlay tone="error">
            <AlertTriangle className="w-20 h-20 text-rose-400 mb-4" aria-hidden />
            <p className="text-lg font-semibold">{t('checkIn.errorTitle', 'Something went wrong')}</p>
            <p className="mt-1 text-rose-200/80 text-sm">{status.message}</p>
          </Overlay>
        )}

        {/* Idle scanning indicator over camera */}
        {showCamera && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur rounded-full text-xs flex items-center gap-2">
            <ScanFace className="w-4 h-4" aria-hidden />
            <span>{t('checkIn.scanning', 'Scanning for face...')}</span>
          </div>
        )}

        {/* Camera error (controller-level) */}
        {showCamera && controller.error && (
          <Overlay tone="error">
            <AlertTriangle className="w-16 h-16 text-rose-400 mb-4" aria-hidden />
            <p className="text-base px-4 text-center">{controller.error}</p>
          </Overlay>
        )}
      </div>

      {/* Capture + reset controls — iPad-sized touch targets */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {showCamera && (
          <button
            type="button"
            onClick={() => controller.handleCapture()}
            disabled={controller.isStarting}
            className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 transition flex items-center justify-center ring-4 ring-white/20 active:scale-95"
            aria-label={t('checkIn.capture', 'Capture')}
          >
            <ScanFace className="w-8 h-8 text-white" aria-hidden />
          </button>
        )}
        {terminal && (
          <button
            type="button"
            onClick={handleManualReset}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            <span>{t('checkIn.tryAgain', 'Try again')}</span>
          </button>
        )}
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400">
        <p>{t('checkIn.footer', 'Identity check-in only. No login required.')}</p>
      </footer>
    </div>
  );
}

function Overlay({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warn' | 'error' }) {
  const bg = tone === 'success' ? 'bg-emerald-950/85' : tone === 'warn' ? 'bg-amber-950/85' : tone === 'error' ? 'bg-rose-950/85' : 'bg-slate-950/85';
  return (
    <div className={`absolute inset-0 ${bg} backdrop-blur-sm flex flex-col items-center justify-center text-center px-6`}>
      {children}
    </div>
  );
}

export default CheckIn;
