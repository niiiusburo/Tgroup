/**
 * Types for the shared CTV creation form hook.
 *
 * @crossref:used-in[useCtvCreationForm]
 * @crossref:used-in[CtvManagementTab (admin AddCtvModal), CtvRecruitModal (portal-recruit), JoinCtv (public-join)]
 */

export type CtvCreationMode = 'admin' | 'portal-recruit' | 'public-join';

export interface CtvCreationConfig {
  /** Determines default behavior, validation strictness, and payload shape hints. */
  readonly mode: CtvCreationMode;
  /**
   * Whether email is required for this mode.
   * Default: false (converged to optional everywhere per public + recent spec;
   * admin/portal-recruit can opt-in via config but currently default optional).
   */
  readonly requireEmail?: boolean;
}

export interface CtvCreationFormValues {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  /** Always contains at least 'dental'; cosmetic optional via toggle. */
  readonly lob_scope: readonly string[];
}

export type CtvCreationField = keyof CtvCreationFormValues | 'lob_scope' | 'form';

export type CtvCreationErrors = Partial<Record<CtvCreationField, string>>;

export interface CtvCreatePayload {
  readonly name: string;
  readonly phone: string;
  readonly password: string;
  readonly lob_scope: string[];
  /** Omitted (or null) when falsy per clean-payload rule. */
  readonly email?: string | null;
  // Note: public-join callers may spread extra (code/uplinePhone) outside the hook.
}

export interface UseCtvCreationFormResult {
  readonly values: CtvCreationFormValues;
  readonly errors: CtvCreationErrors;
  readonly isSubmitting: boolean;
  readonly success: boolean;
  /** True when no errors and core fields filled (for button disabled). */
  readonly canSubmit: boolean;

  /** Immutable field setters (new object each time). */
  readonly setName: (value: string) => void;
  readonly setPhone: (value: string) => void;
  readonly setEmail: (value: string) => void;
  readonly setPassword: (value: string) => void;

  /**
   * Toggle LOB. 'dental' is always forced and cannot be removed.
   * Cosmetic is optional. Idempotent and immutable.
   */
  readonly toggleLob: (lob: string) => void;

  /**
   * Validate + build clean payload + invoke injected onSubmit.
   * On success: success=true, isSubmitting=false.
   * On failure from onSubmit: sets errors.form, success=false.
   * Does NOT preventDefault (caller form can).
   */
  readonly handleSubmit: () => Promise<void>;

  /** Reset to pristine initial state (dental only, empty strings, success=false, errors={}). */
  readonly reset: () => void;

  /** Clear only success (e.g. after parent closed modal). */
  readonly clearSuccess: () => void;
}
