# NK3 Protected Routes Audit

**Site:** https://tmv.2checkin.com
**Login:** t@clinic.vn / Cosmetic LOB
**Date:** 2026-06-07T15:28:35.738Z

## Summary

| Status | Count |
|--------|-------|
| PASS | 20 |
| PARTIAL | 3 |
| FAIL | 0 |

## Route Results

| Route | Status | API 4xx/5xx | Notes | Screenshot |
|-------|--------|-------------|-------|------------|
| `/` | **PASS** | — | OK | 01-overview.png |
| `/customers` | **PARTIAL** | — | Error text visible on page | 02-customers.png |
| `/calendar` | **PASS** | — | OK | 03-calendar.png |
| `/employees` | **PASS** | — | OK | — |
| `/services` | **PASS** | — | OK | — |
| `/service-catalog` | **PASS** | — | OK | — |
| `/payment` | **PARTIAL** | — | Error text visible on page | 07-payment.png |
| `/permissions` | **PASS** | — | OK | — |
| `/commission` | **PASS** | — | OK | — |
| `/reports/dashboard` | **PASS** | — | OK | — |
| `/reports/revenue` | **PASS** | — | OK | — |
| `/reports/appointments` | **PASS** | — | OK | — |
| `/reports/customers` | **PASS** | — | OK | — |
| `/reports/doctors` | **PASS** | — | OK | — |
| `/reports/services` | **PASS** | — | OK | — |
| `/reports/employees` | **PASS** | — | OK | — |
| `/reports/locations` | **PASS** | — | OK | — |
| `/locations` | **PASS** | — | OK | — |
| `/settings` | **PASS** | — | OK | — |
| `/feedback` | **PARTIAL** | 403 | 403 https://tmv.2checkin.com/api/Feedback/all?source=manual | 20-feedback.png |
| `/relationships` | **PASS** | — | OK | — |
| `/notifications` | **PASS** | — | OK | — |
| `/website` | **PASS** | — | OK | — |

## Bugs

- **[P1]** `/customers` — error-ui: Error text visible on page
- **[P1]** `/payment` — error-ui: Error text visible on page
- **[P1]** `/feedback` — api: 403 https://tmv.2checkin.com/api/Feedback/all?source=manual