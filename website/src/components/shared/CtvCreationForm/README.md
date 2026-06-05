# CtvCreationForm + useCtvCreationForm — CTV Identity Creation SSOT

**Location:** `website/src/components/shared/CtvCreationForm/`
**Barrel:** `website/src/components/shared/index.ts` (and direct imports)
**Status:** Canonical SSOT per root `AGENTS.md` §5.1 (CTV / Identity Domain SSOT Enforcement) and `website/agents.md`.

## Contract (immutable, prop-driven, no side effects in form)
- `CtvCreationForm` is **purely presentational**. It receives `hookResult: UseCtvCreationFormResult` and renders fields + errors + LOB checkboxes + submit. No internal state, no fetches, no onSubmit logic.
- `useCtvCreationForm({ config, onSubmit })` owns all state, validation, immutable updates, canSubmit, success/reset, and clean payload construction. `onSubmit` is *injected by the caller* (wraps `createCtv` or `joinCtv` + extras).
- Slots: `beforeLobs` (e.g. upline phone in public-join), `children`, `afterSubmit`.
- `labels` prop: partial i18n overrides (for different ns: commission vs ctv vs public).
- `showLobs`, `onCancel`, `submitLabel` for flexibility across admin modal / portal sheet / public page.
- Base styles + orange focus + red error borders (`border-red-500`) are owned here for visual parity.
- **Email:** optional by default (`requireEmail` in config for strict modes). Omitted from payload if blank.
- **LOB:** dental *always forced* (initial + toggle + normalizeLobs). Cosmetic optional.
- **Validation:** per-field + form errors. Password >=6. Core required: name/phone/password.
- **Payload (`CtvCreatePayload`):** trimmed; `lob_scope` normalized with dental; `email` only if truthy.
- Success: sets `success=true`; caller typically auto-closes + calls `onSuccess` + `reset()` on close.
- Errors from `onSubmit` (or validation) surface in `errors.form` (or per-field).

See `CtvCreationForm.tsx` (jsdoc + Field impl), `useCtvCreationForm.ts` (full logic), `types.ts` (CtvCreationMode, Config, Values, Errors, Payload, Result), and tests.

## Supported Modes (CtvCreationConfig.mode)
- `'admin'`: Internal admin create (CtvManagementTab AddCtvModal). Often `showLobs` + cancel.
- `'portal-recruit'`: Logged-in CTV recruiting downline (CtvRecruitModal). Resets on close.
- `'public-join'`: Unauthed self-signup (JoinCtv page at /ctv/join). `showLobs=false` often; `beforeLobs` for upline; page owns referrer gate + `joinCtv` wrapper + rootSignup VITE flag.

## Example Usage (exact patterns from the 3 call sites)
```tsx
// 1. Admin (CtvManagementTab.tsx)
const formApi = useCtvCreationForm({
  config: { mode: 'admin' },
  onSubmit: async (payload) => { await createCtv({ ...payload, email: payload.email || undefined }); },
});
// ...
<CtvCreationForm hookResult={formApi} labels={{...}} showLobs onCancel={...} />

// 2. Portal (CtvRecruitModal.tsx)
const formApi = useCtvCreationForm({ config: { mode: 'portal-recruit' }, onSubmit: async (p) => { await createCtv(...) } });
<CtvCreationForm hookResult={formApi} labels={{... from 'ctv' ns}} showLobs onCancel={onClose} />

// 3. Public (JoinCtv.tsx)
const formApi = useCtvCreationForm({ config: { mode: 'public-join' }, onSubmit: async (payload) => { ... upline logic ...; await joinCtv({ ...payload, ...uplineExtras }); } });
<CtvCreationForm
  hookResult={formApi}
  labels={{ emailOptional: '(không bắt buộc)', ... }}
  showLobs={false}
  beforeLobs={<upline input ... />}
/>
```

## Critical "Cannot Overlook" Rules (AGENTS.md §5.1 + §16)
- **@crossref:** Add/update `@crossref:used-in[...]`, `@crossref:uses[...]`, and `@crossref:domain[ctv-creation]` **here** (in this dir's source) *and at every call site* on **every edit**.
- **Atomic commit:** Changing anything here requires updating *all 3+ consumers* + backend validation (api/src/routes/ctv.js + ctvPublic.js) + `product-map/domains/ctv.yaml` (creation subsection) + tests + CHANGELOG + version bump in the *same commit*. Task is failed/rollback per §16 if missing.
- **New surfaces:** Before adding *any* new create-CTV form/modal: import from shared and extend config. No duplication.
- **Invariants (see types + hook + backend):** email optional, dental forced, specific errors, clean payload, two-DB atomicity on backend.
- Violation (bypassing SSOT) is blocked by prompt gate + pre-commit + treated as failed per root authority.

**Update this README + the root/website AGENTS sections + ctv.yaml on any governance change.**

Last synced to the 3 call sites + backend invariants: 2026-06-05.
