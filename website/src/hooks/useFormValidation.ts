import { useState, useCallback, useMemo } from 'react';

/**
 * useFormValidation - Reusable form validation hook
 * @crossref:used-in[CustomerForm, EmployeeForm, AppointmentForm]
 */

type ValidationRule<T> = {
  readonly validate: (value: T[keyof T], values: T) => boolean;
  readonly message: string;
};

type ValidationRules<T> = {
  readonly [K in keyof T]?: readonly ValidationRule<T>[];
};

type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface UseFormValidationResult<T> {
  readonly errors: FieldErrors<T>;
  readonly isValid: boolean;
  readonly validateField: (field: keyof T, value: T[keyof T], allValues: T) => string | null;
  readonly validateAll: (values: T) => boolean;
  readonly clearErrors: () => void;
  readonly clearFieldError: (field: keyof T) => void;
}

export function useFormValidation<T extends Record<string, unknown>>(
  rules: ValidationRules<T>,
): UseFormValidationResult<T> {
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const validateField = useCallback(
    (field: keyof T, value: T[keyof T], allValues: T): string | null => {
      const fieldRules = rules[field];
      if (!fieldRules) return null;

      for (const rule of fieldRules) {
        if (!rule.validate(value, allValues)) {
          const errorMsg = rule.message;
          setErrors((prev) => ({ ...prev, [field]: errorMsg }));
          return errorMsg;
        }
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return null;
    },
    [rules],
  );

  const validateAll = useCallback(
    (values: T): boolean => {
      const newErrors: FieldErrors<T> = {};
      let valid = true;

      for (const field of Object.keys(rules) as Array<keyof T>) {
        const fieldRules = rules[field];
        if (!fieldRules) continue;

        for (const rule of fieldRules) {
          if (!rule.validate(values[field], values)) {
            newErrors[field] = rule.message;
            valid = false;
            break;
          }
        }
      }

      setErrors(newErrors);
      return valid;
    },
    [rules],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearFieldError = useCallback(
    (field: keyof T) =>
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      }),
    [],
  );

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return { errors, isValid, validateField, validateAll, clearErrors, clearFieldError };
}

/** Common validation helpers */
export const validators = {
  required: (message = 'This field is required') => ({
    validate: (value: unknown) => {
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    },
    message,
  }),

  minLength: (min: number, message?: string) => ({
    validate: (value: unknown) =>
      typeof value === 'string' && value.length >= min,
    message: message ?? `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string) => ({
    validate: (value: unknown) =>
      typeof value === 'string' && value.length <= max,
    message: message ?? `Must be at most ${max} characters`,
  }),

  email: (message = 'Invalid email address') => ({
    validate: (value: unknown) =>
      typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  phone: (message = 'Invalid phone number') => ({
    validate: (value: unknown) =>
      typeof value === 'string' && /^[\d\s\-+()]{8,15}$/.test(value),
    message,
  }),

  pattern: (regex: RegExp, message = 'Invalid format') => ({
    validate: (value: unknown) =>
      typeof value === 'string' && regex.test(value),
    message,
  }),
} as const;
