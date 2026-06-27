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
 * Diagnostics (added 2026-06-27):
 *   - Every phase (camera open, per-tick score, capture, API POST) is logged to
 *     localStorage 'face_checkin_diagnostics' AND shipped to /api/telemetry/errors
 *     with error_type:'FaceCheckIn'. Use ?debug=1 to view on-device.
 *
 * Hard NO (anti-patterns from docs/FACE-ID-SCOPE.md):
 *   - DO NOT import useAuth.
 *   - DO NOT call /api/face/recognize (admin-only).
 *   - DO NOT navigate to /customers/:id.
 *   - DO NOT issue or store any token.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanFace, CheckCircle2, UserX, AlertTriangle, Loader2, RotateCcw, Bug } from 'lucide-react';
import { useFaceCaptureController } from '@/components/shared/useFaceCaptureController';
import {
  logFace,
  reportFaceEvent,
  readDiagnostics,
  clearDiagnostics,
  getDeviceInfo,
  type FaceCheckInEvent,
} from '@/lib/faceDiagnostics';

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

function makeSessionId(): string {
  // Lightweight UUID without crypto dependency for old iOS.
  return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function CheckIn() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<CheckInStatus>({ kind: 'idle' });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef<string>(makeSessionId());
  const [showDebug, setShowDebug] = useState<boolean>(() => {
    try { return new URLSearchParams(window.location.search).has('debug'); } catch { return false; }
  });
  const deviceInfo = useMemo(() => getDeviceInfo(), []);

  // Recognize-only submission to the PUBLIC endpoint.
  const handleCapture = useCallback(async (image: Blob) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus({ kind: 'verifying' });
    const endpoint = `${API_BASE}/public/face/checkin`;
    logFace('api_post', { session_id: sessionIdRef.current, endpoint });
    const start = Date.now();
    try {
      const fd = new FormData();
      fd.append('image', image);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
        // NOTE: no Authorization header. no credentials beyond same-origin.
      });
      const data = await res.json().catch(() => null);
      const summary = data ? JSON.stringify(data).slice(0, 120) : '';
      await reportFaceEvent('api_response', sessionIdRef.current, {
        endpoint,
        http_status: res.status,
        response_summary: summary,
      });
      if (!res.ok || !data) {
        const reason = data?.reason || 'NETWORK_ERROR';
        const message = data?.message || t('checkIn.errorGeneric', 'Something went wrong. Please try again.');
        setStatus({ kind: 'error', message });
        return;
      }
      if (data.result === 'match') {
        setStatus({ kind: 'match', greeting: typeof data.greeting === 'string' ? data.greeting : null });
      } else if (data.result === 'multiple') {
        setStatus({ kind: 'multiple', count: Number(data.candidates) || 0 });
      } else {
        setStatus({ kind: 'no_match' });
      }
      void start; // timing already in fetch
    } catch (err) {
      await reportFaceEvent('api_response', sessionIdRef.current, {
        endpoint,
        error_name: err instanceof Error ? err.name : 'Unknown',
        error_message: err instanceof Error ? err.message : String(err),
      });
      setStatus({ kind: 'error', message: t('checkIn.errorGeneric', 'Something went wrong. Please try again.') });
    }
  }, [t]);

  const controller = useFaceCaptureController({
    // iPad kiosk: clients face the screen, so default to the FRONT ('user') camera.
    // (was 'environment' which is the back camera — wrong for a wall-mounted kiosk.)
    isOpen: status.kind === 'idle' || status.kind === 'capturing',
    captureMode: 'single',
    cameraErrorMessage: t('checkIn.cameraError', 'Cannot access camera. Check permissions.'),
    captureFailedMessage: t('checkIn.captureFailed', 'Capture failed. Please try again.'),
    onCapture: handleCapture,
  });

  // === Diagnostics: log every meaningful state change ===
  useEffect(() => {
    logFace('kiosk_mount', { session_id: sessionIdRef.current, has_detector: deviceInfo.has_face_detector });
    return () => {
      logFace('kiosk_unmount', { session_id: sessionIdRef.current });
    };
  }, [deviceInfo]);

  useEffect(() => {
    // Camera errors from the controller → telemetry
    if (controller.error) {
      void reportFaceEvent('camera_stream_failed', sessionIdRef.current, {
        error_message: controller.error,
        facing_mode: 'user',
        has_detector: deviceInfo.has_face_detector,
      });
    }
  }, [controller.error, deviceInfo]);

  useEffect(() => {
    // Sample detection progress every 5 ticks (~1.3s) to keep telemetry bounded
    if (status.kind === 'idle') {
      setStatus({ kind: 'capturing' });
      logFace('camera_stream_ok', {
        session_id: sessionIdRef.current,
        facing_mode: 'user',
        has_detector: deviceInfo.has_face_detector,
        detection_state: controller.detectionState,
      });
    }
  }, [controller.detectionState, status.kind, deviceInfo]);

  // Throttle high-frequency tick logging with a ref
  const lastTickLogRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastTickLogRef.current > 1300 ) {
      lastTickLogRef.current = now;
      logFace('detection_tick', {
        session_id: sessionIdRef.current,
        score: controller.detectionScore,
        detection_state: controller.detectionState,
        has_detector: deviceInfo.has_face_detector,
      });
    }
  }, [controller.detectionScore, controller.detectionState, deviceInfo]);

  // Auto-reset to ready after any terminal state.
  useEffect(() => {
    const terminal = status.kind === 'match' || status.kind === 'no_match' || status.kind === 'multiple' || status.kind === 'error';
    if (terminal) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        inFlightRef.current = false;
        sessionIdRef.current = makeSessionId();
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
    sessionIdRef.current = makeSessionId();
    setStatus({ kind: 'idle' });
  }, []);

  const handleManualCapture = useCallback(() => {
    logFace('manual_capture', { session_id: sessionIdRef.current, score: controller.detectionScore });
    controller.handleCapture();
  }, [controller]);

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
            <span>
              {t('checkIn.scanning', 'Scanning for face...')} {Math.round(Math.max(0, Math.min(1, controller.detectionScore)) * 100)}%
            </span>
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
            onClick={handleManualCapture}
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
        <button
          type="button"
          onClick={() => setShowDebug((v) => !v)}
          className="mt-1 opacity-50 hover:opacity-100 inline-flex items-center gap-1"
          aria-label="Toggle diagnostics"
        >
          <Bug className="w-3 h-3" aria-hidden />
          <span>{showDebug ? 'Hide' : 'Diagnostics'}</span>
        </button>
      </footer>

      {showDebug && <DiagnosticsOverlay onClose={() => setShowDebug(false)} deviceInfo={deviceInfo} />}
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

function DiagnosticsOverlay({
  onClose,
  deviceInfo,
}: {
  onClose: () => void;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
}) {
  const [events, setEvents] = useState<FaceCheckInEvent[]>([]);
  useEffect(() => {
    setEvents(readDiagnostics());
  }, []);
  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 text-emerald-200 p-4 overflow-auto text-xs font-mono">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold">Face ID Diagnostics</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { clearDiagnostics(); setEvents([]); }}
            className="px-2 py-1 bg-rose-900/50 rounded hover:bg-rose-900"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ device: deviceInfo, events }, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'face-checkin-diagnostics.json'; a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-2 py-1 bg-emerald-900/50 rounded hover:bg-emerald-900"
          >
            Download
          </button>
          <button type="button" onClick={onClose} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Close</button>
        </div>
      </div>
      <pre className="mb-3 text-[10px] opacity-80">device = {JSON.stringify(deviceInfo)}</pre>
      <table className="w-full text-[10px]">
        <thead className="text-emerald-400">
          <tr>
            <th className="text-left p-1">Time</th>
            <th className="text-left p-1">Phase</th>
            <th className="text-left p-1">Score</th>
            <th className="text-left p-1">State</th>
            <th className="text-left p-1">Detail</th>
          </tr>
        </thead>
        <tbody>
          {events.slice(-30).reverse().map((e, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="p-1">{new Date(e.ts).toLocaleTimeString()}</td>
              <td className="p-1">{e.phase}</td>
              <td className="p-1">{e.score != null ? Math.round(e.score * 100) + '%' : '-'}</td>
              <td className="p-1">{e.detection_state ?? '-'}</td>
              <td className="p-1 truncate max-w-[160px]">
                {e.error_message || e.response_summary || e.http_status || (e.video_size ? `${e.video_size.w}x${e.video_size.h}` : '')}
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={5} className="p-4 text-center opacity-60">No events yet. Capture a face to populate.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CheckIn;
