/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[website/src/lib/actionTracker.ts, website/src/lib/api/core.ts]
 * @crossref:uses[website/src/lib/errorReporter.ts, product-map/domains/feedback-cms.yaml]
 *
 * SilentFailureReporter — ships "silent failures" (no exception thrown,
 * but action did not achieve its goal) to the backend telemetry pipeline.
 * These are batched and deduplicated server-side by fingerprint.
 */
import { API_URL } from './api/core';
export interface SilentFailureReport {
  readonly module: string;
  readonly action: string;
  readonly route: string;
  readonly reason: 'exception' | 'logical_failure' | 'timeout' | 'api_business_error';
  readonly error?: string;
  readonly resultPreview?: string;
  readonly formState?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly durationMs?: number;
}

const TELEMETRY_URL = API_URL.replace(/\/?api$/, '') + '/api/telemetry/action-error';
const FLUSH_INTERVAL_MS = 2000;
const MAX_QUEUE = 20;

let queue: SilentFailureReport[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
}

async function flushQueue(): Promise<void> {
  timer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_QUEUE);
  try {
    await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batch }),
    });
  } catch {
    // Silent — don't recurse on telemetry failure
  }
}

/**
 * Report a silent failure. Batched for performance.
 */
export function reportSilentFailure(report: SilentFailureReport): void {
  if (queue.length >= MAX_QUEUE) {
    queue.shift(); // drop oldest
  }
  queue.push(report);
  scheduleFlush();
}

/**
 * Report an API business error (HTTP 200 with {success: false}).
 */
export function reportApiBusinessError(
  endpoint: string,
  method: string,
  errorCode: string,
  errorMessage: string,
  body?: unknown
): void {
  reportSilentFailure({
    module: 'API',
    action: `${method} ${endpoint}`,
    route: window.location.pathname,
    reason: 'api_business_error',
    error: `[${errorCode}] ${errorMessage}`,
    metadata: { endpoint, method, body },
  });
}

/** Flush immediately (use before page unload). */
export function flushSilentFailures(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return flushQueue();
}
