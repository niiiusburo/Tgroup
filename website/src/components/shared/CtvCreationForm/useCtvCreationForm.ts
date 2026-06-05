import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CtvCreationConfig,
  CtvCreationFormValues,
  CtvCreationErrors,
  CtvCreatePayload,
  UseCtvCreationFormResult,
} from './types';

/**
 * useCtvCreationForm — Config-driven shared hook for CTV creation forms.
 *
 * Supports 3 modes without side effects or fetches:
 * - admin: internal admin create (CtvManagementTab AddCtvModal)
 * - portal-recruit: CTV-portal recruiting a new CTV (CtvRecruitModal)
 * - public-join: unauthenticated public self-signup (JoinCtv)
 *
 * Email: optional by default (converged); per-config requireEmail for strict modes.
 * LOB: dental always forced (cannot remove via toggle); cosmetic optional.
 * Per-field errors for red borders + highlights on inputs.
 * Immutable updates only.
 * Password min length 6 enforced.
 * Submit builds *clean* payload (falsy email omitted; trimmed; lob_scope normalized with dental).
 * onSubmit injected by caller (can be createCtv or joinCtv wrapper that adds extras like code/uplinePhone).
 * Exposes reset + success + isSubmitting for success UI (checkmark) + parent orchestration.
 *
 * @crossref:used-in[CtvManagementTab (admin AddCtvModal), CtvRecruitModal (portal-recruit), JoinCtv (public-join)]
 * @crossref:uses[@/lib/api/ctv (createCtv/joinCtv types + callers), react-i18next (ctv ns for errors), ./types, useFormValidation patterns (per-field + validators inspiration), @/lib/utils (cn/normalize in consumers)]
 * @crossref:plan-refactor-target[minimal wiring in 3 consumers without behavior change until full cutover]
 */

// Internal initial (immutable baseline)
function makeInitialValues(): CtvCreationFormValues {
  return {
    name: '',
    phone: '',
    email: '',
    password: '',
    lob_scope: ['dental'] as const,
  };
}

function trim(s: string): string {
  return (s || '').trim();
}

function normalizeLobs(lobs: readonly string[] | undefined): string[] {
  const set = new Set<string>(['dental']);
  if (Array.isArray(lobs)) {
    for (const l of lobs) {
      if (l === 'dental' || l === 'cosmetic') set.add(l);
    }
  }
  return Array.from(set);
}

export function useCtvCreationForm({
  config,
  onSubmit,
}: {
  readonly config: CtvCreationConfig;
  readonly onSubmit: (payload: CtvCreatePayload) => Promise<void>;
}): UseCtvCreationFormResult {
  const { t } = useTranslation('ctv');

  const [values, setValues] = useState<CtvCreationFormValues>(makeInitialValues);
  const [errors, setErrors] = useState<CtvCreationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const requireEmail = !!config.requireEmail;

  const canSubmit = useMemo(() => {
    if (success) return false;
    const v = values;
    return (
      trim(v.name).length > 0 &&
      trim(v.phone).length > 0 &&
      trim(v.password).length >= 6 &&
      (!requireEmail || trim(v.email).length > 0) &&
      Object.keys(errors).length === 0
    );
  }, [values, requireEmail, errors, success]);

  const setField = useCallback(
    (field: 'name' | 'phone' | 'email' | 'password', raw: string) => {
      setValues((prev) => {
        const next = { ...prev, [field]: raw };
        return next;
      });
      // Clear that field's error on edit (live forgiveness)
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        if (Object.keys(next).length === 1 && next.form) {
          // keep general if only form left? or clear too for simplicity
          delete next.form;
        }
        return next;
      });
    },
    [],
  );

  const setName = useCallback((v: string) => setField('name', v), [setField]);
  const setPhone = useCallback((v: string) => setField('phone', v), [setField]);
  const setEmail = useCallback((v: string) => setField('email', v), [setField]);
  const setPassword = useCallback((v: string) => setField('password', v), [setField]);

  const toggleLob = useCallback((lob: string) => {
    setValues((prev) => {
      const current = prev.lob_scope as string[];
      if (lob === 'dental') {
        // always forced
        if (!current.includes('dental')) {
          return { ...prev, lob_scope: ['dental', ...current.filter((l) => l !== 'dental')] };
        }
        return prev;
      }
      const has = current.includes(lob);
      const nextLobs = has
        ? current.filter((l) => l !== lob)
        : [...current, lob];
      const normalized = normalizeLobs(nextLobs);
      return { ...prev, lob_scope: normalized };
    });
    // clear lob error on toggle
    setErrors((prev) => {
      if (!prev.lob_scope && !prev.form) return prev;
      const next = { ...prev };
      delete next.lob_scope;
      delete next.form;
      return next;
    });
  }, []);

  const validate = useCallback((): CtvCreationErrors => {
    const v = values;
    const nextErrors: CtvCreationErrors = {};

    const name = trim(v.name);
    const phone = trim(v.phone);
    const email = trim(v.email);
    const pw = v.password; // no trim for pw length

    if (!name) {
      nextErrors.name = t('forms.createCtv.nameRequired');
    }
    if (!phone) {
      nextErrors.phone = t('forms.createCtv.phoneRequired');
    }
    if (!pw || pw.length < 6) {
      const pwMsg = pw
        ? t('forms.createCtv.passwordMin')
        : t('forms.createCtv.passwordRequired');
      nextErrors.password = pwMsg;
      if (!nextErrors.form) nextErrors.form = pwMsg;
    }
    if (requireEmail && !email) {
      nextErrors.email = t('forms.createCtv.emailRequired');
    }

    // core reusable (covers the 3 always-required for all modes)
    if (!name || !phone || !pw) {
      nextErrors.form = t('forms.createCtv.coreRequired');
    } else if (requireEmail && !email) {
      nextErrors.form = t('forms.createCtv.emailRequired');
    }

    // lobs: after normalize always has dental, but defensive
    const lobs = normalizeLobs(v.lob_scope);
    if (lobs.length === 0) {
      nextErrors.lob_scope = t('forms.createCtv.lobsRequired');
      nextErrors.form = nextErrors.form || t('forms.createCtv.lobsRequired');
    }

    return nextErrors;
  }, [values, requireEmail, t]);

  const handleSubmit = useCallback(async () => {
    setErrors({});
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSuccess(false);

    // Build clean payload (email falsy -> omit)
    const name = trim(values.name);
    const phone = trim(values.phone);
    const pw = values.password;
    const email = trim(values.email);
    const lob_scope = normalizeLobs(values.lob_scope);

    const payload: CtvCreatePayload = {
      name,
      phone,
      password: pw,
      lob_scope,
      ...(email ? { email } : {}),
    };
    // else: deliberately omitted (or could be null; callers for joinCtv can coerce if needed)

    try {
      await onSubmit(payload);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as any)?.message ||
        t('forms.createCtv.coreRequired'); // fallback safe
      setErrors({ form: msg });
      setSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit, t]);

  const reset = useCallback(() => {
    setValues(makeInitialValues());
    setErrors({});
    setIsSubmitting(false);
    setSuccess(false);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    success,
    canSubmit,
    setName,
    setPhone,
    setEmail,
    setPassword,
    toggleLob,
    handleSubmit,
    reset,
    clearSuccess,
  };
}
