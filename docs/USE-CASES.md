# TGroup Clinic — Use-Case Catalog

> Every user-facing and system-facing use case: Actor → Trigger → Preconditions → Main flow → Alternate flows → Postconditions → Invariants touched.
> For the full legacy catalog (52 use cases), see the historical snapshot in the repo root `docs/USE_CASES.md`.

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
  2. System detects face via live camera (OpenCV YuNet).
  3. Waits for high-quality sample (size, lighting, angle).
  4. Sends image to `POST /api/face/register` with `partnerId` and image buffer.
  5. Backend extracts 128-dim embedding (SFace) and stores in `dbo.customer_face_embeddings`.
  6. Updates `partners.face_subject_id` and `face_registered_at`.
- **Alternate flows:**
  - **AF-1 No face detected after 10s:** Camera stays open; shows "Vui lòng hướng mặt vào camera".
  - **AF-2 Face too small:** Quality feedback "Xin vui lòng tiến lại gần".
  - **AF-3 Face already registered:** Overwrites with new embedding.
- **Postconditions:** Customer can now use face recognition check-in (UC-007).
- **Invariants touched:** INV-005 (128-dim embedding lock).

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
  3. Backend extracts embedding, searches `dbo.customer_face_embeddings`.
  4. If match found (distance < threshold), returns matched `partnerId`.
  5. Frontend displays customer name and today's appointments.
  6. Receptionist confirms check-in → `PUT /api/Appointments/:id` with `state='arrived'`.
  7. Appointment marked arrived; moves to "Hôm nay" queue.
- **Alternate flows:**
  - **AF-1 No face match:** Show "Không nhận diện được" and offer manual customer search (UC-004).
  - **AF-2 No face registered:** Fallback to manual `CustomerSelector`.
  - **AF-3 No appointments today:** Show "Hôm nay không có lịch hẹn".
- **Postconditions:** Appointment state = `arrived`; check-in timestamp recorded.
- **Invariants touched:** INV-005 (embedding dimension), INV-014 (Compreface optional startup).

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

---

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

---

## UC-012 — Void Payment

- **Actor:** Manager / Admin
- **Trigger:** Payment history → Void button
- **Preconditions:** Payment exists with `status='posted'`; actor has `payment.void`.
- **Main flow:**
  1. Actor finds payment in `PaymentHistory`.
  2. Clicks Void → confirmation modal.
  3. Confirms → `POST /api/Payments/:id/void`.
  4. Backend marks `status='voided'`; does NOT reverse allocations (INV-010).
- **Alternate flows:**
  - **AF-1 Already voided:** Button disabled; backend idempotent.
- **Postconditions:** Payment status = `voided`; allocations remain in ledger for audit.
- **Invariants touched:** INV-010 (allocation immutability).

---

## UC-013 — Generate Revenue Report Export

- **Actor:** Manager / Admin
- **Trigger:** Reports page → Revenue → Export Excel
- **Preconditions:** Actor has `reports.view`; date range selected.
- **Main flow:**
  1. Actor navigates to `/reports/revenue`.
  2. Sets date range, location, doctor filters.
  3. Clicks Export → frontend calls `GET /api/Exports/revenue/download?...`.
  4. Backend runs SQL aggregation, builds Excel workbook.
  5. File downloads; `exports_audit` row created.
- **Alternate flows:**
  - **AF-1 Large dataset >60s:** Nginx timeout must be ≥300s (INV-019).
  - **AF-2 No data:** Returns empty workbook with headers.
- **Postconditions:** Excel file downloaded; audit log written.
- **Invariants touched:** INV-019 (nginx timeout), INV-020 (version bump if export builder changed).

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
  4. Admin can view telemetry in Settings → System.
- **Postconditions:** Error event logged with stack trace and browser info.
- **Invariants touched:** None (public endpoint).

---

## UC-017 — IP Access Block / Allow

- **Actor:** Admin
- **Trigger:** Settings → IP Access Control
- **Preconditions:** Admin has `settings.edit`; company selected.
- **Main flow:**
  1. Admin enables IP access control for a company.
  2. Adds allowed IP addresses to whitelist.
  3. Backend enforces `enforceIpAccess` middleware on all non-public routes.
  4. Requests from non-whitelisted IPs receive 403.
- **Postconditions:** Only whitelisted IPs can access API for that company scope.
- **Invariants touched:** None additional.

---

## UC-018 — Monthly Plan Installment Payment

- **Actor:** Cashier
- **Trigger:** Customer profile → Monthly Plans → Pay Installment
- **Preconditions:** Monthly plan exists with unpaid installment; actor has `payment.add`.
- **Main flow:**
  1. Actor selects installment to pay.
  2. Enters payment method and amount.
  3. Clicks Pay → `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`.
  4. Backend records payment, updates installment `status='paid'`.
- **Postconditions:** Installment marked paid; plan balance reduced.
- **Invariants touched:** INV-003 (if allocation to saleorder occurs).

---

## UC-019 — Employee Revenue Export

- **Actor:** Manager / Admin
- **Trigger:** Reports → Employees → Export Excel
- **Preconditions:** Actor has `reports.view`.
- **Main flow:**
  1. Actor sets date range, location filter, employee type filter.
  2. Clicks Export → `GET /api/Exports/employees/download?...`.
  3. Backend queries `payments`, `payment_allocations`, `saleorders`, `partners`.
  4. Groups by employee; builds Excel with revenue per employee.
  5. File downloads.
- **Postconditions:** Excel downloaded; audit log written.
- **Invariants touched:** INV-019 (nginx timeout).

---

## UC-020 — Feedback Thread Moderation

- **Actor:** Admin
- **Trigger:** Settings → Feedback Inbox
- **Preconditions:** Actor has `feedback.admin`.
- **Main flow:**
  1. Admin views list of feedback threads.
  2. Opens thread; reads messages and attachments.
  3. Replies or changes status (`pending` → `in_progress` → `resolved` / `ignored`).
  4. Status update saved via `PUT /api/feedback/threads/:id`.
- **Postconditions:** Thread status updated; reporter sees resolution.
- **Invariants touched:** INV-016 (i18n labels).
