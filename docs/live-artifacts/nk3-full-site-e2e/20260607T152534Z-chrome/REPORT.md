# NK3 Full-Site E2E — 20260607T152534Z

- Target: https://tmv.2checkin.com
- Login: OK
- Cosmetic LOB: not confirmed
- Routes: 20 PASS / 0 FAIL / 0 PARTIAL
- Bugs: 1

## Bugs
- **P1** BUG-R-018-api-403: API 403 on Feedback — https://tmv.2checkin.com/api/Feedback/all?source=manual

## Routes
| R-001 | / | PASS | Overview |
| R-002 | /customers | PASS | Customers |
| R-003 | /calendar | PASS | Calendar |
| R-004 | /employees | PASS | Employees |
| R-005 | /services | PASS | Services |
| R-006 | /service-catalog | PASS | Service Catalog |
| R-007 | /payment | PASS | Payment |
| R-008 | /permissions | PASS | Permissions |
| R-009 | /commission | PASS | Commission |
| R-010 | /commission?tab=newClients&lob=cosmetic | PASS | New Clients COM |
| R-011 | /reports/dashboard | PASS | Reports Dashboard |
| R-012 | /reports/revenue | PASS | Reports Revenue |
| R-013 | /reports/appointments | PASS | Reports Appointments |
| R-014 | /reports/customers | PASS | Reports Customers |
| R-015 | /reports/doctors | PASS | Reports Doctors |
| R-016 | /locations | PASS | Locations |
| R-017 | /settings | PASS | Settings |
| R-018 | /feedback | PASS | Feedback |
| R-019 | /relationships | PASS | Relationships |
| R-020 | /notifications | PASS | Notifications |
| W-DELETE-PROBE | undefined | SKIP |  |