import React, { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseCtvCreationFormResult } from './types';

/**
 * CtvCreationForm — presentational, strictly prop-driven component.
 * Consumes hookResult from useCtvCreationForm (no state, no validation, no onSubmit logic inside).
 * Reuses internal Field (modeled on CtvRecruitModal's local Field) + direct label/input patterns
 * for fidelity to existing CTV creation UIs (orange focus ring, rounded-xl, px-4 py-3, gray-200 borders,
 * text-sm labels, accent-orange checkboxes).
 * Adds per-field error class `border-red-500` (as specified) on the affected input + error message below.
 * Supports slots: beforeLobs (e.g. for public-join uplinePhone), children (post-LOB extras), afterSubmit.
 * labels prop allows partial i18n overrides without forcing a single namespace.
 * showLobs, onCancel, submitLabel for context flexibility (admin modal vs portal sheet vs public page).
 *
 * @crossref:used-in[CtvManagementTab (AddCtvModal), CtvRecruitModal, JoinCtv (post-wiring cutover targets)]
 * @crossref:uses[useCtvCreationForm (via hookResult only), ./types, cn, Loader2, internal Field (for label+input+error reuse), CtvRecruitModal/JoinCtv/CtvReferModal for exact className/LOB checkbox structures + orange focus, shared Input patterns for error border precedent]
 */
export interface CtvCreationFormProps {
  /** Result object from the already-written useCtvCreationForm hook (required, prop-driven only). */
  readonly hookResult: UseCtvCreationFormResult;
  /** Partial label overrides (strings) for cross-context i18n (admin commission ns vs ctv recruit ns vs public hardcodes). */
  readonly labels?: Partial<{
    name: string;
    phone: string;
    email: string;
    password: string;
    lobs: string;
    submit: string;
    submitting: string;
    cancel: string;
    success: string;
    /** appended after email label, e.g. "(không bắt buộc)" */
    emailOptional?: string;
  }>;
  /** Toggle visibility of the LOB scope checkboxes section. Defaults true (dental forced inside hook). */
  readonly showLobs?: boolean;
  /** Slot rendered after core password field and before LOB section (e.g. upline/referrer phone in public-join). */
  readonly beforeLobs?: ReactNode;
  /** Additional slotted content after LOBs (if shown) and before general error + actions. Use for extra fields. */
  readonly children?: ReactNode;
  /** Optional cancel handler (renders a cancel button next to submit when provided). */
  readonly onCancel?: () => void;
  /** Override for the submit button text. */
  readonly submitLabel?: string;
  /** Slot after the actions row. */
  readonly afterSubmit?: ReactNode;
  readonly className?: string;
}

/** Internal reusable Field (mirrors the one previously inlined in CtvRecruitModal for visual fidelity).
 * Now supports optional `id` for a11y + robust test queries (htmlFor + id on the input child associates the label).
 * Consumers pass id to both Field and the <input id={id} ... /> (or use the id on the control for LOB group).
 */
function Field({
  label,
  error,
  children,
  id,
}: {
  readonly label: ReactNode;
  readonly error?: string;
  readonly children: ReactNode;
  readonly id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function CtvCreationForm({
  hookResult,
  labels = {},
  showLobs = true,
  beforeLobs,
  children,
  onCancel,
  submitLabel,
  afterSubmit,
  className,
}: CtvCreationFormProps) {
  const {
    values,
    errors,
    isSubmitting,
    canSubmit,
    setName,
    setPhone,
    setEmail,
    setPassword,
    toggleLob,
    handleSubmit,
  } = hookResult;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // hook.handleSubmit does NOT call preventDefault (per its contract); we do it here.
    void handleSubmit();
  };

  const baseInput =
    'w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500 text-sm text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50';

  const nameLabel = labels.name ?? 'Họ tên';
  const phoneLabel = labels.phone ?? 'Số điện thoại';
  const emailLabel = labels.email ?? 'Email';
  const passwordLabel = labels.password ?? 'Mật khẩu';
  const lobsLabel = labels.lobs ?? 'Lĩnh vực hoạt động';
  const submitText = submitLabel ?? labels.submit ?? 'Tạo tài khoản CTV';
  const submittingText = labels.submitting ?? 'Đang tạo...';
  const cancelText = labels.cancel ?? 'Hủy';
  const emailNote = labels.emailOptional;

  const hasCancel = Boolean(onCancel);

  return (
    <form onSubmit={handleFormSubmit} className={cn('space-y-4', className)} noValidate>
      <Field label={nameLabel} error={errors.name} id="ctv-name">
        <input
          id="ctv-name"
          type="text"
          value={values.name}
          onChange={(e) => setName(e.target.value)}
          className={cn(baseInput, errors.name && 'border-red-500')}
          placeholder={nameLabel}
          autoComplete="name"
        />
      </Field>

      <Field label={phoneLabel} error={errors.phone} id="ctv-phone">
        <input
          id="ctv-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => setPhone(e.target.value)}
          className={cn(baseInput, errors.phone && 'border-red-500')}
          placeholder={phoneLabel}
          autoComplete="tel"
        />
      </Field>

      <Field
        label={
          <>
            {emailLabel}
            {emailNote ? <span className="font-normal text-gray-400"> {emailNote}</span> : null}
          </>
        }
        error={errors.email}
        id="ctv-email"
      >
        <input
          id="ctv-email"
          type="email"
          value={values.email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(baseInput, errors.email && 'border-red-500')}
          placeholder={emailLabel}
          autoComplete="email"
        />
      </Field>

      <Field label={passwordLabel} error={errors.password} id="ctv-password">
        <input
          id="ctv-password"
          type="password"
          value={values.password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(baseInput, errors.password && 'border-red-500')}
          placeholder={passwordLabel}
          autoComplete="new-password"
        />
      </Field>

      {beforeLobs}

      {showLobs && (
        <div>
          <p
            className={cn(
              'mb-2 block text-sm font-medium text-gray-700',
              errors.lob_scope && 'text-red-500'
            )}
          >
            {lobsLabel}
          </p>
          <div className="flex flex-col gap-2">
            {(['dental', 'cosmetic'] as const).map((lob) => {
              const checked = values.lob_scope.includes(lob);
              return (
                <label
                  key={lob}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                    checked ? 'border-orange-300 bg-orange-50' : 'border-gray-200',
                    errors.lob_scope && 'border-red-500'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLob(lob)}
                    disabled={lob === 'dental'}
                    className="h-4 w-4 accent-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={lob}
                  />
                  <span className="text-sm font-medium capitalize text-gray-800">{lob}</span>
                </label>
              );
            })}
          </div>
          {errors.lob_scope && (
            <p className="mt-1 text-xs text-red-500">{errors.lob_scope}</p>
          )}
        </div>
      )}

      {children}

      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {errors.form}
        </p>
      )}

      <div
        className={cn(
          'pt-2',
          hasCancel ? 'flex items-center justify-end gap-3' : 'flex flex-col'
        )}
      >
        {hasCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60"
          >
            {cancelText}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed',
            hasCancel ? 'px-4' : 'w-full',
            (isSubmitting || !canSubmit) && 'opacity-60'
          )}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? submittingText : submitText}
        </button>
      </div>

      {afterSubmit}
    </form>
  );
}
