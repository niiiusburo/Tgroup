# Feedback Verification Report
**Environment:** live
**Base URL:** https://nk.2checkin.com
**Generated:** 2026-05-15T21:54:28.585Z
**Account:** t@clinic.vn

## Summary
- Total threads: **311**
  - Manual (staff reports): **8**
  - Auto-detected: **303** → deduplicated to **98** clusters
- Auth/permission noise (401/403): **54** clusters
- Backend errors (500+): **17** clusters
- Frontend errors (DOM/chunk): **2** clusters
- Other auto errors: **25** clusters
- New since last snapshot: **0**
- Resolved since last snapshot: **2639**

## Manual Staff Reports (Action Required)

### uncategorized | pending | /customers/e7bac056-69be-47d2-acc1-b1400020d3a3
- **ID:** `7bd930b0-82b5-42a1-9137-167373f6cc38`
- **Reporter:** Admin
- **Created:** 2026-05-15T07:37:18.000Z
- **Page:** https://nk.2checkin.com/customers/e7bac056-69be-47d2-acc1-b1400020d3a3
- **Message:** Cái Nk2 hiện tại đang xem được hồ sơ online mà nk thì không xem được ạ.
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /reports/revenue
- **ID:** `91eeb398-6ac9-4efa-9c33-46d3a6cc6a31`
- **Reporter:** Admin
- **Created:** 2026-05-15T07:26:24.000Z
- **Page:** https://nk2.2checkin.com/reports/revenue
- **Message:** Phần xuất báo cáo này bị sai rùi ạ, thực ra cái báo cáo anh để nguyên như hôm trc alf ok rồi, chỉ làm sao cho nó update được số tiền đúng ở dashboard thôi ạ
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /customers/9aa0b5c4-ac80-4851-9c0b-b14c0088ad79
- **ID:** `b660c63f-d241-45c3-8dcb-87b0d035dd0c`
- **Reporter:** Admin
- **Created:** 2026-05-15T07:05:29.000Z
- **Page:** https://nk2.2checkin.com/customers/9aa0b5c4-ac80-4851-9c0b-b14c0088ad79
- **Message:** Hiện tại khi tạo tạm ứng thì phiếu tạm ứng nó lại nhảy lên chỗ  phiếu thanh toán (dù số tiền nó vẫn cộng vào tạm ứng nhưng phiếu đang nhảy sai vị trí)
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /reports/revenue
- **ID:** `1f83120e-8b69-442a-81c8-e9cf46416a3f`
- **Reporter:** Admin
- **Created:** 2026-05-14T10:34:13.000Z
- **Page:** https://nk2.2checkin.com/reports/revenue
- **Message:** Chỗ này bị mất luôn phần download báo cáo rồi ạ
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /calendar
- **ID:** `aaab3cf5-6f22-46c8-8e8a-13e78c7bbf7f`
- **Reporter:** Admin
- **Created:** 2026-05-12T17:05:03.000Z
- **Page:** https://nk.2checkin.com/calendar
- **Message:** Phần xuất dữ liệu lịch hẹn về thì nó có xuất cả những ngày khác, ví dụ bảo xuất ngày 13.5 thôi nhưng dữ liệu có hiện các ngày khác nữa, em cũng không rõ lý do lắm.
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /customers/57634e77-0055-4174-8ca8-b3a000860e8a
- **ID:** `84adb3d5-d7ec-4173-9813-71121e128e1f`
- **Reporter:** Admin
- **Created:** 2026-05-12T17:04:10.000Z
- **Page:** https://nk.2checkin.com/customers/57634e77-0055-4174-8ca8-b3a000860e8a
- **Message:** Tạo được hồ sơ online nhưng chưa xem được ảnh và cũng chưa up ngược lên được, cái này a fix sau cũng được ạ, tạm thời bọn e dùng như cũ cũng dc.
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /reports/revenue
- **ID:** `926fe4a4-a010-48cb-8829-75b7ff5eef91`
- **Reporter:** Admin
- **Created:** 2026-05-12T17:03:10.000Z
- **Page:** https://nk.2checkin.com/reports/revenue
- **Message:** Phần báo cáo cọc tiền thì chưa trích xuất được tiền cọc và tiền mặt hay chuyển khoản ạ,
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

### uncategorized | pending | /reports/revenue
- **ID:** `b064ee3d-fbb1-4876-8788-1ce6e4a16079`
- **Reporter:** Admin
- **Created:** 2026-05-12T17:02:31.000Z
- **Page:** https://nk.2checkin.com/reports/revenue
- **Message:** Khi xuất Báo cáo doanh thu thì cột "Phiếu khám" vẫn hiện lẫn lột lúc thì là mã phiếu khám lúc thì là dịch vụ. Cần tách riêng thành 2 cột Mã phiếu khám và dịch vụ, Còn lại ok rồi ạ.
- [ ] **Verified** — reproduce on live
- [ ] **Fixed** — code change applied
- [ ] **Confirmed** — staff signed off or auto-error stopped

## Backend Error Clusters (500+)

### unknown | HTTP 500 | /Reports/doctors/performance
- **Occurrences:** 7
- **Latest:** 2026-05-14T20:25:11.569Z
- **Sample IDs:** f38645ab-a2d4-449b-8150-3a8cc3466f45, 59440e6c-e190-46b4-a238-5f0b4fe69a08, 8a974675-ee88-444c-95aa-7d91be75300a...
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /Reports/doctors/performance failed (500): HTTP 500 **Stack:** ``` Error     at H9 (https://nk2.2checkin.com/assets/index-D-_qmhik.js:77:1391)     
- [ ] **Investigate** — check server logs for /Reports/doctors/performance
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /Reports/cash-flow/summary
- **Occurrences:** 14
- **Latest:** 2026-05-13T09:13:52.872Z
- **Sample IDs:** 23450681-d078-4476-859e-99a5fed1798a, 413303d3-6fc6-4cb1-baaa-e7d11bfe39ee, 6d45daf9-bbce-435f-9b18-8494792f086a...
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /Reports/cash-flow/summary failed (500): HTTP 500 **Stack:** ``` TW@https://nk2.2checkin.com/assets/index-BMRY8Ac1.js:77:1391 Y/<@https://nk2.2chec
- [ ] **Investigate** — check server logs for /Reports/cash-flow/summary
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 504 | /ExternalCheckups/T383833
- **Occurrences:** 1
- **Latest:** 2026-05-13T00:29:36.775Z
- **Sample IDs:** d37ec059-8636-41aa-ac11-9b91996da983
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /ExternalCheckups/T383833 failed (504): HTTP 504 **Stack:** ``` Error     at TW (https://nk.2checkin.com/assets/index-DOGuWkus.js:77:1391)     at ht
- [ ] **Investigate** — check server logs for /ExternalCheckups/T383833
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /SaleOrders
- **Occurrences:** 2
- **Latest:** 2026-05-12T02:47:30.418Z
- **Sample IDs:** 41b68b31-c310-4b43-99a5-1b1f1a7d5fcb, ac376443-67b5-4435-ac17-f9e8e9ae4730
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /SaleOrders failed (500): HTTP 500 **Stack:** ``` Error     at fW (https://nk.2checkin.com/assets/index-ChcKGwea.js:77:1391)     at https://nk.2che
- [ ] **Investigate** — check server logs for /SaleOrders
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Products
- **Occurrences:** 2
- **Latest:** 2026-05-10T00:53:06.666Z
- **Sample IDs:** 3add3cf9-5ea2-4fbd-89ee-c2b642714dd1, a0bfabe2-8d3d-4656-99a1-a4b0b28e6017
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Products failed (502): HTTP 502 **Stack:** ``` Error     at TW (https://nk2.2checkin.com/assets/index-fr2yBCN-.js:77:1391)     at https://nk2.2chec
- [ ] **Investigate** — check server logs for /Products
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Employees
- **Occurrences:** 2
- **Latest:** 2026-05-10T00:53:06.572Z
- **Sample IDs:** 6d2b4ad7-6ae0-47f9-bd7d-92c51f616993, c70da7f7-8605-4e5d-ba89-2cb8638aa4c5
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Employees failed (502): HTTP 502 **Stack:** ``` Error     at TW (https://nk2.2checkin.com/assets/index-fr2yBCN-.js:77:1391)     at https://nk2.2che
- [ ] **Investigate** — check server logs for /Employees
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Partners
- **Occurrences:** 4
- **Latest:** 2026-05-10T00:53:06.475Z
- **Sample IDs:** 2fb3c4dc-0a11-4276-9509-0080134c18f7, dea7a39f-63d2-4d48-bc6a-39e987bef894, 749474b8-ea57-47cb-9c94-81eff5df07c5...
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Partners failed (502): HTTP 502 **Stack:** ``` Error     at TW (https://nk2.2checkin.com/assets/index-fr2yBCN-.js:77:1391)     at https://nk2.2chec
- [ ] **Investigate** — check server logs for /Partners
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Companies
- **Occurrences:** 1
- **Latest:** 2026-05-10T00:53:06.367Z
- **Sample IDs:** e6a4856d-0c82-49e2-9645-eaf746dd6e5c
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Companies failed (502): HTTP 502 **Stack:** ``` Error     at TW (https://nk2.2checkin.com/assets/index-fr2yBCN-.js:77:1391)     at https://nk2.2che
- [ ] **Investigate** — check server logs for /Companies
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /DotKhams
- **Occurrences:** 1
- **Latest:** 2026-05-09T00:28:21.441Z
- **Sample IDs:** 1be50f77-0fb9-4747-848a-b1009c87b46f
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /DotKhams failed (502): HTTP 502 **Stack:** ``` Error     at fW (https://nk.2checkin.com/assets/index-FgDaEVjJ.js:77:1391)     at https://nk.2checki
- [ ] **Investigate** — check server logs for /DotKhams
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Partners/02ff4e1f-5b7a-4b45-bd44-b3900052952e
- **Occurrences:** 1
- **Latest:** 2026-05-09T00:28:21.331Z
- **Sample IDs:** 42fb1327-187b-49a4-9695-2121fdae9241
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Partners/02ff4e1f-5b7a-4b45-bd44-b3900052952e failed (502): HTTP 502 **Stack:** ``` Error     at fW (https://nk.2checkin.com/assets/index-FgDaEVjJ.
- [ ] **Investigate** — check server logs for /Partners/02ff4e1f-5b7a-4b45-bd44-b3900052952e
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /Reports/revenue/by-category
- **Occurrences:** 8
- **Latest:** 2026-05-08T19:51:11.478Z
- **Sample IDs:** 19349765-64e0-4796-bbe2-49fc737eefc3, 0c2fcf2a-d8e4-4891-bcbb-018b1ac09e6b, 292318d6-0316-43c1-b887-5562f27f0733...
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /Reports/revenue/by-category failed (500): HTTP 500 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index-BgR3-fR7.js:77:1391)     a
- [ ] **Investigate** — check server logs for /Reports/revenue/by-category
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /Reports/revenue/summary
- **Occurrences:** 8
- **Latest:** 2026-05-08T19:51:11.375Z
- **Sample IDs:** d2e9df44-3ab4-4ca4-83df-857a8ed6c477, be42307b-2661-410d-8984-592e49e8b257, ba2e3d33-ddb7-4f3d-a0a0-5d83de69e186...
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /Reports/revenue/summary failed (500): HTTP 500 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index-BgR3-fR7.js:77:1391)     at ht
- [ ] **Investigate** — check server logs for /Reports/revenue/summary
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /SaleOrders/670bd199-7c29-4112-b906-b3ae006e83b2
- **Occurrences:** 1
- **Latest:** 2026-05-08T03:21:08.042Z
- **Sample IDs:** 71a8644f-9f52-4dcc-a065-fc62bdfd3b80
- **First message:** 🚨 **Auto-detected API Error** **Message:** API PATCH /SaleOrders/670bd199-7c29-4112-b906-b3ae006e83b2 failed (500): HTTP 500 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index-BgR3-
- [ ] **Investigate** — check server logs for /SaleOrders/670bd199-7c29-4112-b906-b3ae006e83b2
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Appointments/e98ca021-b2a5-40d9-8acb-dd15f725b450
- **Occurrences:** 2
- **Latest:** 2026-05-08T00:02:58.671Z
- **Sample IDs:** 607fd3ef-3c6c-473a-ab34-ef27389426a3, 45d93ca0-cf49-4c1f-a8d9-2bb415a44f49
- **First message:** 🚨 **Auto-detected UnhandledRejection Error** **Message:** API PUT /Appointments/e98ca021-b2a5-40d9-8acb-dd15f725b450 failed (502): <html> <head><title>502 Bad Gateway</title></head> <body> <center
- [ ] **Investigate** — check server logs for /Appointments/e98ca021-b2a5-40d9-8acb-dd15f725b450
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 500 | /face/recognize
- **Occurrences:** 2
- **Latest:** 2026-05-07T23:45:46.170Z
- **Sample IDs:** d356d6bd-3bee-4edf-a8cd-6f8cddfefb25, 1e42d64a-23ce-4d58-bede-88a649b92bc2
- **First message:** 🚨 **Auto-detected API Error** **Message:** API POST /face/recognize failed (500): HTTP 500 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index--wJDeLYT.js:77:1391)     at https://nk.
- [ ] **Investigate** — check server logs for /face/recognize
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /Appointments
- **Occurrences:** 1
- **Latest:** 2026-05-07T23:25:47.644Z
- **Sample IDs:** ae561135-bf7d-488f-9758-f61424e41ad1
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /Appointments failed (502): HTTP 502 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index-Dl-h2m__.js:77:1391)     at https://nk.2ch
- [ ] **Investigate** — check server logs for /Appointments
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

### unknown | HTTP 502 | /ExternalCheckups/T282358
- **Occurrences:** 1
- **Latest:** 2026-05-07T23:25:45.792Z
- **Sample IDs:** 4bcf1ff7-1a64-47ac-ab0a-dd61ed490400
- **First message:** 🚨 **Auto-detected API Error** **Message:** API GET /ExternalCheckups/T282358 failed (502): HTTP 502 **Stack:** ``` Error     at O9 (https://nk.2checkin.com/assets/index-BzmNt4NH.js:77:1391)     at ht
- [ ] **Investigate** — check server logs for /ExternalCheckups/T282358
- [ ] **Fix** — resolve root cause
- [ ] **Verify** — no new occurrences for 24h

## Frontend Error Clusters

### React DOM Mutation | unknown
- **Occurrences:** 11
- **Latest:** 2026-05-15T00:08:33.069Z
- **Page:** /customers/d96f064b-cbbd-47ca-ac70-b401009082a4
- [ ] **Investigate** — reproduce or check Sentry

### Chunk Load Failure | unknown
- **Occurrences:** 22
- **Latest:** 2026-05-12T19:16:36.408Z
- **Page:** /
- [ ] **Investigate** — reproduce or check Sentry

## Auth/Permission Noise (Likely False Positives)
> These are 401/403 errors, often from expired sessions or permission-bound pages. 54 clusters, 172 total occurrences.

- `/Permissions/groups` → HTTP 403 (5×)
- `/Appointments` → HTTP 403 (3×)
- `/Companies` → HTTP 403 (15×)
- `/Employees` → HTTP 403 (17×)
- `/ExternalCheckups/T6725` → HTTP 403 (1×)
- `/Auth/login` → HTTP 401 (17×)
- `/SaleOrderLines` → HTTP 401 (2×)
- `/settings/bank` → HTTP 403 (4×)
- `/Payments/deposit-usage?customerId=9aa0b5c4-ac80-4851-9c0b-b14c0088ad79&limit=100&offset=0` → HTTP 403 (1×)
- `/Payments?customerId=9aa0b5c4-ac80-4851-9c0b-b14c0088ad79&type=payments&limit=100&offset=0` → HTTP 403 (1×)
- ... and 44 more

## Delta Since Last Snapshot
- Snapshot file: `reports/feedback-extract/2026-05-15T21-37-24-528Z-feedback-threads.csv`
- New threads: **0**
- Resolved threads: **2639**

## Recommended Action Order
1. **Fix manual staff reports first** — these are confirmed user-facing bugs
2. **Investigate backend 500 clusters** — these affect all users
3. **Address frontend DOM/chunk errors** — degrade UX
4. **Review auth noise** — may indicate permission gaps or session handling issues
