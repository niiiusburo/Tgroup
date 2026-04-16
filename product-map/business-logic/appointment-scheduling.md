# Business Logic: Appointment Scheduling

> How appointments are created, validated, and updated in `api/src/routes/appointments.js`.

## 1. Valid States

```js
const VALID_STATES = [
  'draft',
  'scheduled',
  'confirmed',
  'arrived',
  'in Examination',
  'in-progress',
  'done',
  'cancelled'
];
```

> **Frontend inconsistency:** The frontend constants (`APPOINTMENT_STATUS_OPTIONS`) only define `scheduled`, `arrived`, `cancelled`. The backend accepts a wider set, but the UI color mapping only covers codes `0-7` and a subset of status strings.

## 2. Creating an Appointment (`POST /`)

### Required fields
- `date` (ISO 8601, YYYY-MM-DD or full datetime)
- `partnerId` / `partnerid` (customer UUID)
- `companyId` / `companyid` (location UUID)

### Optional fields
- `time`, `doctorId` / `doctorid`, `note`, `timeExpected` / `timeexpected` (default 30), `color` (default `'1'`), `state` (default `'confirmed'`), `productId` / `productid`

### Validation rules
1. `date` must be valid ISO.
2. `partnerId` and `companyId` must be valid UUIDs.
3. If `doctorId` provided, must be valid UUID.
4. `state` must be in `VALID_STATES`.
5. `timeExpected` must be integer between `1` and `480` minutes.
6. Foreign keys exist via `foreignKeyExists('partners', partnerId)`, `foreignKeyExists('companies', companyId)`, and optionally `foreignKeyExists('employees', doctorId)`.

> **Note:** `foreignKeyExists` uses a hardcoded allowlist (`FK_TABLES = new Set(['partners', 'companies', 'employees'])`). It will throw if asked to check any other table.

### Name generation
Appointments are auto-named with a sequence:
```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1
FROM appointments WHERE name LIKE 'AP%'
```
Result: `AP000001`, `AP000002`, etc.

### Default columns on insert
- `aptstate = state`
- `isrepeatcustomer = false`
- `isnotreatment = false`
- `datecreated = NOW()`, `lastupdated = NOW()`

## 3. Updating an Appointment (`PUT /:id`)

### Editable fields
- `date`, `doctorId` / `doctorid`, `note`, `state`, `timeExpected` / `timeexpected`, `color`, `time`, `productId` / `productid`

### Validation
Same as create, but fields are optional (only provided fields are updated).

### Special behavior
- When `state` is updated, `aptstate` is also updated to the same value.
- `lastupdated` is always set to `NOW()`.

## 4. Querying Appointments (`GET /`)

### Accepts both snake_case and camelCase params
Because `apiFetch` converts query params to snake_case but also has legacy camelCase fallbacks:
- `date_from` or `dateFrom`
- `date_to` or `dateTo`
- `company_id` or `companyId`
- `doctor_id` or `doctorId`

### Date range handling
- `date_from` is used as-is.
- `date_to` that is `YYYY-MM-DD` (length ≤ 10) is converted to `YYYY-MM-DD 23:59:59` to include the full day.

### Search
Search matches against:
- `appointments.name`
- `appointments.note`
- `appointments.reason`
- `partners.name`
- `partners.namenosign`
- `partners.ref`

### Sorting
Allowed sort fields map to DB columns:
- `name` → `a.name`
- `date` → `a.date`
- `time` → `a.time`
- `state` → `a.state`
- `datetimeappointment` → `a.datetimeappointment`
- `createdat` → `a.datecreated`

Direction: `asc` or `desc` (default `desc`).

### Aggregates
Response includes:
```json
{
  "aggregates": {
    "total": 100,
    "byState": {
      "scheduled": 40,
      "confirmed": 30,
      ...
    }
  }
}
```

## 5. Appointment-Related Tables

| Table | Relationship | Note |
|-------|--------------|------|
| `partners` | `partnerid` (customer) | LEFT JOIN for name/phone/ref |
| `companies` | `companyid` (location) | LEFT JOIN for location name |
| `employees` | `doctorid` (doctor) | LEFT JOIN for doctor name |
| `products` | `productid` (service) | LEFT JOIN for service name |
| `dotkhams` | `dotkhamid` | LEFT JOIN for medical record name |
| `saleorders` | `saleorderid` | LEFT JOIN for order name |
| `crmteams` | `teamid` | LEFT JOIN for team name |
| `aspnetusers` | `userid`, `createdbyid`, `writebyid` | LEFT JOIN for user names |
| `customerreceipts` | `customerreceiptid` | LEFT JOIN for receipt date |

## 6. Color Codes

Backend stores `appointments.color` as a string (typically `'0'` through `'7'`).
Frontend canonical mapping is in `website/src/constants/index.ts` (`APPOINTMENT_CARD_COLORS`).

| Code | Label | Tailwind classes |
|------|-------|-----------------|
| 0 | Blue | `bg-blue-50`, `text-blue-700`, etc. |
| 1 | Green | `bg-emerald-50`, `text-emerald-700` |
| 2 | Orange | `bg-amber-50`, `text-amber-700` |
| 3 | Red | `bg-red-50`, `text-red-700` |
| 4 | Purple | `bg-violet-50`, `text-violet-700` |
| 5 | Pink | `bg-pink-50`, `text-pink-700` |
| 6 | Cyan | `bg-cyan-50`, `text-cyan-700` |
| 7 | Lime | `bg-lime-50`, `text-lime-700` |

## 7. Check-In Flow (Frontend Only)

The backend does not have a dedicated check-in state machine. The frontend implements check-in statuses:
- `not-arrived` → `arrived` → `waiting` → `in-treatment` → `done`

These are driven by frontend UI (`PatientCheckIn`, `CheckInFlow`) and may update the appointment's `state` or custom datetime fields (`datetimearrived`, `datetimeseated`, `datetimedismissed`, `datedone`) via `PUT /api/Appointments/:id`.

## 8. Risks & Edge Cases

| Risk | Impact |
|------|--------|
| `VALID_STATES` on backend has 9 values; frontend only recognizes 3 in forms | Status mismatch when editing |
| `timeExpected` limited to 480 minutes (8 hours) | Long surgeries blocked without bypass |
| `name LIKE 'AP%'` sequence can collide if appointments are deleted | Gaps in numbering, but no uniqueness constraint on name |
| `date_to` auto-converted to `23:59:59` | Timezone-sensitive if client and server disagree on day boundaries |
| No overlap prevention logic | Double-booking the same doctor/time slot is allowed at the API level |
