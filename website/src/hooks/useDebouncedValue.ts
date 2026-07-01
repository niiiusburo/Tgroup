/**
 * useDebouncedValue — Generic value-debounce hook.
 * Returns a debounced copy of `value` that only updates after `delayMs`
 * has elapsed without further changes. Replaces duplicated `useRef + setTimeout`
 * debounce boilerplate across hooks that debounce a search/input value.
 * @crossref:used-in[useCustomers, useServices, usePayment, useEmployees]
 */
import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delayMs]);

  return debounced;
}
