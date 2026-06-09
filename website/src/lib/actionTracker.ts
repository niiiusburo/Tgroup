/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[all NK3 frontend form submissions and button clicks]
 * @crossref:uses[website/src/lib/silentFailureReporter.ts, website/src/lib/errorReporter.ts]
 *
 * ActionTracker — wraps user actions to detect silent failures.
 * A "silent failure" is when a button click or form submit produces no visible
 * result and throws no exception (e.g. API returns {success: false}, validation
 * blocks silently, or state update is swallowed).
 */

import { reportSilentFailure } from './silentFailureReporter';
import { logger } from './logger';

export interface TrackedActionContext {
  readonly module: string;
  readonly action: string;
  readonly route: string;
  readonly formState?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface TrackedActionResult<T> {
  readonly result: T;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: string;
}

const ACTION_TIMEOUT_MS = 30000;

function sanitizeFormState(state?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!state) return undefined;
  const sensitive = new Set(['password', 'token', 'secret', 'creditCard', 'cardNumber', 'cvv']);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (sensitive.has(key.toLowerCase())) {
      cleaned[key] = '<REDACTED>';
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Track a user action. Detects:
 *  - Thrown errors (re-thrown after reporting)
 *  - Logical failures (expectedResult returns false)
 *  - Timeouts (promise hangs > ACTION_TIMEOUT_MS)
 */
export async function trackAction<T>(
  ctx: TrackedActionContext,
  fn: () => Promise<T>,
  options?: {
    readonly expectedResult?: (result: T) => boolean;
    readonly onSilentFailure?: (context: TrackedActionContext, result: T, durationMs: number) => void;
  }
): Promise<T> {
  const start = performance.now();
  const route = window.location.pathname + window.location.search;
  const fullCtx: TrackedActionContext = { ...ctx, route };

  let result: T;
  try {
    result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Action timed out after ${ACTION_TIMEOUT_MS}ms`)), ACTION_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    logger.error(fullCtx.module, `${fullCtx.action} failed with exception`, { error: message, duration, route });
    reportSilentFailure({
      ...fullCtx,
      formState: sanitizeFormState(fullCtx.formState),
      reason: 'exception',
      error: message,
      durationMs: duration,
    });
    throw err;
  }

  const duration = Math.round(performance.now() - start);

  // Check logical success
  const isSuccess = options?.expectedResult ? options.expectedResult(result) : true;
  if (!isSuccess) {
    const reason = 'logical_failure';
    logger.warn(fullCtx.module, `${fullCtx.action} succeeded logically but expectedResult failed`, { duration, route });
    reportSilentFailure({
      ...fullCtx,
      formState: sanitizeFormState(fullCtx.formState),
      reason,
      resultPreview: truncatePreview(result),
      durationMs: duration,
    });
    options?.onSilentFailure?.(fullCtx, result, duration);
  }

  return result;
}

function truncatePreview<T>(result: T): string {
  try {
    const json = JSON.stringify(result);
    return json.length > 500 ? json.slice(0, 500) + '…' : json;
  } catch {
    return '<unserializable>';
  }
}

/**
 * React hook version — binds to component lifecycle.
 */
export function useActionTracker(module: string) {
  return {
    track: <T,>(
      action: string,
      fn: () => Promise<T>,
      options?: {
        readonly expectedResult?: (result: T) => boolean;
        readonly formState?: Record<string, unknown>;
        readonly metadata?: Record<string, unknown>;
        readonly onSilentFailure?: (context: TrackedActionContext, result: T, durationMs: number) => void;
      }
    ) => trackAction({ module, action, route: window.location.pathname, formState: options?.formState, metadata: options?.metadata }, fn, options),
  };
}
