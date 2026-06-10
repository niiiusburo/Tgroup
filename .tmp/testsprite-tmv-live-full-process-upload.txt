# TestSprite Upload PRD: TMV / CTV Live Full Process Debug

Upload purpose: TestSprite Web Portal live UI run.
Do not treat this as localhost or MCP testing.

Target domain: https://tmv.2checkin.com
Starting URL: https://tmv.2checkin.com/login

Admin credential for TestSprite Authentication:

- Username/email: t@clinic.vn
- Password: 123123

Preflight reachability note:

- On 2026-06-09, the local Codex machine and TestSprite both failed to reach the retired `ctv.2checkin.com` hostname.
- The corrected live target is `https://tmv.2checkin.com`; local `dig +short tmv.2checkin.com` returned `76.13.16.68`, and `curl -I -L https://tmv.2checkin.com` returned HTTP 200 from nginx.
- TestSprite must run this handoff against `tmv.2checkin.com`; do not navigate to `ctv.2checkin.com`.

## Objective

Run a full live CTV workflow with disposable test data:

1. Log in as admin.
2. Create a test employee.
3. Create two test CTV accounts.
4. Create a test client under CTV A.
5. Verify whether CTV B can or cannot book/refer that same client while the client is already claimed by CTV A.
6. Create a service under the CTV A client if the UI supports a safe test service-card path.
7. Cross-check that CTV B still cannot claim/book the client after the client already has service activity with CTV A.
8. Generate a CTV QR discount code and verify voucher/history surfaces.
9. Record every created item for cleanup.

## Test Data Naming

Use only disposable values that visibly mark test records:

- Employee name prefix: `ZZ_TESTSPRITE_EMP_`
- CTV A name prefix: `ZZ_TESTSPRITE_CTV_A_`
- CTV B name prefix: `ZZ_TESTSPRITE_CTV_B_`
- Client name prefix: `ZZ_TESTSPRITE_CLIENT_`
- Notes field text: `Created by TestSprite live debug run - safe to delete after verification`
- Use unique timestamp suffixes for all names and phone numbers.

The final report must list every created entity:

| Entity | Name | Phone/email | ID if visible/API observed | CTV owner | LOB | Status | Cleanup action |
|---|---|---|---|---|---|---|---|

## Safety Rules

- This run is approved to create disposable employees, CTVs, a test client, a test appointment/booking, a test service card only if required for the CTV ownership cross-check, and a QR discount code.
- Do not create real payments, deposits, refunds, voids, payouts, or allocation changes.
- Do not change production staff permissions except for the disposable test employee if the app requires an employee role.
- Do not hard-delete real production records.
- If a cleanup action is not safe because the test entity gained service/earning history, leave it inactive/suspended and report it clearly for manual cleanup.
- Preserve screenshots/video/network evidence for every create, block, and cleanup step.

## Role And LOB Setup

- Default LOB: Cosmetic / `Tham my` / `Thẩm mỹ`.
- If a LOB toggle appears, select Cosmetic first.
- For cross-checks, stay in one LOB unless a specific step tests cross-LOB behavior.
- Admin account should have access to Commission, CTV, Customers, Employees, Calendar/Booking, Services, and public/CTV routes.

## Required Test Cases

### TC-CTV-001: Admin Login And Domain Confirmation

Steps:

1. Open `https://tmv.2checkin.com/login`.
2. Log in using the admin credential above.
3. Confirm the final page is inside the `tmv.2checkin.com` domain.
4. Select Cosmetic / `Thẩm mỹ` if a LOB selector appears.

Expected:

- Login succeeds.
- Admin shell or CTV/TMV app shell loads without blank page.
- If domain does not resolve or redirects unexpectedly, classify as setup/domain blocker and stop.

### TC-CTV-002: Create Disposable Employee

Steps:

1. Navigate to `/employees`.
2. Create employee `ZZ_TESTSPRITE_EMP_<timestamp>`.
3. Use the lowest practical role/tier, not Super Admin, unless the app forces a default.
4. Record generated employee ID/row details if visible.

Expected:

- Employee creation succeeds.
- New employee appears in list/search.
- If the form defaults to Super Admin, record as UX/security issue.

Cleanup:

- Deactivate or delete only the created `ZZ_TESTSPRITE_EMP_*` record at the end if the UI/API supports safe cleanup.

### TC-CTV-003: Create CTV A And CTV B

Steps:

1. Navigate to `/commission?tab=ctvs` or `/commission`, CTV tab.
2. Create CTV A: `ZZ_TESTSPRITE_CTV_A_<timestamp>`.
3. Create CTV B: `ZZ_TESTSPRITE_CTV_B_<timestamp>`.
4. Use unique phones and a known temporary password.
5. Include Cosmetic LOB and Dental only if the form forces it.
6. Record both CTVs in the entity table.

Expected:

- Both CTVs are created and visible in the CTV list.
- If credential cards appear, preserve screenshots.
- If admin-created CTV login fails later, classify as auth/CTV credential bug.

Cleanup:

- Suspend/deactivate both CTVs at the end if supported.

### TC-CTV-004: Create Client Under CTV A

Steps:

1. Use the admin CTV/customer/referral flow to create client `ZZ_TESTSPRITE_CLIENT_<timestamp>` under CTV A.
2. If the app requires booking instead of direct client creation, create a test booking/appointment using CTV A.
3. Record client name, phone, visible ID, selected LOB, booking ID if visible, and CTV owner.

Expected:

- Client is created or reclaimed under CTV A.
- Client appears in the relevant CTV/referral/new-client surface.
- Client can be searched by name/phone.

### TC-CTV-005: CTV B Cannot Claim Already-Claimed Client

Steps:

1. Attempt to book/refer/create the same client phone under CTV B in the same LOB.
2. Do not modify the original CTV A owner if the app warns or blocks.
3. Capture network response and visible error.

Expected:

- The app should block duplicate active same-LOB CTV ownership.
- Expected backend classification may be `B_CLIENT_CLAIMED`, `U_DUPLICATE_PHONE`, or equivalent user-facing duplicate/claimed error.
- No duplicate client should be created under CTV B.
- CTV A ownership must remain unchanged.

If it allows CTV B to claim the same client, classify as high-priority product bug.

### TC-CTV-006: Service Activity Locks Ownership Against CTV B

Steps:

1. If safe and supported, create a test service card for the CTV A client.
2. Select or inherit CTV A as the CTV owner.
3. Do not create a payment.
4. Verify service card appears under the client.
5. Attempt again to book/refer/claim that same client under CTV B.

Expected:

- CTV A service activity remains attached to CTV A.
- CTV B should not be able to take over ownership after service activity exists.
- No payment, payout, or real money action is created.
- If CTV earnings are visible from service-card creation, record whether pending earnings were created for CTV A.

If service-card creation is not safe or requires money action, skip the service write and mark as `needs manual approval`.

### TC-CTV-007: CTV QR Generation And Voucher History

Steps:

1. Log in as CTV A if the created CTV credentials work, or use an approved known-good CTV credential if provided in TestSprite Authentication.
2. Open `/ctv`.
3. Navigate to `Giới thiệu/QR` / `Referral/QR`.
4. Open the `Mã QR` sub-tab.
5. Click `Tạo mã & tải ảnh` / `Tao ma & tai anh`.
6. Observe `POST /api/discount-codes/generate`.
7. Verify voucher card displays generated code and QR canvas.
8. Verify the QR encodes or links to `/verify-discount?code=<generated-code>`.
9. Verify `Mã của tôi` / `My codes` history shows the generated code.

Expected:

- QR generation succeeds.
- Voucher/QR is visible.
- History updates.
- Download/share either completes or is gracefully cancelled without hiding the generated code.

Cleanup:

- Record generated discount code for manual cleanup or expiration tracking.

### TC-CTV-008: Cleanup / Leave Safe State

Steps:

1. Deactivate/delete disposable employee if safe.
2. Suspend/deactivate CTV A and CTV B if safe.
3. Soft-delete or mark test client if safe and no service/earning history blocks cleanup.
4. Record anything left behind.

Expected:

- Final report includes cleanup status for every created entity.
- Anything not cleaned is clearly labeled `manual cleanup required`.

## Final Report Requirements

For every failure or blocker, include:

- URL.
- Role used.
- LOB.
- Screenshot.
- Video timestamp.
- Network request method/path/status.
- Visible error text.
- Entity names/phones generated.
- Classification:
  - domain/setup blocker
  - auth/setup blocker
  - product bug
  - expected safety block
  - stale test assumption
  - needs manual approval

## Do Not Run

- Payment/deposit/refund/void/payout/allocation actions.
- Permission changes on real users.
- Database sync/restore/import/export.
- Hard deletes of non-test production data.
