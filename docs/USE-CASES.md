# TGroup Clinic — Use-Case Catalog

> Every user-facing and system-facing use case: Actor → Trigger → Preconditions → Main flow → Alternate flows → Postconditions → Invariants touched.
> For the full legacy catalog (52 use cases), see the historical snapshot in the repo root `docs/USE_CASES.md`.

## Traceability Convention

When a use case is created or materially edited, add one compact `Traceability` line with known links: related workflow IDs, current contracts/routes, data/tables, invariant IDs, regression tests, and product-map domains. Use `unknown` instead of guessing, and keep route methods current.

---

## UC-001 — Intake New Patient

- **Actor:** Receptionist / Front Desk
- **Trigger:** Customers page → "Thêm khách hàng" / Add button
- **Preconditions:**
  - Receptionist is authenticated with `customers.add` permission.
  - New customer does not yet exist in system (or is being created despite potential phone overlap).
- **Main flow:**
  1. Receptionist opens `/customers`.
  2. Clicks "Add Customer" → `AddCustomerForm` modal opens.
  3. Enters required fields: `name`, `phone`, `email`, `companyid` (location).
  4. Optionally captures face (3 angles: straight, left, right) via `FaceCaptureModal`.
  5. Clicks Save → `POST /api/Partners` with customer data + optional `face_subject_id`.
  6. Backend validates uniqueness (`/api/Partners/check-unique`), creates partner row.
  7. Redirects to customer profile (`/customers/:id`); face registration is async.
- **Alternate flows:**
  - **AF-1 Phone conflict:** Phone overlaps an existing customer → backend returns 400 warning; frontend allows continuing because phone is not a unique key (INV-001).
  - **AF-2 Face capture fails:** Customer still created; face can be registered later via UC-003.
  - **AF-3 Location required but missing:** Form validation blocks submit before API call.
- **Postconditions:**
  - New partner row exists with `customer=true`.
  - If face captured, `partners.face_subject_id` and `face_registered_at` are populated.
- **Invariants touched:** INV-001 (phone non-uniqueness), INV-006 (accent-insensitive search ready), INV-016 (i18n dual-language form labels).

---

## UC-002 — Edit Customer Profile

- **Actor:** Receptionist
- **Trigger:** `/customers/:id` → Edit button on profile card
- **Preconditions:** Customer exists; actor has `customers.edit`.
- **Main flow:**
  1. Receptionist opens customer profile card.
  2. Clicks "Sửa" → `EditCustomerForm` modal.
  3. Updates fields: `name`, `phone`, `email`, assigned sales staff (`salestaffid`).
  4. Clicks Save → `PUT /api/Partners/:id` with updated data.
  5. Frontend resolves saved `salestaffid` against all employees (including inactive migrated staff) for display.
  6. UI refreshes; updated customer card appears.
- **Alternate flows:**
  - **AF-1 Customer code change attempted:** `ref` is immutable after creation; backend ignores or rejects.
  - **AF-2 Assigned employee inactive:** Frontend still displays the saved name; new selections filter to active-only.
- **Postconditions:** Partner row updated; `lastupdated` timestamp refreshed.
- **Invariants touched:** INV-001 (UUID identity), INV-016 (i18n).

---

## UC-003 — Register Customer Face

- **Actor:** Receptionist / Cashier
- **Trigger:** Customer profile → FaceCaptureModal button; or appointment check-in flow
- **Preconditions:** Customer exists; camera available.
- **Main flow:**
  1. Actor clicks face capture button.
  2. System detects/captures face via the live browser camera.
  3. Waits for high-quality sample (size, lighting, angle).
  4. Sends image to `POST /api/face/register` with `partnerId` and image buffer.
  5. Backend uses the configured Face ID provider: local SFace stores 128-dim embeddings in `dbo.customer_face_embeddings`; CompreFace stores examples under subject `partners.id`.
  6. In CompreFace mode, verifies that CompreFace now returns at least one face example for the subject.
  7. Updates `partners.face_subject_id` and `face_registered_at`.
- **Alternate flows:**
  - **AF-1 No face detected:** Camera stays open; shows "Không phát hiện khuôn mặt" / "Face not detected"; only explicit close/cancel dismisses capture.
  - **AF-2 Face too small:** Quality feedback "Xin vui lòng tiến lại gần".
  - **AF-3 Face already registered:** Overwrites with new embedding.
- **Postconditions:** Customer can now use face recognition check-in (UC-007).
- **Invariants touched:** INV-005 (local 128-dim embedding lock), INV-014 (optional face integration startup).
- **Traceability:** Related WF: WF-007. Contracts/routes: `POST /api/face/register`, `POST /api/face/re-register`, `GET /api/face/status/:partnerId`. Data/tables: `dbo.partners.face_subject_id`, `dbo.partners.face_registered_at`, `dbo.customer_face_embeddings` when local provider is active. Tests: `api/tests/faceRecognition.test.js`, `api/src/services/__tests__/comprefaceClient.test.js`, `api/src/services/__tests__/comprefaceFaceProvider.test.js`, `website/src/hooks/__tests__/useFaceRecognition.test.ts`, `website/src/components/shared/FaceCaptureModal.test.tsx`. Product-map domains: `customers-partners`, `integrations`.

---

## UC-004 — Search Customer

- **Actor:** Receptionist
- **Trigger:** Type in `CustomerSelector` autocomplete on any form
- **Preconditions:** Actor has `customers.view` (or domain-specific picker permission).
- **Main flow:**
  1. Actor types search term (`name`, `phone`, `ref`, or appointment name).
  2. Frontend calls `GET /api/Partners?search=<term>`.
  3. Backend searches accent-insensitive across `partners.name`, `phone`, `ref`, linked `appointments.name`.
  4. Returns matching customers; dropdown displays results.
  5. Actor clicks customer → form updates with `partnerId`.
- **Alternate flows:**
  - **AF-1 Empty search:** No results shown until user types ≥1 char (configurable).
  - **AF-2 Multi-location clinic:** Only customers in selected location returned if backend supports location filter.
- **Postconditions:** Form bound to valid `partnerId`.
- **Invariants touched:** INV-006 (accent-insensitive search).

---

## UC-005 — Schedule Appointment

- **Actor:** Receptionist / Scheduler
- **Trigger:** Calendar page → New appointment (click date cell or "+" button)
- **Preconditions:** Customer and doctor exist; location selected; actor has `appointments.add`.
- **Main flow:**
  1. Actor clicks date cell on `/calendar` → `AppointmentForm` modal opens.
  2. Selects customer via `CustomerSelector`.
  3. Selects doctor via `DoctorSelector` (filtered by location).
  4. Sets date and time (default duration 30 min).
  5. Optionally selects service (`productId`).
  6. Clicks Save → `POST /api/Appointments` with full payload.
  7. Backend auto-generates appointment name (`AP000001`), validates state, saves.
  8. Calendar refreshes; appointment appears as colored block.
- **Alternate flows:**
  - **AF-1 Invalid doctor UUID:** Frontend filter prevents selection; backend 400 if bypassed.
  - **AF-2 TimeExpected > 480:** Validation rejects; user must split into multiple appointments.
- **Postconditions:** Appointment row created; calendar state updated.
- **Invariants touched:** INV-002 (AP name auto-gen), INV-006 (accent-insensitive customer search), INV-017 (dense list scroll).

---

## UC-006 — Reschedule Appointment (Drag)

- **Actor:** Receptionist
- **Trigger:** Calendar view → drag appointment block to new date/time
- **Preconditions:** Appointment exists; actor has `appointments.edit`.
- **Main flow:**
  1. Actor views `/calendar` in day/week/month view.
  2. Drags appointment block to new date/time slot.
  3. Frontend calls `PUT /api/Appointments/:id` with new `date` and/or `time`.
  4. Backend validates new date/time, updates `appointments.date`, `aptstate`, `lastupdated`.
  5. Calendar refreshes; appointment moves to new slot.
- **Alternate flows:**
  - **AF-1 Appointment locked:** Frontend disables drag for terminal states (`done`, `cancelled`).
- **Postconditions:** Appointment datetime updated.
- **Invariants touched:** INV-002 (name unchanged).

---

## UC-007 — Check In Patient via Face Recognition

- **Actor:** Receptionist / Front Desk (check-in point)
- **Trigger:** PatientCheckIn module on Overview or standalone kiosk
- **Preconditions:** Appointment exists; customer has face registered (UC-003).
- **Main flow:**
  1. Patient approaches check-in point; camera captures face.
  2. Frontend calls `POST /api/face/recognize` with image buffer.
  3. Backend uses the configured provider: local SFace searches `dbo.customer_face_embeddings`; CompreFace returns subject candidates that map back to `partners.id`.
  4. If match found above threshold, returns matched `partnerId`.
  5. Frontend displays customer name and today's appointments.
  6. Receptionist confirms check-in → `PUT /api/Appointments/:id` with `state='arrived'`.
  7. Appointment marked arrived; moves to "Hôm nay" queue.
- **Alternate flows:**
  - **AF-1 No face detected:** Camera stays open; shows "Không phát hiện khuôn mặt" / "Face not detected"; only explicit close/cancel dismisses capture.
  - **AF-2 No face match:** Show "Không nhận diện được" and offer manual customer search (UC-004).
  - **AF-3 No face registered:** Fallback to manual `CustomerSelector`.
  - **AF-4 No appointments today:** Show "Hôm nay không có lịch hẹn".
- **Postconditions:** Appointment state = `arrived`; check-in timestamp recorded.
- **Invariants touched:** INV-005 (embedding dimension), INV-014 (Compreface optional startup).
- **Traceability:** Related WF: WF-007, UC-003, UC-008. Contracts/routes: `POST /api/face/recognize`, `GET /api/Appointments?partnerId=...&date=...`, `PUT /api/Appointments/:id`. Data/tables: `dbo.customer_face_embeddings`, `dbo.partners`, `dbo.appointments`. Tests: `api/tests/faceRecognition.test.js`, `website/src/hooks/__tests__/useFaceRecognition.test.ts`, `website/src/components/shared/GlobalFaceIdButton.test.tsx`, `website/src/components/modules/PatientCheckIn.test.tsx`. Product-map domains: `customers-partners`, `appointments-calendar`, `integrations`.

---

## UC-007A — Public Face ID Kiosk Check-In

- **Actor:** Patient / Front Desk phone or tablet
- **Trigger:** Open public `/checkin` and look at the camera.
- **Preconditions:** Camera available; customer has provider-verified Face ID registration (UC-003).
- **Main flow:**
  1. Page opens without login and starts front-camera capture using iOS-friendly camera constraints.
  2. Frontend posts image to `POST /api/public/face/checkin`.
  3. Backend runs recognize-only Face ID with the configured provider.
  4. If exactly one high-confidence match exists, API returns a minimal greeting only.
  5. Page shows success briefly, then resets for the next customer.
- **Alternate flows:**
  - **AF-1 No match:** API returns `{ result: 'no_match' }`; page tells customer to check in at the desk.
  - **AF-2 Multiple candidates:** API returns only candidate count; page tells customer to check in at the desk.
  - **AF-3 Abuse/repeat attempts:** API returns HTTP 429 and the page shows the retry message.
- **Postconditions:** No database write and no session/token is issued. Appointment arrival remains a separate staff-confirmed workflow unless a later product decision changes it.
- **Invariants touched:** INV-SCHEMA-006A (CompreFace provider-backed status), public Face ID privacy boundary.
- **Traceability:** Related WF: WF-007. Contracts/routes: `POST /api/public/face/checkin`. Tests: `api/src/routes/__tests__/faceCheckin.test.js`, `website/src/pages/CheckIn/CheckIn.test.tsx`, `website/src/lib/api/__tests__/faceRecognition.test.ts`, `website/src/components/shared/FaceCaptureModal.test.tsx`. Product-map domains: `customers-partners`, `integrations`.

---

## UC-008 — Check In Patient Manually

- **Actor:** Receptionist
- **Trigger:** Calendar or appointment list → Mark Arrived
- **Preconditions:** Appointment exists; actor has `appointments.edit`.
- **Main flow:**
  1. Actor finds appointment by search or date scan.
  2. Clicks "Đã đến" → confirmation dialog.
  3. Confirms → `PUT /api/Appointments/:id` with `state='arrived'`.
  4. UI moves card to "Hôm nay" section.
- **Postconditions:** Same as UC-007.
- **Invariants touched:** None additional.

## UC-009 — Record Service Delivered (Convert Appointment)

- **Actor:** Receptionist / Doctor
- **Trigger:** Calendar → right-click appointment or "Convert to Service"
- **Preconditions:** Appointment in `arrived` or `in-progress`; actor has `services.edit`.
- **Main flow:**
  1. Actor clicks appointment in arrived state.
  2. Clicks "Chuyển đổi thành Dịch vụ".
  3. Frontend opens `ConvertToServiceForm` with appointment data.
  4. Selects service(s) from catalog; sets quantity per tooth if applicable.
  5. Clicks Save → `POST /api/SaleOrders` with customer, location, line items.
  6. Backend creates `saleorder` + `saleorderlines`; appointment moves to `done`.
- **Alternate flows:**
  - **AF-1 Service not in catalog:** Must create service first (UC-041 analog).
  - **AF-2 Tooth picker missing data:** Validation fails for multi-tooth services.
- **Postconditions:** SaleOrder created; appointment linked; revenue recognized.
- **Invariants touched:** INV-003 (residual non-negative on any immediate payment), INV-017 (dense list).

---

## UC-010 — Take Deposit and Allocate

- **Actor:** Sales / Cashier
- **Trigger:** Customer profile → "Đặt cọc" button
- **Preconditions:** Customer exists; actor has `payment.add`.
- **Main flow:**
  1. Actor clicks Deposit button.
  2. Frontend opens modal showing customer's open sale orders (`residual > 0`).
  3. Actor enters amount and allocation method (auto FIFO or manual per-order).
  4. Clicks Save → `POST /api/Payments` with `deposit_type='deposit'` and allocations.
  5. Backend validates no over-allocation (INV-012), generates receipt number (INV-011).
  6. Inserts payment + allocations; updates `saleorders.residual`.
- **Alternate flows:**
  - **AF-1 Allocated amount > residual:** Backend rejects with 400; frontend shows error.
  - **AF-2 No allocations:** Payment classified as unallocated deposit (wallet top-up).
- **Postconditions:** Payment row created; allocations inserted; residuals updated.
- **Invariants touched:** INV-003 (residual ≥ 0), INV-004 (deposit heuristic), INV-010 (allocation immutability), INV-011 (receipt year reset), INV-012 (over-allocation rejection).

---

## UC-011 — Process Payment Against Invoice

- **Actor:** Cashier
- **Trigger:** Payment page → New payment
- **Preconditions:** Invoice (saleorder) exists with residual > 0; actor has `payment.add`.
- **Main flow:**
  1. Actor opens `/payment` or customer profile Payments tab.
  2. Selects customer and outstanding invoice.
  3. Enters amount, method (`cash`, `bank_transfer`, `mixed`), and optional notes.
  4. Clicks Save → `POST /api/Payments` with allocations.
  5. Backend validates, inserts payment + allocations, updates residual.
- **Alternate flows:**
  - **AF-1 Mixed payment:** Actor specifies `cash_amount`, `bank_amount`, `deposit_used` breakdown.
  - **AF-2 Full payment:** `isFullPayment=true` flag covers entire remaining balance.
- **Postconditions:** Invoice residual reduced; payment history updated.
- **Invariants touched:** INV-003, INV-012.
- **Traceability:** Related WF: WF-003, WF-010. Contracts/routes: `POST /api/Payments`. Data/tables: `dbo.payments`, `dbo.payment_allocations`, `dbo.saleorders`, `dbo.dotkhams` when allocated to a medical record. Tests: `website/src/components/payment/__tests__/PaymentForm.submit.test.tsx`, `website/src/lib/allocatePaymentSources.test.ts`, `api/tests/readRoutePermissions.test.js`; backend allocation/void/refund edge coverage remains a known gap. Product-map domains: `payments-deposits`, `services-catalog`, `customers-partners`.

---

## UC-012 — Void Payment

- **Actor:** Manager / Admin
- **Trigger:** Payment history → Void button
- **Preconditions:** Payment exists with `status='posted'`; actor has `payment.void`.
- **Main flow:**
  1. Actor finds payment in `PaymentHistory`.
  2. Clicks Void → confirmation modal.
  3. Confirms → `POST /api/Payments/:id/void`.
  4. Current backend marks `status='voided'`, deletes payment allocation rows for that payment, and restores `saleorders.residual` or `dotkhams.amountresidual`.
- **Alternate flows:**
  - **AF-1 Already voided:** Button disabled; backend idempotent.
- **Postconditions:** Payment status = `voided`; invoice or medical-record residual is restored by the current route.
- **Invariants touched:** INV-003 (residual non-negative). Current route behavior diverges from INV-010's immutable-allocation wording; fix the invariant or route before treating void semantics as locked.
- **Traceability:** Related WF: WF-003. Contracts/routes: `POST /api/Payments/:id/void`, `DELETE /api/Payments/:id` legacy destructive path. Data/tables: `dbo.payments`, `dbo.payment_allocations`, `dbo.saleorders`, `dbo.dotkhams`. Tests: `api/tests/readRoutePermissions.test.js`; backend void math coverage remains a known gap. Product-map domains: `payments-deposits`.

---

## UC-013 — Generate Revenue Report Export

- **Actor:** Manager / Admin
- **Trigger:** Reports page → Revenue → Export Excel
- **Preconditions:** Actor has the export permission for the selected export type; date range selected.
- **Main flow:**
  1. Actor navigates to `/reports/revenue`.
  2. Sets date range, location, doctor filters.
  3. Clicks Export → frontend calls `POST /api/Exports/revenue-flat/download` with `{ filters }`.
  4. Backend runs the legacy flat revenue export builder, using posted service payment allocations and allocation proration.
  5. File downloads; an `exports_audit` row is attempted on a best-effort basis.
- **Alternate flows:**
  - **AF-1 Large dataset >60s:** Nginx timeout must be ≥300s (INV-019).
  - **AF-2 No data:** Returns empty workbook with headers.
- **Postconditions:** Excel file downloaded; audit log attempted without blocking the workbook response.
- **Invariants touched:** INV-019 (nginx timeout), INV-020 (version bump if export builder changed).
- **Traceability:** Related WF: WF-005, WF-013, UC-019. Contracts/routes: `POST /api/Reports/revenue/summary`, `POST /api/Reports/revenue/trend`, `POST /api/Reports/revenue/by-location`, `POST /api/Reports/revenue/by-doctor`, `POST /api/Reports/revenue/by-category`, `POST /api/Reports/cash-flow/summary`, `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download` with type `revenue-flat`. Data/tables: `dbo.payment_allocations`, `dbo.payments`, `dbo.saleorders`, `dbo.saleorderlines`, `dbo.partners`, `dbo.products`, `dbo.companies`, `dbo.customersources`, `dbo.exports_audit`. Tests: `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js`, `api/src/routes/reports/__tests__/servicesBreakdown.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js`, `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `website/src/hooks/__tests__/useReportData.test.ts`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`. Product-map domains: `reports-analytics`, `payments-deposits`, `services-catalog`, `customers-partners`, `employees-hr`.

---

## UC-014 — Login with Remember Me

- **Actor:** Any staff
- **Trigger:** Submit `/login` form
- **Preconditions:** Employee record exists with `employee=true`, `active=true`, `isdeleted=false`, and `password_hash` set.
- **Main flow:**
  1. Actor enters email, password, checks "Remember Me".
  2. Frontend calls `POST /api/Auth/login`.
  3. Backend validates credentials, resolves effective permissions and location scope.
  4. Signs JWT (`expiresIn: rememberMe ? '60d' : '24h'`).
  5. Returns token + user + permissions.
  6. Frontend stores token in `localStorage`; redirects to `/overview`.
- **Alternate flows:**
  - **AF-1 Invalid credentials:** 401 with generic message (rate limiter tracks failed attempts).
  - **AF-2 Missing password_hash:** 401 (legacy employee not yet activated).
  - **AF-3 Rate limited:** 429 after excessive failures.
- **Postconditions:** Session active; `AuthContext` populated; polling hooks start.
- **Invariants touched:** INV-007 (JWT_SECRET required), INV-008 (shared permission resolution), INV-018 (local-first deploy discipline for auth changes).

---

## UC-015 — Resolve Permission Discrepancy

- **Actor:** Admin
- **Trigger:** Employee reports "No permissions" after login
- **Preconditions:** Admin has `permissions.edit`.
- **Main flow:**
  1. Admin opens `/permissions` (PermissionBoard).
  2. Searches employee; inspects `tier_id` and `effectivePermissions`.
  3. If `tier_id` is NULL, assigns a permission group.
  4. If override needed, adds/removes `permission_overrides` row.
  5. Employee re-logs in to refresh permissions.
- **Postconditions:** Employee's next login resolves correct permissions.
- **Invariants touched:** INV-008 (shared resolution), INC-20260506-01 (tier_id NULL handling).

---

## UC-016 — System Telemetry Ingestion

- **Actor:** System (frontend ErrorBoundary)
- **Trigger:** Uncaught exception in React render
- **Preconditions:** App is running; network available.
- **Main flow:**
  1. ErrorBoundary catches exception.
  2. Frontend calls `POST /api/telemetry/errors` (no auth required).
  3. Backend inserts `dbo.error_events` row.
  4. First-seen errors auto-create a `source='auto'` feedback thread and queue a Lark alert when `LARK_FEEDBACK_WEBHOOK_URL` is configured.
  5. Admin can view, update, summarize, and attach fix attempts to telemetry in Settings/System tooling.
- **Postconditions:** Error event logged with stack trace and browser info; optional Lark alert points admins back to `/feedback`.
- **Invariants touched:** INV-018 when telemetry is used to diagnose deploy/runtime incidents.
- **Traceability:** Related WF: none yet. Contracts/routes: `POST /api/telemetry/errors` public ingestion, `GET /api/telemetry/errors`, `PUT /api/telemetry/errors/:id`, `POST /api/telemetry/errors/:id/fix-attempts`, `GET /api/telemetry/stats`, `POST /api/telemetry/version`. Data/tables: `dbo.error_events`, `dbo.error_fix_attempts`, `dbo.version_events`. Tests: `api/tests/telemetry.test.js`, `api/tests/telemetryAuth.test.js`, `website/src/__tests__/useVersionCheck.test.ts`. Product-map domains: `settings-system`.

---

## UC-017 — IP Access Block / Allow

- **Actor:** Admin
- **Trigger:** Settings → IP Access Control
- **Preconditions:** Admin has `settings.view` to inspect settings and `settings.edit` to mutate mode or entries.
- **Main flow:**
  1. Admin opens `/settings` → IP Access Control.
  2. Frontend loads `GET /api/IpAccess/settings` and `GET /api/IpAccess/entries`.
  3. Admin sets mode (`allow_all`, `block_all`, `whitelist_only`, or `blacklist_block`) and creates/updates/deletes IP entries.
  4. Backend invalidates the IP access cache after mutation.
  5. `enforceIpAccess` checks non-`/IpAccess/*` API requests using the cached mode and active entries.
  6. Blocked requests receive 403 with the access-denial reason; `/api/IpAccess/*` remains reachable so admins can recover from lockout through normal permissions.
- **Postconditions:** IP gate reflects the selected mode and active entries; management endpoints remain available behind `settings.view` / `settings.edit`.
- **Invariants touched:** INV-008 (permission checks stay aligned), INV-018 for deploy/runtime verification.
- **Traceability:** Related WF: WF-006. Contracts/routes: `GET /api/IpAccess/settings`, `PUT /api/IpAccess/settings`, `GET /api/IpAccess/entries`, `POST /api/IpAccess/entries`, `PUT /api/IpAccess/entries/:id`, `DELETE /api/IpAccess/entries/:id`, `GET /api/IpAccess/check`. Data/tables: `dbo.ip_access_settings`, `dbo.ip_access_entries`. Tests: `website/src/__tests__/IpAccessControl.component.test.tsx`, `website/src/__tests__/ipAccessControl.types.test.ts`, `website/src/__tests__/ipValidation.edgecases.test.ts`, `website/e2e/login-and-settings.spec.ts`; backend middleware/route E2E remains a known gap. Product-map domains: `settings-system`, `auth`.

---

## UC-018 — Monthly Plan Installment Payment

- **Actor:** Cashier
- **Trigger:** Customer profile → Monthly Plans → Pay Installment
- **Preconditions:** Monthly plan exists with unpaid installment; current route requires `payment.edit`.
- **Main flow:**
  1. Actor selects installment to pay.
  2. Enters payment method and amount.
  3. Clicks Pay → `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`.
  4. Backend updates the installment `status='paid'`, `paid_date`, and `paid_amount`.
  5. If all installments are paid, backend marks the monthly plan `status='completed'`; otherwise it advances the next pending installment to `upcoming`.
- **Postconditions:** Installment status and plan status are updated; current route does not create a `dbo.payments` row by itself.
- **Invariants touched:** INV-020 when runtime code changes; payment-ledger invariants apply only if this flow is later wired to `dbo.payments`.
- **Traceability:** Related WF: WF-012. Contracts/routes: `GET /api/MonthlyPlans`, `GET /api/MonthlyPlans/:id`, `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`. Data/tables: `dbo.monthlyplans`, `dbo.monthlyplan_items`, `dbo.planinstallments`; no current write to `dbo.payments` from the installment-pay route. Tests: no dedicated monthly-plan installment tests yet; see `docs/TEST-MATRIX.md` gap. Product-map domains: `payments-deposits`, `customers-partners`.

---

## UC-019 — Employee Revenue Export

- **Actor:** Manager / Admin
- **Trigger:** `/reports/revenue` → employee revenue Excel export controls
- **Preconditions:** Actor has `reports.export`; date range selected; optional employee type and employee filters selected.
- **Main flow:**
  1. Actor sets date range, location filter, employee type filter.
  2. Clicks Export → `POST /api/Exports/report-sales-employees/download` with `{ filters }`.
  3. Backend queries `payments`, `payment_allocations`, `saleorders`, `partners`, and `companies` using the requested employee role attribution.
  4. Groups by employee; builds Excel with revenue per employee.
  5. File downloads and an `exports_audit` row is attempted.
- **Postconditions:** Excel downloaded; audit log written.
- **Invariants touched:** INV-019 (nginx timeout).
- **Traceability:** Related WF: WF-005, WF-013, UC-013. Contracts/routes: `POST /api/Exports/report-sales-employees/preview`, `POST /api/Exports/report-sales-employees/download`. Data/tables: `dbo.payment_allocations`, `dbo.payments`, `dbo.saleorders`, `dbo.partners`, `dbo.companies`, `dbo.exports_audit`. Tests: `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`, `website/e2e/export-downloads.spec.ts` for broader export downloads. Product-map domains: `reports-analytics`, `payments-deposits`, `employees-hr`.

---

## UC-020 — Feedback Thread Moderation

- **Actor:** Admin
- **Trigger:** `/feedback` admin thread inbox
- **Preconditions:** Actor has the scoped feedback permission for the action (`feedback.view`, `feedback.reply`, `feedback.edit`, or `feedback.delete`).
- **Main flow:**
  1. Staff creates a feedback thread via the floating feedback widget; backend commits the thread/message and queues an optional Lark alert when configured.
  2. Admin views list of feedback threads.
  3. Opens thread; reads messages and attachments.
  4. Replies or changes status (`pending` → `in_progress` → `resolved` / `ignored`).
  5. Status update saved via `PATCH /api/Feedback/all/:threadId/status`; admin reply saved via `POST /api/Feedback/all/:threadId/reply`.
- **Postconditions:** Thread status updated; reporter sees resolution; optional Lark alert exists for initial thread creation only.
- **Invariants touched:** INV-016 (i18n labels).
- **Traceability:** Related WF: WF-011. Contracts/routes: `POST /api/Feedback`, `GET /api/Feedback/all`, `GET /api/Feedback/all/:threadId`, `POST /api/Feedback/all/:threadId/reply`, `PATCH /api/Feedback/all/:threadId/status`, `DELETE /api/Feedback/all/:threadId`. Data/tables: `dbo.feedback_threads`, `dbo.feedback_messages`, `dbo.feedback_attachments`, `api/uploads/feedback/`; optional outbound Lark webhook via `api/src/services/larkNotifier.js`. Tests: `api/tests/feedbackAttachments.test.js`, `api/src/services/__tests__/larkNotifier.test.js`, `api/tests/readRoutePermissions.test.js`, `website/e2e/phase2-quick-features.spec.ts` indirect; live Lark delivery and attachment storage/deletion E2E remain known gaps. Product-map domains: `feedback-cms`, `auth`, `integrations`.

---

## UC-021 — Read DotKham / Medical-History Context Without Losing Long Text

- **Actor:** Receptionist / Doctor
- **Trigger:** Customer profile medical-history or health-record surface renders long migrated notes / DotKham-linked text.
- **Preconditions:** Customer exists; actor has customer/profile visibility.
- **Main flow:**
  1. Actor opens `/customers/:id`.
  2. Frontend reads customer profile and linked medical-record context.
  3. Long medical-history or DotKham-related text is rendered in a bounded cell or card using runtime overflow detection.
  4. Hover or expand action reveals the full text without navigating away or clipping Vietnamese content.
- **Alternate flows:**
  - **AF-1 No medical history:** Empty state distinguishes missing data from load failure.
  - **AF-2 DotKham record is read-only:** UI shows the record context but does not offer unsupported edits.
- **Postconditions:** Staff can inspect long migrated clinical notes without breaking dense profile layout.
- **Invariants touched:** INV-015 (expandable overflow), INV-016 (i18n), INV-017 (dense list scroll).
- **Traceability:** Related WF: WF-014. Contracts/routes: `GET /api/Partners/:id`, `GET /api/DotKhams`. Data/tables: `dbo.partners.medicalhistory`, `dbo.dotkhams`, `dbo.dotkhamsteps`. Tests: `website/src/components/customer/CustomerProfile.test.tsx`, `website/src/hooks/__tests__/useCustomerProfile.date-normalization.test.tsx`, no dedicated DotKham tooltip regression yet. Product-map domains: `customers-partners`, `services-catalog`, `payments-deposits` when DotKham allocations are shown.

---

## UC-022 — Investor Views Assigned Customers

- **Actor:** Investor employee
- **Trigger:** Investor logs in and opens customer, service, payment, appointment, or report surfaces.
- **Preconditions:** Employee row exists in `dbo.partners` with `employee=true`; `partners.tier_id` points to permission group `investor`; `dbo.investor_clients` contains the customers they may see; actor has only view permissions from the seeded investor group.
- **Main flow:**
  1. Investor logs in through the normal employee login flow.
  2. Backend resolves effective permissions and `resolveInvestorScope()`.
  3. Investor opens `/customers` or a customer-linked report/API route.
  4. Backend applies the `dbo.investor_clients` customer allowlist to reads and aggregates.
  5. Frontend renders only allowlisted customer data using existing pages.
- **Alternate flows:**
  - **AF-1 Empty allowlist:** Investor sees empty lists/aggregates and no customer detail.
  - **AF-2 Direct URL to non-allowlisted customer:** Backend returns 404 or an empty scoped result.
  - **AF-3 Write attempt:** Existing `requirePermission` gates deny customer, appointment, payment, refund, void, or monthly-plan mutations because the seeded investor group is read-only.
- **Postconditions:** Investor can inspect assigned customers without seeing unrelated clinic data or using a parallel user system.
- **Invariants touched:** INV-001 (partners UUID identity), INV-008 (shared permission resolution), INV-021 (investor employee allowlist scope).
- **Traceability:** Related WF: none yet. Contracts/routes: `resolveInvestorScope()` plus existing customer, appointment, payment, service, dashboard, and report routes. Data/tables: `dbo.partners`, `dbo.permission_groups`, `dbo.group_permissions`, `dbo.investor_clients`. Tests: `api/src/services/__tests__/permissionService.test.js`, `api/tests/investorIdorScoping.test.js`, `api/tests/investorScopeRoutePermissions.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js`. Product-map domains: `auth`, `customers-partners`, `appointments-calendar`, `payments-deposits`, `reports-analytics`.
