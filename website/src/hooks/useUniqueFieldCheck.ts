/**
 * useUniqueFieldCheck - Debounced uniqueness check for phone/email fields
 * Calls GET /api/Partners/check-unique and caches results to avoid redundant requests.
 * @crossref:used-in[AddCustomerForm]
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export type UniqueFieldStatus = 'idle' | 'checking' | 'unique' | 'duplicate' | 'error';

export interface UseUniqueFieldCheckArgs {
  field: 'phone' | 'email';
  value: string;
  excludeId?: string | number;
  initialValue?: string;   // edit-mode: skip check when value === initialValue
  debounceMs?: number;     // default 400
  enabled?: boolean;       // default true
}

export interface UseUniqueFieldCheckResult {
  status: UniqueFieldStatus;
  message?: string;
}

const DUPLICATE_MESSAGES: Record<'phone' | 'email', string> = {
  phone: 'validation.phoneInUse',
  email: 'validation.emailInUse',
};

const ERROR_MESSAGE = 'validation.cannotVerify';

interface CacheEntry {
  value: string;
  excludeId?: string | number;
  status: UniqueFieldStatus;
  message?: string;
}

export function useUniqueFieldCheck(args: UseUniqueFieldCheckArgs): UseUniqueFieldCheckResult {
  const { field, value, excludeId, initialValue, debounceMs = 400, enabled = true } = args;

  const [status, setStatus] = useState<UniqueFieldStatus>('idle');
  const [message, setMessage] = useState<string | undefined>(undefined);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<CacheEntry | null>(null);

  const setResult = useCallback((nextStatus: UniqueFieldStatus, nextMessage?: string) => {
    setStatus(nextStatus);
    setMessage(nextMessage);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    const trimmedInitial = initialValue?.trim();

    // Clear pending timer and abort in-flight request on every change
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // Idle conditions
    if (!enabled || !trimmed || trimmed === trimmedInitial) {
      setResult('idle');
      return;
    }

    // Cache hit
    if (
      cacheRef.current &&
      cacheRef.current.value === trimmed &&
      cacheRef.current.excludeId === excludeId
    ) {
      setResult(cacheRef.current.status, cacheRef.current.message);
      return;
    }

    // Start debounce — show 'checking' immediately so UI can react
    setResult('checking');

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params: Record<string, string | number | boolean | undefined> = {
          field,
          value: trimmed,
        };
        if (excludeId !== undefined) {
          params['excludeId'] = excludeId;
        }

        const data = await apiFetch<{ unique: boolean }>('/Partners/check-unique', {
          params,
        });

        if (controller.signal.aborted) return;

        const nextStatus: UniqueFieldStatus = data.unique ? 'unique' : 'duplicate';
        const nextMessage = data.unique ? undefined : DUPLICATE_MESSAGES[field];

        cacheRef.current = { value: trimmed, excludeId, status: nextStatus, message: nextMessage };
        setResult(nextStatus, nextMessage);
      } catch (err) {
        if (controller.signal.aborted) return;
        // Any error (network, 4xx, 5xx) → non-blocking helper text
        void err;
        cacheRef.current = { value: trimmed, excludeId, status: 'error', message: ERROR_MESSAGE };
        setResult('error', ERROR_MESSAGE);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, excludeId, initialValue, enabled, field, debounceMs, setResult]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { status, message };
}
