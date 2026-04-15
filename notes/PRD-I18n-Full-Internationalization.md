# PRD: Full Internationalization (i18n)

**GitHub Issue**: [#28](https://github.com/niiiusburo/Tgroup/issues/28)
**Status**: 📋 Planning
**Priority**: High
**Estimate**: ~8 hours wall-clock (6 parallel streams)

## Summary
Full i18n implementation using react-i18next for English/Vietnamese toggle across the entire TG Clinic Dashboard.

## Key Decisions
- **Library**: react-i18next (industry standard)
- **Default language**: Vietnamese (vi)
- **14 translation namespaces**: common, nav, overview, calendar, customers, appointments, services, payment, employees, locations, reports, settings, auth, website
- **Language toggle**: Globe icon in sidebar header
- **Persistence**: localStorage (`tg-lang`)
- **Data rule**: API/DB data stays in original language; ALL UI strings use `t()`

## Parallel Streams
| Stream | Scope | Files | Est. |
|--------|-------|-------|------|
| 0 (blocking) | Infrastructure | i18n setup, LanguageProvider, LanguageToggle | 2h |
| 1 | Nav, Layout, Auth, Shared | Layout.tsx, Login.tsx, shared/* | 3h |
| 2 | Calendar, Appointments, Services | calendar/*, appointments/*, services/* | 4h |
| 3 | Customers, Employees, Locations | customer/*, employees/*, locations/* | 4h |
| 4 | Payment, Reports, Settings, CMS | payment/*, reports/*, settings/*, website/* | 4h |
| 5 (after all) | Audit & Enforcement | ESLint rule, coverage audit | 2h |

## AGENTS.md Rule
All future UI work MUST use `t()` for user-facing strings. No hardcoded strings in JSX/TSX.
