# NK3 Public Read-Only Smoke

Site: https://tmv.2checkin.com
Date: 2026-06-09T12:37:02.778Z

Summary: 5 PASS / 0 PARTIAL / 0 FAIL

| Route | Status | Notes | Screenshot |
|---|---:|---|---|
| `/welcome` | PASS | OK | 01-public-landing.png |
| `/welcome?book=1` | PASS | OK | 02-public-booking-sheet-entry.png |
| `/ctv/join` | PASS | OK | 03-public-ctv-join.png |
| `/ctv/discount/CTV-333333` | PASS | dummy discount short code returned 404 as setup/data condition | 04-public-discount-landing-dummy-code.png |
| `/verify-discount` | PASS | login guard shown as acceptable for staff-only verify route | 05-staff-voucher-verify-guard-page.png |