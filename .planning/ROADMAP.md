# Roadmap — TG Clinic KOL Integration

## Phase 1: Foundation & VietQR
**Goal:** Enable Vietnamese QR payment generation and clinic bank account configuration.

**Requirements:** PAY-01, PAY-02, PAY-03, PAY-04, DATA-02, DATA-04

**Success Criteria:**
1. User can open VietQR modal from PaymentForm and see a generated QR image
2. Bank settings can be saved and retrieved via API
3. Payment proof upload flow works end-to-end
4. All TDD tests pass (unit + integration + E2E TC-VQ1)

**UI hint:** yes

---

## Phase 2: Facial Recognition Frontend
**Goal:** Build face enrollment and scanning UI components.

**Requirements:** FACE-01, FACE-02

**Success Criteria:**
1. FaceEnrollmentModal opens from AddCustomerForm and captures face
2. FaceScannerModal opens from CustomerProfile and shows match result
3. Face-api models lazy-load only when modals open
4. All frontend integration tests pass

**UI hint:** yes

---

## Phase 3: Facial Recognition Backend
**Goal:** Implement biometric data storage and matching APIs.

**Requirements:** FACE-04, DATA-01, DATA-03

**Success Criteria:**
1. DB migrations for `partner_biometrics` and `partner_biometric_images` succeed
2. POST /api/customers/:id/biometric/enroll stores descriptor and image
3. POST /api/customers/biometric/match returns matched customer with confidence
4. E2E tests TC-FR1 and TC-FR2 pass

**UI hint:** no

---

## Phase 4: Polish & Settings
**Goal:** Add bank config UI, face-enrolled badges, and finalize.

**Requirements:** FACE-03

**Success Criteria:**
1. Settings page has bank account configuration with bank selector
2. Customers list shows ScanFace badge for enrolled customers
3. Vietnamese i18n strings added for all new UI
4. Full E2E suite passes, CHANGELOG.json updated, version bumped

**UI hint:** yes
