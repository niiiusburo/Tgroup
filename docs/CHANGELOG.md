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

## [0.32.8] — 2026-05-16
### Changed
- Revenue tab Excel exports consolidated into a single picker at the top of the page — @agent — Replace three separate export panels (revenue, deposit, employee revenue) with one report-type dropdown plus the existing employee filters; date range continues to come from the global Reports filter bar.

## [0.32.7] — 2026-05-16
### Fixed
- Báo cáo doanh thu (Excel) column E "Phiếu khám" now uses `saleorders.code` (e.g. `SO-2026-0644`) instead of `saleorders.name` — @agent — Match the SO reference shown on the customer detail page; falls back to `name` only when `code` is blank.
- Phiếu điều trị export "Số phiếu" column likewise prefers `saleorders.code` — @agent — Same SO-code source as customer UI.
- Revenue and treatment export search filters now match against `saleorders.code` in addition to `name` — @agent — Staff can paste `SO-...` codes into search.

## [0.32.6] — 2026-05-16
### Added
- NK production daily database backup script and VPS cron with 3-backup retention — @agent — Preserve production restore points for `tdental_demo` before future data operations.

### Fixed
- Hosoonline customer images on NK now use session-storage auth tokens as well as remembered tokens — @agent — Preserve INV-013 protected proxy access for non-remembered sessions.

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

## Unreleased

### Added
- Complete documentation stack (`docs/GLOSSARY.md`, `CONTRACTS.md`, `DATA-MODEL.md`, `USE-CASES.md`, `WORKFLOWS.md`, `INVARIANTS.md`, `DEPENDENCY-MAP.md`, `OWNERSHIP.md`, `TEST-MATRIX.md`, `ADR/`, `RUNBOOK.md`, `FAILURE-MODES.md`, `OBSERVABILITY.md`, `SECURITY.md`, `CHANGELOG.md`, `MIGRATIONS.md`, `ROADMAP.md`) — @agent — Anti-breakage and parallel-work safety.
- Doc-update verification script (`scripts/verify-docs.sh`) — @agent — Enforce AGENTS.md §16 pre-commit.

### Fixed
- Aligned `contracts/payment.ts` method enum with actual backend/frontend support (`cash`, `bank_transfer`, `deposit`, `mixed`) — @agent — Remove `card`, `momo`, `vnpay`, `zalopay` placeholders until end-to-end wiring exists.

## [0.32.5] — 2026-05-16
### Fixed
- Deposit creation now correctly sets `payment_category = 'deposit'` when explicit `deposit_type` is provided — @agent — Staff feedback: advance receipts showing in payment list (BUG-003)
- Restored legacy flat revenue (`revenue-flat`) and deposit (`deposit-flat`) Excel exports removed in earlier refactor — @agent — Staff feedback: missing report download section (BUG-004) and previous report shape (BUG-002)

## [0.32.4] — 2026-05-16
### Fixed
- (intermediate build — handoff checkpoint)

## [0.32.3] — 2026-05-16
### Changed
- Auto-detected Errors tab on /feedback now shows structured error metadata (error type, message, occurrence count, source file, stack trace) — @agent — Richer error triage for ops team
- Backend `GET /api/Feedback/all?source=auto` now JOINs `error_events` to return full error metadata — @agent — Support frontend structured display
- Backend `GET /api/Feedback/all/:id` now JOINs `error_events` for detail view — @agent — Support modal stack trace display
- Feedback detail modal widened to max-w-3xl with dark code blocks for stack traces — @agent — Readable stack trace viewing

## [0.32.2] — 2026-05-16
### Fixed
- (intermediate build)

## [0.32.1] — 2026-05-16
### Fixed
- Payments export now includes cash, bank, deposit columns — @agent — Staff feedback: deposit report missing payment method breakdown
- Revenue employee export split "Phiếu khám" into Mã phiếu khám (so.code) and Số phiếu điều trị (so.name) — @agent — Staff feedback: column mixing exam code and service
- Calendar export modal presets now use the viewed date instead of always today — @agent — Staff feedback: export includes wrong dates when viewing non-current dates

## 0.32.0 — 2026-05-16
- TestSprite: Complete v2 automated test suite (23/23 tests passing)
- TestSprite: Parallel test runner with 5 workers, ~38s full suite
- TestSprite: MCP config fixed with correct API_KEY in ~/.claude.json
- TestSprite: Added TESTSPRITE_STATUS.md and TESTSPRITE_MCP_SETUP_GUIDE.md
