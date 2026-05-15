# NK Feedback Fix Queue

Extracted from `https://nk.2checkin.com/feedback` on 2026-05-15T21:37:24.528Z.

Artifacts:
- Full JSON: `/Users/thuanle/Documents/TamTMV/Tgrouptest/reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-full.json`
- Thread CSV: `/Users/thuanle/Documents/TamTMV/Tgrouptest/reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-threads.csv`
- Full triage markdown: `/Users/thuanle/Documents/TamTMV/Tgrouptest/reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-triage.md`
- Screenshot: `/Users/thuanle/Documents/TamTMV/Tgrouptest/output/playwright/2026-05-15T21-37-24-528Z-feedback-page.png`

## Extraction Summary

- Login account used: `t@clinic.vn`
- Total feedback threads: 311
- Manual staff reports: 8
- Auto-detected reports: 303
- Status: all 311 are still `pending`
- Extraction health: 0 failed browser requests, 0 extraction API errors, 0 console errors during the extraction run

## Manual Staff Reports To Fix First

1. Ho so Online images differ between NK and NK2.
   - Thread: `7bd930b0-82b5-42a1-9137-167373f6cc38`
   - Page: `/customers/e7bac056-69be-47d2-acc1-b1400020d3a3`
   - Message: NK2 can view Ho so Online, but NK cannot.
   - Attachment: `/uploads/feedback/b6f0e1dc-4da7-4951-9fa8-e5f2d1522d8d.jpg`

2. Revenue export/report behavior was changed too far.
   - Thread: `91eeb398-6ac9-4efa-9c33-46d3a6cc6a31`
   - Page: `/reports/revenue`
   - Message: Keep the previous report shape; only make the dashboard amount update correctly.

3. Customer advance receipt appears in the payment receipt area.
   - Thread: `b660c63f-d241-45c3-8dcb-87b0d035dd0c`
   - Page: `/customers/9aa0b5c4-ac80-4851-9c0b-b14c0088ad79`
   - Message: Creating an advance still adds money to advance, but the receipt displays in the payment receipt location.

4. Revenue report download action disappeared.
   - Thread: `1f83120e-8b69-442a-81c8-e9cf46416a3f`
   - Page: `/reports/revenue`
   - Message: The report download section is missing.

5. Calendar export includes dates outside the selected day.
   - Thread: `aaab3cf5-6f22-46c8-8e8a-13e78c7bbf7f`
   - Page: `/calendar`
   - Message: Exporting only 13/5 still includes other dates.

6. Ho so Online can create but cannot view images or upload back.
   - Thread: `84adb3d5-d7ec-4173-9813-71121e128e1f`
   - Page: `/customers/57634e77-0055-4174-8ca8-b3a000860e8a`
   - Message: Created online record, but images cannot be viewed and upload-back does not work.

7. Deposit report export cannot extract deposit/cash/bank transfer values.
   - Thread: `926fe4a4-a010-48cb-8829-75b7ff5eef91`
   - Page: `/reports/revenue`
   - Message: Deposit report does not extract deposit, cash, or transfer amounts.
   - Attachment: `/uploads/feedback/c4b88ca9-55a9-4b19-a738-4facd2684649.jpg`

8. Revenue export mixes exam slip code and service in `Phiếu khám`.
   - Thread: `b064ee3d-fbb1-4876-8788-1ce6e4a16079`
   - Page: `/reports/revenue`
   - Message: Split into two columns: `Mã phiếu khám` and `Dịch vụ`; remaining report behavior is ok.
   - Attachment: `/uploads/feedback/c1655a63-8d5d-4b92-b42f-1359f757c712.jpg`

## Auto-Detected Error Clusters

- Auth/session noise: `GET /Auth/me 401` occurred 20 times; `POST /Auth/login 401` occurred 17 times.
- Permission/access noise: repeated `403` on `Employees`, `Companies`, `Appointments`, `Permissions/groups`, `Products`, `SaleOrders`, and settings/bank.
- Reports backend errors: `POST /Reports/cash-flow/summary 500` occurred 14 times; revenue category/summary report `500` errors occurred 8 times each.
- Dynamic chunk load failures: many one-off `Failed to fetch dynamically imported module` reports across Overview, Calendar, Customers, Reports, and Commission chunks.
- React DOM mutation errors: repeated `insertBefore` / `removeChild` `NotFoundError`, mostly on customer-facing pages.

## Suggested Fix Order

1. Ho so Online image/view/upload parity between NK and NK2.
2. Reports revenue/deposit export correctness and missing download affordance.
3. Customer advance receipt placement.
4. Calendar export date filtering.
5. Auto-detected reports backend `500` clusters.
6. Auto-detected chunk-load and React DOM mutation noise after the manual defects are fixed.
