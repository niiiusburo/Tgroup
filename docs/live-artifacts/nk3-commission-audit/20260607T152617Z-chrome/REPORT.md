# NK3 Commission Audit — 20260607T152617Z

- Target: https://tmv.2checkin.com
- Login: t@clinic.vn
- Cosmetic LOB: not confirmed
- Bugs: 3 | Passed: 5

## Bugs
- **P1** `BUG-COSMETIC`: Cosmetic LOB not visibly selected after login — header check failed
- **P3** `BUG-PAYOUT-NO-ALL`: Payouts tab lacks All/Combined LOB filter (only per-LOB) — options=cosmetic,dental
- **P0** `BUG-EARN-API`: GET /api/cosmetic/Earnings failed — {"responses":[{"url":"https://tmv.2checkin.com/api/cosmetic/Earnings?limit=5","status":404,"keys":[]},{"url":"https://tmv.2checkin.com/api/Earnings?lob=cosmetic&limit=5","status":200,"itemCount":5,"keys":["id","client_id","recipient_partner_id","payment_id","service_line_id","source","level","amount","status","payout_id","earned_at","created_at","client_name","recipient_name","product_id"]},{"url":"https://tmv.2checkin.com/api/Earnings?lob=all&limit=5","status":200,"itemCount":5,"keys":["id","client_id","recipient_partner_id","payment_id","service_line_id","source","level","amount","status","payout_id","earned_at","created_at","client_name","recipient_name","product_id"]}]}

## Passed
- `PASS-LOGIN`: Login succeeded — t@clinic.vn
- `PASS-NC-API`: NewClients API returns service_total & commission_total — https://tmv.2checkin.com/api/cosmetic/NewClients?limit=10 status=200
- `PASS-NC-UI`: New Clients tab loads with revenue/COM columns — 10 rows
- `PASS-PAYOUT-LOAD`: Payouts tab loads and LOB switch works — options: cosmetic, dental
- `PASS-PAY-405`: PATCH /api/Payments/:id returns 405 (edit disabled) — https://tmv.2checkin.com/api/Payments/6fb31eba-2200-4f32-a62a-85479a3900a8 → 405 code=B_PAYMENT_EDIT_DISABLED

## API 4xx/5xx
- GET https://tmv.2checkin.com/api/cosmetic/Earnings?limit=5 → 404

## Console errors
- None

## Probes
- P1-newClients: **PASS** — columns and data load
- P2-payouts-lob: **PARTIAL** — per-LOB only (no All)
- P3-earnings-api: **FAIL** — status 404
- P4-payment-patch: **PASS** — 405 B_PAYMENT_EDIT_DISABLED=true