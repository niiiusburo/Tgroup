/**
 * FaceDiagnostics — structured telemetry for the /checkin kiosk.
 *
 * Captures every phase of a face check-in attempt (camera open, per-frame score,
 * capture, endpoint POST, result) into a localStorage ring buffer AND ships
 * significant events to the existing backend telemetry endpoint
 * (POST /api/telemetry/errors with error_type: 'FaceCheckIn').
 *
 * Why: iOS Safari silently fails (no native FaceDetector, play() rejection,
 * dim front camera). Without this, kiosk failures leave zero trace.
 *
 * Public surface (no auth) — only device/capability metadata, no PHI.
 */

const BUFFER_KEY = 'face_checkin_diagnostics';
const MAX_ENTRIES = 50;

export type FaceCheckInPhase =
  | 'kiosk_mount'
  | 'camera_request'
  | 'camera_stream_ok'
  | 'camera_stream_failed'
  | 'video_play_ok'
  | 'video_play_failed'
  | 'detection_tick'
  | 'auto_capture'
  | 'force_capture'
  | 'manual_capture'
  | 'api_post'
  | 'api_response'
  | 'kiosk_unmount';

export interface FaceCheckInEvent {
  ts: number;                    // epoch ms
  phase: FaceCheckInPhase;
  session_id: string;            // per kiosk-mount uuid
  score?: number;                // 0..1 detection score
  best_score?: number;           // best score seen so far
  elapsed_ticks?: number;
  detection_state?: string;
  video_size?: { w: number; h: number };
  facing_mode?: string;
  has_detector?: boolean;
  error_name?: string;
  error_message?: string;
  endpoint?: string;
  http_status?: number;
  response_summary?: string;     // first 120 chars of response (no PHI beyond greeting)
}

const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

function safeUA(): string {
  try { return navigator.userAgent.slice(0, 200); } catch { return 'unknown'; }
}

function detectDevice(): { ios: boolean; safari: boolean; has_media_devices: boolean; has_face_detector: boolean } {
  const ua = safeUA().toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  const has_media_devices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const has_face_detector = typeof (globalThis as { FaceDetector?: unknown }).FaceDetector !== 'undefined';
  return { ios, safari, has_media_devices, has_face_detector };
}

const DEVICE = detectDevice();

export function getDeviceInfo() { return DEVICE; }

function readBuffer(): FaceCheckInEvent[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    return raw ? JSON.parse(raw) as FaceCheckInEvent[] : [];
  } catch {
    return [];
  }
}

function writeBuffer(entries: FaceCheckInEvent[]) {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // localStorage may be full or disabled; telemetry is best-effort.
  }
}

export function readDiagnostics(): FaceCheckInEvent[] {
  return readBuffer();
}

export function clearDiagnostics() {
  try { localStorage.removeItem(BUFFER_KEY); } catch { /* ignore */ }
}

/** Always-buffer (synchronous, never throws). Use for high-frequency events like detection_tick. */
export function logFace(phase: FaceCheckInPhase, partial: Omit<FaceCheckInEvent, 'ts' | 'phase' | 'session_id'> & { session_id?: string } = {}) {
  const evt: FaceCheckInEvent = {
    ts: Date.now(),
    phase,
    session_id: partial.session_id ?? 'unknown',
    ...partial,
  };
  const buf = readBuffer();
  buf.push(evt);
  writeBuffer(buf);
  // Also surface to devtools console for live debugging.
  try {
    // eslint-disable-next-line no-console
    console.debug('[FaceCheckIn]', phase, evt);
  } catch { /* ignore */ }
}

/**
 * Ship a significant event to the backend telemetry endpoint.
 * Non-blocking; never throws. Best-effort (offline = silent drop).
 *
 * Public route, no auth, no PHI beyond the greeting (already minimal per scope rule).
 */
export async function reportFaceEvent(
  phase: FaceCheckInPhase,
  session_id: string,
  partial: Omit<FaceCheckInEvent, 'ts' | 'phase' | 'session_id'> = {},
) {
  // Always buffer locally first
  logFace(phase, { session_id, ...partial });

  // Build a backend-compatible error report
  const isError =
    phase === 'camera_stream_failed' ||
    phase === 'video_play_failed' ||
    (phase === 'api_response' && partial.http_status && partial.http_status >= 400);

  const message = partial.error_message || phase;
  const metadata = {
    phase,
    session_id,
    device: DEVICE,
    ua: safeUA(),
    score: partial.score,
    best_score: partial.best_score,
    elapsed_ticks: partial.elapsed_ticks,
    detection_state: partial.detection_state,
    video_size: partial.video_size,
    facing_mode: partial.facing_mode,
    has_detector: partial.has_detector,
    endpoint: partial.endpoint,
    http_status: partial.http_status,
    response_summary: partial.response_summary,
  };

  try {
    await fetch(`${API_BASE}/telemetry/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_type: 'FaceCheckIn',
        message,
        stack: '',
        route: '/checkin',
        source_file: 'website/src/pages/CheckIn/CheckIn.tsx',
        metadata,
        // Mark non-error events so backend dedup doesn't drown in ticks
        user_agent: safeUA(),
      }),
    });
  } catch {
    // Backend unreachable or rate-limited. Local buffer still has the data.
  }
  // Only return isError so callers can branch UI; the actual fetch is fire-and-forget above.
  return isError;
}
