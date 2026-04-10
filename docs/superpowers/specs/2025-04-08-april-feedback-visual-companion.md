# Visual Companion: April 8th Feedback Implementation

## Executive Summary

Based on the Vietnamese feedback document "Feedback ngày 8/4", this visual companion maps out 7 critical issues that need to be addressed in the TG Clinic system.

---

## Issue 1: Customer List Not Displaying 📌 Customers Page

### Current State (Bug)
```
+--------------------------------------------------+
| Customers                              [+ Add]   |
+--------------------------------------------------+
| [Search...]  [All Status] [Active] [Inactive]    |
+--------------------------------------------------+
|                                                  |
|           ❌ NO CUSTOMERS DISPLAYED              |
|              (Only search works)                 |
|                                                  |
|  User must type to search - cannot browse list   |
|                                                  |
+--------------------------------------------------+
```

### Expected State
```
+--------------------------------------------------+
| Customers                              [+ Add]   |
+--------------------------------------------------+
| [Search...]  [All Status] [Active] [Inactive]    |
+--------------------------------------------------+
| ■ | Customer      | Phone       | Location     |
|----+---------------+-------------+--------------|
| □ | Nguyễn Văn A  | 0901...     | Gò Vấp      |
| □ | Trần Thị B   | 0902...     | Quận 10     |
| □ | Lê Văn C      | 0903...     | Quận 3      |
| □ | ... (30 customers total)                   |
+--------------------------------------------------+
| Page 1 of 3                          [>] [<]     |
+--------------------------------------------------+
```

### Root Cause Analysis
- The `useCustomers` hook fetches data correctly
- The `DataTable` component receives the data
- **Possible issues:**
  1. Data not loading on initial mount (loading state stuck?)
  2. Empty data array returned from API
  3. Pagination or filtering hiding all results
  4. CSS/layout issue hiding the table

---

## Issue 2: Customer Profile - Missing Role Selectors 📌 AddCustomerForm

### Current State (Yellow Circle Bug Area)
```
+--------------------------------------------------+
| Assignment (Phân công)                            |
+--------------------------------------------------+
| Chi nhánh (Branch) *                             |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Nhân viên sale (Online Sales)                   |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
|                                                  |
|     🟡 YELLOW CIRCLED AREA - MISSING:           |
|     - CSKH (Customer Service) selector           |
|                                                  |
+--------------------------------------------------+
```

### Expected State - Customer Profile Form
```
+--------------------------------------------------+
| Assignment (Phân công)                            |
+--------------------------------------------------+
| Chi nhánh (Branch) *                             |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Nhân viên sale (Online Sales)         [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| CSKH (Customer Service) ⭐ NEW         [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Nguồn (Source)                       [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Người giới thiệu (Referrer)          [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
```

### Expected State - Treatment Record Form
```
+--------------------------------------------------+
| Treatment Assignment (Phân công điều trị)        |
+--------------------------------------------------+
| Bác sĩ (Doctor) *                     [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Trợ thủ (Assistant) ⭐ NEW            [+]        |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
| Phụ tá bác sĩ (Doctor's Assistant) ⭐ NEW [+]    |
| [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] ▼ |
+--------------------------------------------------+
```

---

## Issue 3: Customer Edit Modal Shows All Appointments 📌 CustomerProfile

### Current State (Bug)
```
+--------------------------------------------------+
| Chỉnh sửa khách hàng - Nguyễn Văn A              |
+--------------------------------------------------+
| Tab: Thông tin | Lịch hẹn | Hồ sơ | Thanh toán  |
+--------------------------------------------------+
|                                                  |
| Lịch hẹn (Appointments)                        |
|                                                  |
| ⚠️ SHOWING ALL 120 APPOINTMENTS!                |
|   - Should only show Nguyễn Văn A's 5 appts     |
|   - Currently showing everyone's appointments    |
|                                                  |
| ● 09:00 - BS. Trang - Khám tổng quát            |
| ● 10:30 - BS. Dương - Trồng răng              |
|   ^ WRONG: This is another customer's appt       |
| ● 14:00 - BS. Ý - Niềng răng                   |
|                                                  |
+--------------------------------------------------+
```

### Expected State
```
+--------------------------------------------------+
| Chỉnh sửa khách hàng - Nguyễn Văn A              |
+--------------------------------------------------+
| Tab: Thông tin | Lịch hẹn | Hồ sơ | Thanh toán  |
+--------------------------------------------------+
|                                                  |
| Lịch hẹn (Appointments) - 5 total               |
|                                                  |
| ✓ 09:00 - BS. Trang - Khám tổng quát            |
|   Ngày: 15/03/2024 | Trạng thái: Đã khám        |
|                                                  |
| ✓ 14:00 - BS. Ý - Niềng răng                   |
|   Ngày: 22/03/2024 | Trạng thái: Hoàn thành      |
|                                                  |
| + Chỉ hiển thị lịch hẹn của Nguyễn Văn A        |
|                                                  |
+--------------------------------------------------+
```

### Root Cause
- The `AddCustomerForm` in edit mode doesn't filter appointments by customer ID
- It likely uses `useAppointments()` without the `partnerId` parameter
- The API call should include `partnerId: selectedCustomerId` filter

---

## Issue 4: Treatment Records - Can't Create 📌 CustomerProfile Records Tab

### Current State
```
+--------------------------------------------------+
| Treatment Records (Hồ sơ điều trị)               |
+--------------------------------------------------+
|                                          [+ Add] | ← Button exists
+--------------------------------------------------+
|                                                  |
|         🏥️ Stethoscope icon                    |
|                                                  |
|    "Treatment records will be displayed here."   |
|                                                  |
|    ❌ Clicking [+ Add] does NOTHING              |
|       - Modal doesn't open                       |
|       - No error shown                           |
|       - Feature not wired up                     |
|                                                  |
+--------------------------------------------------+
```

### Expected State
```
+--------------------------------------------------+
| Treatment Records (Hồ sơ điều trị)               |
+--------------------------------------------------+
|                                          [+ Add] |
+--------------------------------------------------+
|                                                  |
| When clicking [+ Add]:                           |
| +----------------------------------------------+ |
| | Thêm hồ sơ điều trị mới                       | |
| +----------------------------------------------+ |
| | Dịch vụ *     [Chọn dịch vụ ▼]               | |
| | Bác sĩ *       [Chọn bác sĩ ▼]               | |
| | Trợ thủ        [Chọn trợ thủ ▼]   ⭐ NEW     | |
| | Phụ tá BS      [Chọn phụ tá ▼]   ⭐ NEW     | |
| | Ngày bắt đầu * [dd/mm/yyyy]                  | |
| | Ghi chú         [________________]            | |
| |                                              | |
| |    [Hủy]    [Lưu hồ sơ]                      | |
| +----------------------------------------------+ |
|                                                  |
+--------------------------------------------------+
```

---

## Issue 5: Calendar Missing Create Appointment Button 📌 Calendar Page

### Current State
```
+--------------------------------------------------+
| Lịch hẹn (Calendar)                              |
+--------------------------------------------------+
| [Ngày] [Tuần] [Tháng]        [<] [March 2024] [>]|
+--------------------------------------------------+
|                                                  |
| [Bác sĩ: Tất cả ▼]                              |
|                                                  |
| +------+------+------+------+------+            |
| |  Mon |  Tue |  Wed |  Thu |  Fri |            |
| |      |      |      |      |      |            |
| |      |      |      |      |      |            |
| +------+------+------+------+------+            |
|                                                  |
| ❌ NO [+ Thêm lịch hẹn] BUTTON                  |
|    Cannot create appointments                    |
|                                                  |
+--------------------------------------------------+
```

### Expected State
```
+--------------------------------------------------+
| Lịch hẹn (Calendar)                    [+ Thêm] |
+--------------------------------------------------+
| [Ngày] [Tuần] [Tháng]        [<] [March 2024] [>]|
+--------------------------------------------------+
|                                                  |
| [Bác sĩ: Tất cả ▼]       ⭐ [+ Thêm lịch hẹn]  |
|                               ⭐ NEW BUTTON       |
| +------+------+------+------+------+            |
| |  Mon |  Tue |  Wed |  Thu |  Fri |            |
| |      |      |      |      |      |            |
| |      |      |      |      |      |            |
| +------+------+------+------+------+            |
|                                                  |
+--------------------------------------------------+
```

---

## Issue 6: Overview Page Missing Buttons 📌 Overview Page

### Current State
```
+--------------------------------------------------+  +------------------+
| Patient Check-in (Zone 1)                        |  | Today's Schedule |
+--------------------------------------------------+  | (Zone 3)         |
| [Chờ khám] [Đang điều trị] [Hoàn thành]     |  +------------------+
|                                                  |  | 09:00 - BS.Trang |
| • Patient A - Waiting                            |  | 10:00 - BS.Dương |
| • Patient B - In Treatment                       |  |                  |
|                                                  |  | ❌ NO ACTIONS    |
+--------------------------------------------------+  +------------------+
| Today's Services (Zone 2)                        |
+--------------------------------------------------+
| • Service A - $100                               |
| • Service B - $200                               |
|                                                  |
| ❌ NO QUICK ACTION BUTTONS                       |
| Cannot create/check-in from overview             |
+--------------------------------------------------+
```

### Expected State
```
+--------------------------------------------------+  +------------------+
| Patient Check-in (Zone 1)           [+ Check-in] |  | Today's Schedule |
|                                     ⭐ NEW       |  | (Zone 3)         |
+--------------------------------------------------+  +------------------+
| [Chờ khám] [Đang điều trị] [Hoàn thành]     |  | 09:00 - BS.Trang |
|                                                  |  | 10:00 - BS.Dương |
| • Patient A - Waiting          [Arrive] [Edit]  |  | [Edit] [Cancel]  |
| • Patient B - In Treatment      [Done] [Edit]   |  | ⭐ ACTION BUTTONS|
+--------------------------------------------------+  +------------------+
| Today's Services (Zone 2)           [+ Service]  |
|                                     ⭐ NEW       |
+--------------------------------------------------+
| • Service A - $100               [Details]      |
| • Service B - $200               [Details]      |
|                                                  |
| Quick action buttons enable workflow             |
+--------------------------------------------------+
```

---

## Issue 7: Service Catalog Add Button Not Working 📌 ServiceCatalog Page

### Current State
```
+--------------------------------------------------+
| Thông tin sản phẩm (Service Catalog)              |
+--------------------------------------------------+
| [Dịch vụ] [Vật tư] [Thuốc]                      |
+--------------------------------------------------+
| Nhóm dịch vụ         |  Toolbar:                 |
|                      |  [+ Thêm mới] ❌ BROKEN   |
| ● Tất cả (50)       |  [Chọn trạng thái ▼]     |
| ● Nhổ răng (10)     |  [Tìm kiếm________]      |
| ● Trồng răng (15)   |                           |
| ● Niềng răng (25)   |  Table...                 |
|                      |                           |
+----------------------+---------------------------+

❌ Clicking [+ Thêm mới]:
   - Either does nothing
   - Or shows empty modal
   - Or API error (Products table missing)
```

### Expected State
```
+--------------------------------------------------+
| Thông tin sản phẩm (Service Catalog)              |
+--------------------------------------------------+
| [Dịch vụ] [Vật tư] [Thuốc]                      |
+--------------------------------------------------+
| Nhóm dịch vụ         |  Toolbar:                 |
|                      |  [+ Thêm mới] ✓ WORKING   |
| ● Tất cả (50)       |  [Chọn trạng thái ▼]     |
| ● Nhổ răng (10)     |  [Tìm kiếm________]      |
| ● Trồng răng (15)   |                           |
| ● Niềng răng (25)   |  Table...                 |
|                      |                           |
+----------------------+---------------------------+

✓ Clicking [+ Thêm mới] opens:
+----------------------------------------------+
| Thêm dịch vụ mới                              |
+----------------------------------------------+
| Tên dịch vụ *   [____________________]       |
| Mã dịch vụ      [____________________]       |
| Đơn vị tính     [Lần ________________]       |
| Giá niêm yết    [0 ₫ ________________]       |
| Nhóm dịch vụ     [Chọn nhóm ▼]               |
| Chi nhánh        [Tất cả chi nhánh ▼]       |
|                                              |
|        [Hủy]    [Thêm mới]                   |
+----------------------------------------------+
```

### Root Cause (from CLAUDE.md)
- Products table missing in database
- API returns error: `/api/Products` - `productcategories` table missing
- Need to create SQL views or actual tables

---

## Issue 8: Missing Online Profile Section 📌 Main Navigation

### Current State (Sidebar)
```
+-------------+
| TG Clinic     |
+-------------+
| Tổng quan   |
| Khách hàng  |
| Lịch hẹn    |
| Dịch vụ     |
| Nhân viên   |
| Chi nhánh   |
| Thanh toán  |
| Website     |
| Cài đặt     |
|             |
| ❌ MISSING:  |
| Hồ sơ online|
| (hosoonline) |
+-------------+
```

### Expected State
```
+-------------+
| TG Clinic     |
+-------------+
| Tổng quan   |
| Khách hàng  |
| Lịch hẹn    |
| Dịch vụ     |
| Nhân viên   |
| Chi nhánh   |
| Thanh toán  |
| Website     |
| Hồ sơ online| ⭐ NEW MENU ITEM
|   - Tìm kiếm | ⭐ Sub-items
|   - Upload ảnh| ⭐ Sub-items
| Cài đặt     |
+-------------+
```

### Details
- **Purpose:** Search and upload customer photos for hosoonline.com
- **Features needed:**
  1. Search customers on hosoonline.com
  2. Upload/edit customer photos
  3. Sync with main customer database

---

## Implementation Priority

### P0 - Critical (Blocks User Workflow)
1. ✅ Customer list display fix
2. ✅ Customer Edit Modal - Filter appointments by customer
3. ✅ Calendar - Add create appointment button

### P1 - High (Important Features)
4. ✅ Treatment Records - Wire up create functionality
5. ✅ Add CSKH role selector to Customer Profile
6. ✅ Add Doctor/Assistant selectors to Treatment Records

### P2 - Medium (Nice to Have)
7. ✅ Overview page action buttons
8. ✅ Service Catalog - Fix/Create products table
9. ✅ Online Profile menu section

---

## Technical Notes

### Database Schema Needed
```sql
-- For Service Catalog
CREATE TABLE productcategories (id, name, parentid...);
CREATE TABLE products (id, name, defaultcode, listprice, categid...);

-- For Employee Roles
-- Already have employees, need role assignment
ALTER TABLE partners ADD COLUMN role_cskh_id VARCHAR;
ALTER TABLE partners ADD COLUMN role_sale_online_id VARCHAR;
```

### API Endpoints to Check
- `GET /api/Partners` - Should return all customers when no search
- `GET /api/Appointments?partnerId=X` - Should filter by customer
- `POST /api/Appointments` - Create new appointment
- `POST /api/SaleOrders` - Create treatment record
- `GET|POST /api/Products` - Service catalog CRUD

### Components to Modify
1. `Customers.tsx` - Fix list display
2. `AddCustomerForm.tsx` - Add CSKH selector
3. `CustomerProfile.tsx` - Fix appointments filter, wire up records
4. `Calendar.tsx` - Add create button
5. `Overview.tsx` - Add action buttons
6. `ServiceCatalog.tsx` - Fix create service
7. `Sidebar.tsx` - Add Online Profile menu
