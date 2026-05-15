# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## Format

```
## [x.y.z] — YYYY-MM-DD
### Category
- Change description — @author — reason/ref
```

Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Docs`.

---

## [0.32.0] — 2026-05-14
### Fixed
- Permission domain registry drift repair — @agent — 8 decision cards approved; canonical YAML now drives backend guards, frontend matrix, route guards, and tests (DEC-20260514-01).
- `/services` route guard changed from `customers.edit` to `services.view` — @agent — Key must match the room (DEC-20260514-01).
- Hosoonline patient creation now requires `external_checkups.create` (was `external_checkups.upload`) — @agent — Separate doors for create vs upload (DEC-20260514-01).
- Payment proof upload uses `payment.add`; record patch uses `payment.edit` — @agent — Adding file ≠ mutating record (DEC-20260514-01).
- Admin self-lockout guard: backend blocks accidental revocation of own `permissions.edit` without `?confirm=true` — @agent — Safety cover on master key (DEC-20260514-01).
- Permission Board matrix rebuilt from generated registry (`PERMISSION_BY_CATEGORY`) — @agent — Eliminates fake label-derived permissions like `services.add`, `calendar.edit` (DEC-20260514-01).
- Remember Me token lifetime now 60 days (was 24 hours) — @agent — Backend keeps the promise frontend/UI already made (DEC-20260514-01).
### Added
- `product-map/contracts/permission-registry.yaml` is now single source of truth — @agent — Generator emits TS + JS constants; parity test fails CI on drift (DEC-20260514-01).
- `website/scripts/generate-permission-enum.ts` — @agent — Build-time generator from YAML to `website/src/types/generated/permissions.ts` and `api/src/constants/permissions.js` (DEC-20260514-01).
- Registry parity test (`api/tests/permissionRegistryParity.test.js`) — @agent — Scans `requirePermission` calls and fails if strings drift from YAML (DEC-20260514-01).
- Permission resolver tests (`api/tests/permissionResolve.test.js`) — @agent — Covers wildcard, empty scope, primary branch, overrides (DEC-20260514-01).
- Self-lockout tests (`api/tests/selfLockout.test.js`) — @agent — Confirms block and confirmation bypass (DEC-20260514-01).
- Auth token lifetime tests (`api/tests/authTokenLifetime.test.js`) — @agent — Confirms 24h default and 60d remember-me (DEC-20260514-01).
### Changed
- `/api/Permissions/resolve/:employeeId` now delegates to `permissionService.resolveEffectivePermissions` — @agent — Removes inline duplicate resolver (DEC-20260514-01).

## [0.27.27] — 2026-05-05
### Fixed
- iPhone modal height overflow in AddCustomerForm and EditCustomerForm — @agent — Prevent form fields from being unreachable on 390px viewports (FM-20260505-01).

## [0.27.26] — 2026-05-05
### Changed
- Sticky toolbar search spacing on Overview — @agent — Standardize compact toolbar layout per DESIGN.md (DEC-20260502-05).

## [0.27.25] — 2026-05-04
### Fixed
- Hosoonline mixed content blocking on production — @agent — Force HTTPS fallback for upstream image URLs (INC-20260506-02).

## [0.27.24] — 2026-05-03
### Added
- Patient v2 API with key-based authentication (`POST /api/patients/_create`, `GET /api/patients/_search`) — @agent — Enable external patient management without Caddy routing collision.

## [0.27.23] — 2026-05-02
### Added
- Revenue export Excel builder with location scope and employee-type filter — @agent — TC015 protected reports routing requirement.
- Cash flow report backend aggregation — @agent — Financial reporting accuracy.

## [0.27.22] — 2026-04-28
### Fixed
- Permission system drift: `resolveEffectivePermissions` now shared between auth middleware and login route — @agent — Prevent middleware rejecting valid tokens (INC-20260506-01).

## [0.27.21] — 2026-04-25
### Added
- IP access control per company (`ip_access_settings` + `ip_access_entries`) — @agent — Clinic network security requirement.

## [0.27.20] — 2026-04-20
### Fixed
- Login rate limiter scoped by email+IP instead of IP-only — @agent — Prevent one employee locking out entire clinic (FM-20260420-01).

## [0.27.19] — 2026-04-18
### Added
- Telemetry ingestion system (`POST /api/telemetry/errors`, error management UI) — @agent — Operational visibility into frontend crashes.

## [0.27.18] — 2026-04-15
### Fixed
- Export nginx timeout raised to 300s — @agent — Prevent 504 on large revenue/payment exports (FM-20260415-01).

## [0.27.17] — 2026-04-12
### Added
- Monthly plan installment payment flow (`PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`) — @agent — Large treatment financing.

## [0.27.16] — 2026-04-10
### Fixed
- `partners` NOT NULL constraint rollback after customer create breakage — @agent — All INSERT paths must include new columns (FM-20260410-01).

## [0.27.15] — 2026-04-05
### Added
- Face embedding soft-delete (`deleted_at` on `customer_face_embeddings`) — @agent — Preserve audit history on re-registration (FM-20260405-01).

## [0.27.14] — 2026-03-25
### Changed
- Payment allocation pre-validation (`validateAllocationResidual`) — @agent — Reduce negative residual race conditions (FM-20260325-01).

## [0.27.13] — 2026-03-20
### Added
- i18n coverage test (`i18n-coverage.test.ts`) — @agent — Catch missing Vietnamese keys before merge (FM-20260228-01).

## [0.27.12] — 2026-03-15
### Removed
- Mock data fallback from production components — @agent — Prevent API failures from being masked (FM-20260310-01).

## [0.27.11] — 2026-03-10
### Added
- Root authority stack (`AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`) — @agent — Establish durable decision routing (ADR-0001).

## [0.27.10] — 2026-03-05
### Added
- Product-map governance (`product-map/domains/*.yaml`, `schema-map.md`, `dependency-rules.yaml`) — @agent — Domain ownership and blast radius tracking (ADR-0002).

## [0.27.0] — 2026-02-01
### Added
- Enterprise domain routes (`api/src/domains/appointments`, `partners`, `auth`) — @agent — Clean architecture for new features.

## [0.26.0] — 2026-01-15
### Added
- Face recognition service (Python/OpenCV YuNet+SFace) — @agent — Local check-in accelerator.

## [0.25.0] — 2025-12-20
### Added
- Payment allocation engine (`payment_allocations` table) — @agent — Split payments across multiple invoices.

## [0.24.0] — 2025-11-10
### Added
- Deposit wallet and receipt number generation — @agent — Prepayment tracking.

## [0.23.0] — 2025-10-01
### Added
- External checkups integration (Hosoonline proxy) — @agent — Health-checkup image sync.

## [0.22.0] — 2025-09-15
### Added
- Permission tier system (`permission_groups`, `group_permissions`, `partners.tier_id`) — @agent — Replace hard-coded role checks.

## [0.21.0] — 2025-08-01
### Added
- TDental CSV import scripts — @agent — Migrate legacy clinic data.

## [0.20.0] — 2025-07-01
### Added
- React 18 + Vite 5 frontend rewrite — @human — Modern SPA replacing legacy web app.

---

## [0.32.2] — 2026-05-15
### Fixed
- Face recognition matching accuracy — @agent — Centroid-based matching replaces best-sample scoring; all customer embeddings are averaged into a single representative vector, reducing variance from single bad samples.
- Face recognition thresholds tuned for SFace real-world performance — @agent — Auto-match 0.95→0.72, candidate 0.85→0.58, margin 0.05→0.08; calibrated from SFace cosine similarity distribution on production data.
- Frontend face capture quality checks — @agent — Added Laplacian blur detection, brightness range validation, face size enforcement (≥12% of frame); prevents capturing blurry/dark/distant photos that produce poor embeddings.
- Face capture UX feedback — @agent — Real-time quality messages ("Too dark", "Too blurry", "Move closer", etc.) replace generic "Scanning"; CSS blur removed from video preview to avoid user confusion.
- Face capture auto-capture stability — @agent — Consecutive issue counter prevents capture on transient good frames; requires 4 stable ready frames (was 6) with 200ms interval (was 260ms).
### Changed
- `faceCaptureEngine.ts` — `QualityFeedback` type exported; `analyzeFrame` returns feedback issues array.
- `faceCaptureModal.tsx` — Dynamic feedback banner with color-coded status (green/amber/red).
- `faceMatchEngine.js` — `computeCentroid()` helper; `findMatches()` groups by customer then scores against centroid.
### Added
- `computeCentroid` unit tests — @agent — Validates normalization behavior for identical, different, empty, and opposite-facing embeddings.

## [0.32.1] — 2026-05-14
### Fixed
- Admin seed missing `customers.hard_delete` — @agent — Migration 048 ensures Super Admin group has hard-delete access (blocks partners hard-delete endpoint). Renumbered from 047 to avoid collision with NK prod migration 047_restore_payment_system.sql.
- Location checkbox toggle wired in PermissionGroupConfig — @agent — Individual location checkboxes now interactive via `toggleLocation` + `allLocations` from `useLocations`.
- PermissionGroupConfig not mounted in app — @agent — Added "Permissions" tab to Settings page; E2E test updated for tab navigation (no `/permissions` route change).
- Revenue report employee Excel export restored above KPI cards — @agent — Keeps the report export control discoverable at the top of `/reports/revenue`.
### Added
- Permission override UI (grant/revoke) in member detail view — @agent — `PermissionMemberCard` extracted to keep module under 500 lines; supports blocking group perms and granting extras.

## Unreleased

### Added
- Complete documentation stack (`docs/GLOSSARY.md`, `CONTRACTS.md`, `DATA-MODEL.md`, `USE-CASES.md`, `WORKFLOWS.md`, `INVARIANTS.md`, `DEPENDENCY-MAP.md`, `OWNERSHIP.md`, `TEST-MATRIX.md`, `ADR/`, `RUNBOOK.md`, `FAILURE-MODES.md`, `OBSERVABILITY.md`, `SECURITY.md`, `CHANGELOG.md`, `MIGRATIONS.md`, `ROADMAP.md`) — @agent — Anti-breakage and parallel-work safety.
- Doc-update verification script (`scripts/verify-docs.sh`) — @agent — Enforce AGENTS.md §16 pre-commit.

### Fixed
- Aligned `contracts/payment.ts` method enum with actual backend/frontend support (`cash`, `bank_transfer`, `deposit`, `mixed`) — @agent — Remove `card`, `momo`, `vnpay`, `zalopay` placeholders until end-to-end wiring exists.
