/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[all NK3 form submissions]
 * @crossref:uses[website/src/lib/actionTracker.ts, website/src/components/shared/ActionErrorToast.tsx]
 *
 * useTrackedForm — wraps form submission with action tracking,
 * silent-failure detection, and user-facing error toast.
 */

import { useState, useCallback } from 'react';
import { trackAction } from '@/lib/actionTracker';
import { ApiError } from '@/lib/api/core';

export interface TrackedFormState<T> {
  readonly isSubmitting: boolean;
  readonly toast: TrackedToastState | null;
  readonly submit: (fn: () => Promise<T>, options?: TrackedFormOptions<T>) => Promise<T | undefined>;
  readonly dismissToast: () => void;
}

export interface TrackedFormOptions<T> {
  readonly module: string;
  readonly action: string;
  readonly formState?: Record<string, unknown>;
  readonly expectedResult?: (result: T) => boolean;
  readonly onSuccess?: (result: T) => void;
  readonly onError?: (err: unknown) => void;
  readonly successMessage?: string;
}

export interface TrackedToastState {
  readonly message: string;
  readonly action: string;
  readonly onReport?: () => void;
}

export function useTrackedForm<T>(): TrackedFormState<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<TrackedToastState | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const submit = useCallback(
    async (fn: () => Promise<T>, options?: TrackedFormOptions<T>): Promise<T | undefined> => {
      if (!options) {
        // Untracked fallback — just run the function
        setIsSubmitting(true);
        try {
          return await fn();
        } finally {
          setIsSubmitting(false);
        }
      }

      setIsSubmitting(true);
      setToast(null);
      let result: T | undefined;

      try {
        result = await trackAction(
          {
            module: options.module,
            action: options.action,
            route: window.location.pathname,
            formState: options.formState,
          },
          fn,
          {
            expectedResult: options.expectedResult,
            onSilentFailure: (ctx, _res, _dur) => {
              setToast({
                message: `${ctx.action} did not complete as expected.`,
                action: ctx.action,
              });
            },
          }
        );
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        options.onError?.(err);
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'An unexpected error occurred.';
        setToast({
          message: msg,
          action: options.action,
        });
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { isSubmitting, toast, submit, dismissToast };
}
