import { useState, useEffect, useRef, useCallback } from 'react';

interface CheckResult {
  exists: boolean;
  field: 'phone' | 'email' | null;
  id?: string;
}

type CheckFn = (phone?: string, email?: string, excludeId?: string) => Promise<CheckResult>;

export function useUniqueCheck(checkFn: CheckFn, currentId?: string) {
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback((phone?: string, email?: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmedPhone = phone?.trim();
    const trimmedEmail = email?.trim();

    if (!trimmedPhone) setPhoneError(null);
    if (!trimmedEmail) setEmailError(null);

    if (!trimmedPhone && !trimmedEmail) {
      setChecking(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await checkFn(trimmedPhone, trimmedEmail, currentId);
        if (result.exists) {
          if (result.field === 'phone') {
            setPhoneError('validation.phoneExists');
          } else if (result.field === 'email') {
            setEmailError('validation.emailExists');
          }
        } else {
          if (trimmedPhone) setPhoneError(null);
          if (trimmedEmail) setEmailError(null);
        }
      } catch {
        // silently fail — backend validation will catch it on submit
      } finally {
        setChecking(false);
      }
    }, 400);
  }, [checkFn, currentId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { phoneError, emailError, checking, check };
}
