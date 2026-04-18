# Contract Drift Audit

**Scope:** Top 5 critical routes (Partners, Appointments, Payments, SaleOrders, Employees)  
**Date:** 2026-04-18  
**Backend:** `api/src/routes/*.js` (Express + raw SQL)  
**Frontend:** `website/src/types/*.ts` + `website/src/lib/api/*.ts`

---

## 1. Partners (/api/Partners)

### Backend Response Shape

**GET /api/Partners (list)**
Returns `PaginatedResponse` with extra `aggregates` field:
```
{
  offset, limit, totalItems,
  items: [{
    id, code, displayname, name, phone, email,
    street, city, district, ward,
    gender, birthyear, birthmonth, birthday,
    medicalhistory, comment, note,
    status (boolean = active), treatmentstatus,
    referraluserid, agentid, agentname,
    companyid, companyname,
    datecreated, lastupdated, createdbyid, writebyid,
    avatar, zaloid, taxcode, identitynumber,
    healthinsurancecardnumber, emergencyphone, weight,
    appointmentcount (hardcoded 0),
    ordercount (hardcoded 0),
    dotkhamcount (hardcoded 0)
  }],
  aggregates: { total, active, inactive }
}
```

**GET /api/Partners/:id (detail)**
Returns all list fields plus:
```
citycode, districtcode, wardcode,
citycodev2, citynamev2, wardcodev2, wardnamev2, usedaddressv2,
barcode, fax, hotline, website, jobtitle,
iscompany, ishead, isbusinessinvoice,
unitname, unitaddress, customername,
invoicereceivingmethod, receiveremail, receiverzalonumber,
personalidentitycard, personaltaxcode, personaladdress, personalname,
stageid, lasttreatmentcompletedate, sequencenumber, sequenceprefix,
supplier, customer, isagent, isinsurance, employee,
cskhid, salestaffid,
createdbyname, updatedbyname,
appointmentcount (real subquery),
ordercount (real subquery),
dotkhamcount (real subquery)
```

**POST /api/Partners & PUT /api/Partners/:id**
Accept body fields: name, phone, email, companyid, gender, birthday, birthmonth, birthyear, street, cityname, districtname, wardname, medicalhistory, note, comment, referraluserid, weight, identitynumber, healthinsurancecardnumber, emergencyphone, jobtitle, taxcode, unitname, unitaddress, isbusinessinvoice, personalname, personalidentitycard, personaltaxcode, personaladdress, salestaffid, cskhid, customer, status (active), ref.

### Frontend Expected Shape

**`website/src/types/customer.ts` — `Customer` (minimal UI type)**
```ts
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  locationId: string;
  status: 'active' | 'inactive' | 'pending';  // <-- string enum, not boolean
  lastVisit: string;  // <-- never returned by backend
}
```

**`website/src/types/customer.ts` — `CustomerFormData`**
```ts
interface CustomerFormData {
  ref, name, phone, email, gender, emergencyphone,
  companyid,
  birthday, birthmonth, birthyear,
  weight, jobtitle, street, cityname, districtname, wardname,
  identitynumber, healthinsurancecardnumber,
  title,              // <-- NOT in backend POST/PUT
  referraluserid, salestaffid, cskhid,
  note, comment, medicalhistory,
  isbusinessinvoice, unitname, unitaddress, taxcode,
  photoUrl,           // <-- NOT in backend (backend uses avatar)
  personalname, personalidentitycard, personaltaxcode, personaladdress
}
```

**`website/src/lib/api/partners.ts` — `ApiPartner`**
```ts
interface ApiPartner {
  id, code, ref, displayname, name, phone, email,
  street, city, district, ward, cityname, districtname, wardname,
  gender, birthyear, birthmonth, birthday,
  medicalhistory, comment, note, status (boolean), treatmentstatus,
  referraluserid, agentid, agentname, companyid, companyname,
  customer, supplier, employee,
  cskhid, cskhname, salestaffid,          // <-- cskhname never returned by backend
  datecreated, lastupdated,
  taxcode, identitynumber, healthinsurancecardnumber, emergencyphone,
  weight, jobtitle, isbusinessinvoice, unitname, unitaddress,
  personalname, personalidentitycard, personaltaxcode, personaladdress
}
```

### Drift Items

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| P1 | Missing fields (frontend type) | `Customer` type lacks 40+ fields returned by API (code, displayname, gender, birth*, address, medicalhistory, etc.) | TypeScript allows access to undefined fields at runtime |
| P2 | Type mismatch | `Customer.status` is typed `'active'\|'inactive'\|'pending'` but backend returns `boolean` (`active` column aliased as `status`) | UI components may mis-render status |
| P3 | Missing fields (frontend API) | `ApiPartner` is missing many detail-only fields: `avatar`, `zaloid`, `barcode`, `fax`, `hotline`, `website`, `iscompany`, `ishead`, `customername`, `invoicereceivingmethod`, `receiveremail`, `receiverzalonumber`, `stageid`, `lasttreatmentcompletedate`, `sequencenumber`, `sequenceprefix`, `isagent`, `isinsurance`, `createdbyname`, `updatedbyname`, `appointmentcount`, `ordercount`, `dotkhamcount` | Detail views may reference undefined properties |
| P4 | Extra field (frontend API) | `ApiPartner.cskhname` is typed but backend never returns it (only `cskhid`) | Will always be `undefined` at runtime |
| P5 | Extra field (frontend form) | `CustomerFormData.title` is not accepted by backend POST/PUT | Sent in request but silently ignored |
| P6 | Renamed field | `CustomerFormData.photoUrl` vs backend `avatar` | Form submission may lose avatar data |
| P7 | Missing typed aggregates | `PaginatedResponse<ApiPartner>` does not include `aggregates` field, yet backend always returns it | TypeScript says `aggregates` does not exist on response |
| P8 | CamelCase passthrough drift | `core.ts` has `CAMEL_CASE_PASSTHROUGH` set for `isDoctor`, `isAssistant`, etc., but `ApiPartner` uses `status` (mapped from `active`). No passthrough entry for `companyId` used in `fetchPartners` params | Query param `companyId` becomes `company_id` but backend expects `company_id`? Actually backend list doesn't read `company_id` at all — filter is unimplemented |

---

## 2. Appointments (/api/Appointments)

### Backend Response Shape

**GET /api/Appointments (list)**
```
{
  offset, limit, totalItems,
  items: [{
    id, name, date, time, datetimeappointment, dateappointmentreminder,
    timeexpected, note, state, reason, aptstate,
    partnerid, partnername, partnerdisplayname, partnerphone, partnercode,
    companyid, companyname, userid, username,
    doctorid, doctorname,
    assistantid, assistantname, dentalaideid, dentalaidename,
    dotkhamid, dotkhamname, saleorderid, saleordername,
    isrepeatcustomer, color,
    datetimearrived, datetimeseated, datetimedismissed, datedone,
    lastdatereminder, customercarestatus, isnotreatment,
    leadid, callid, teamid, teamname,
    customerreceiptid, receiptdate,
    datecreated, lastupdated, createdbyid, writebyid,
    productid, productname
  }],
  aggregates: { total, byState: {} }
}
```
Valid `state` values: `'draft'`, `'scheduled'`, `'confirmed'`, `'arrived'`, `'in Examination'`, `'in-progress'`, `'done'`, `'cancelled'`.

**GET /api/Appointments/:id**
Same as list item plus `partneremail`.

**POST /api/Appointments**
Body accepts: `date`, `time`, `partnerId`/`partnerid`, `doctorId`/`doctorid`, `companyId`/`companyid`, `note`, `timeExpected`/`timeexpected`, `color`, `state`, `productId`/`productid`, `assistantId`/`assistantid`, `dentalAideId`/`dentalaideid`.

**PUT /api/Appointments/:id**
Body accepts same fields as POST (all optional).

### Frontend Expected Shape

**`website/src/types/appointment.ts` — `CalendarAppointment`**
```ts
interface CalendarAppointment {
  id: string;
  customerId: string;       // <-- backend calls it partnerid
  customerName: string;     // <-- backend calls it partnername
  customerPhone: string;    // <-- backend calls it partnerphone
  customerCode: string;     // <-- backend calls it partnercode
  serviceName: string;      // <-- backend calls it productname
  appointmentType: AppointmentType;
  dentist: string;          // <-- backend calls it doctorname
  dentistId: string;        // <-- backend calls it doctorid
  date: string;
  startTime: string;        // <-- backend calls it time; no endTime returned
  endTime: string;          // <-- NEVER returned by backend
  status: AppointmentStatus; // <-- 'scheduled'|'confirmed'|'in-progress'|'completed'|'cancelled'
  locationId: string;       // <-- backend calls it companyid
  locationName: string;     // <-- backend calls it companyname
  notes: string;            // <-- backend calls it note
  color: string | null;
  timeexpected?: number | null;
  arrivalTime: string | null;        // <-- backend has datetimearrived (not in ApiAppointment type!)
  treatmentStartTime: string | null; // <-- backend has datetimeseated (not typed!)
  assistantId?: string | null;
  assistantName?: string | null;
  dentalAideId?: string | null;
  dentalAideName?: string | null;
  productId?: string | null;
}
```

**`website/src/types/appointment.ts` — `ManagedAppointment`**
Adds `checkInStatus`, `completionTime`, `convertedToServiceId`, `estimatedDuration`. `checkInStatus` does not exist in backend at all.

**`website/src/lib/api/appointments.ts` — `ApiAppointment`**
```ts
interface ApiAppointment {
  id, name, date, time, datetimeappointment,
  timeexpected, timeExpected, note, state, reason,
  partnerid, partnername, partnerdisplayname, partnerphone, partnercode,
  doctorid, doctorId, doctorname,
  companyid, companyname, color,
  productid, productname,
  datecreated, lastupdated,
  assistantid, assistantname, dentalaideid, dentalaidename
}
```

### Drift Items

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| A1 | Field naming mismatch | `CalendarAppointment` uses `customerId`/`customerName`/`customerPhone`/`customerCode` but backend returns `partnerid`/`partnername`/`partnerphone`/`partnercode` | Mapping layer required; direct assignment fails |
| A2 | Field naming mismatch | `CalendarAppointment` uses `dentist`/`dentistId` but backend returns `doctorname`/`doctorid` | Same as above |
| A3 | Field naming mismatch | `CalendarAppointment` uses `serviceName` but backend returns `productname` | Same as above |
| A4 | Missing field | `CalendarAppointment.endTime` is typed but backend never returns it; frontend must compute `time + timeexpected` | Runtime undefined |
| A5 | Status value mismatch | Frontend `AppointmentStatus` = `'scheduled'\|'confirmed'\|'in-progress'\|'completed'\|'cancelled'`. Backend `state` includes `'draft'`, `'arrived'`, `'in Examination'`, `'done'` and uses `'in-progress'` (with hyphen) | State machine logic may break; `'in Examination'` has a space which is unusual for a state value |
| A6 | Missing fields in API type | `ApiAppointment` omits ~20 backend fields: `aptstate`, `userid`, `username`, `dotkhamid`, `dotkhamname`, `saleorderid`, `saleordername`, `isrepeatcustomer`, `datetimearrived`, `datetimeseated`, `datetimedismissed`, `datedone`, `lastdatereminder`, `customercarestatus`, `isnotreatment`, `leadid`, `callid`, `teamid`, `teamname`, `customerreceiptid`, `receiptdate`, `createdbyid`, `writebyid` | Detail views may fail |
| A7 | Missing typed aggregates | Backend returns `aggregates.byState` but `PaginatedResponse<ApiAppointment>` lacks it | Type error on access |
| A8 | Phantom type field | `ManagedAppointment.checkInStatus` ('not-arrived' \u2192 'done') does not exist in backend schema | Entire check-in flow is frontend-only fiction unless mapped from backend `state`/`aptstate` |
| A9 | Phantom type field | `ManagedAppointment.completionTime` typed but only backend `datedone` exists; not in `ApiAppointment` | Runtime undefined unless manually mapped |
| A10 | Missing endpoint | Frontend API client has no `deleteAppointment` function | Appointments cannot be deleted from UI |

---

## 3. Payments (/api/Payments)

### Backend Response Shape

**GET /api/Payments**
```
{
  items: [{
    id, customerId, serviceId,
    amount (number), method,
    depositUsed, cashAmount, bankAmount,
    notes, paymentDate, referenceCode,
    status ('posted' | 'voided'),
    receiptNumber, depositType ('deposit' | 'refund' | 'usage' | null),
    createdAt,
    allocations: [{
      id, paymentId,
      invoiceId?, invoiceName?, invoiceCode?, invoiceTotal?, invoiceResidual?,
      dotkhamId?, dotkhamName?, dotkhamTotal?, dotkhamResidual?,
      allocatedAmount
    }]
  }],
  totalItems
}
```
Fallback to `accountpayments` table when `payments` table returns empty (hardcodes `method='cash'`, zeroes for depositUsed/cashAmount/bankAmount).

**POST /api/Payments**
Body: `customer_id`, `service_id`, `amount`, `method`, `notes`, `payment_date`, `reference_code`, `status`, `deposit_used`, `cash_amount`, `bank_amount`, `deposit_type`, `receipt_number`, `allocations`.

**POST /api/Payments/refund**
Body: `customer_id`, `amount`, `method`, `notes`, `payment_date`.

**PATCH /api/Payments/:id**
Allowed fields: `amount`, `method`, `notes`, `payment_date`, `reference_code`, `status`, `deposit_type`, `receipt_number`.

**DELETE /api/Payments/:id**
Reverses allocations then deletes row.

**POST /api/Payments/:id/void**
Reverses allocations, sets status='voided', appends reason to notes.

**POST /api/Payments/:id/proof**
Body: `proofImageBase64`, `qrDescription`.

### Frontend Expected Shape

**`website/src/types/payment.ts` — `PaymentRecord`**
```ts
interface PaymentRecord {
  id, customerId,
  customerName: string;        // <-- NOT returned by backend
  customerPhone: string;       // <-- NOT returned by backend
  recordId: string;            // <-- NOT returned by backend
  recordType: RecordType;      // <-- NOT returned by backend
  recordName: string;          // <-- NOT returned by backend
  amount, method,
  status: PaymentStatus;       // <-- 'completed'|'pending'|'partial'|'refunded' (NOT backend 'posted'|'voided')
  date: string;
  locationName: string;        // <-- NOT returned by backend
  notes, receiptNumber, referenceCode,
  sources?: { depositAmount, cashAmount, bankAmount }; // <-- NOT returned as nested object by backend
  isFullPayment: boolean;      // <-- NOT returned by backend
  dueDate?: string;            // <-- NOT returned by backend
}
```

**`website/src/lib/api/payments.ts` — `ApiPayment`**
```ts
interface ApiPayment {
  id, customerId, serviceId, amount, method,
  depositUsed?, cashAmount?, bankAmount?,
  receiptNumber?, depositType?, notes?,
  paymentDate?, referenceCode?,
  status?: 'posted' | 'voided',
  createdAt,
  allocations?: ApiPaymentAllocation[]
}
```

### Drift Items

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| Y1 | Status type mismatch | `PaymentRecord.status` is `'completed'\|'pending'\|'partial'\|'refunded'` but backend returns `'posted'\|'voided'` | Display logic must transform; no canonical mapping exists in code |
| Y2 | Missing fields (backend) | `PaymentRecord` expects `customerName`, `customerPhone`, `recordId`, `recordType`, `recordName`, `locationName`, `isFullPayment`, `dueDate` — none returned by backend | These are UI-convenience fields that must be populated elsewhere |
| Y3 | Missing fields (frontend API) | `ApiPayment` does not include `recordId`, `recordType`, `customerName`, `customerPhone`, `locationName`, `isFullPayment`, `dueDate` | Using `ApiPayment` as `PaymentRecord` fails |
| Y4 | Missing endpoint | Frontend API client has no `fetchPaymentById(id)` despite backend supporting `GET /api/Payments/:id` | UI cannot load a single payment detail |
| Y5 | Missing fields in update | `updatePayment` in frontend does not send `depositUsed`, `cashAmount`, `bankAmount`, yet backend `PATCH` allows them | Mixed payments cannot be corrected via UI |
| Y6 | Legacy fallback type drift | When backend falls back to `accountpayments`, `method` is hardcoded `'cash'`, `depositUsed`/`cashAmount`/`bankAmount` are `0`, and `allocations` are empty — but frontend types expect real values | Legacy payments display incorrect method/breakdown |
| Y7 | Snake/camel mismatch in create | `createPayment` body sends `customer_id`, `service_id`, etc. (snake_case) directly because `apiFetch` only converts query params, **not** request bodies | Backend happens to accept snake_case because Express `req.body` matches, but this is accidental |

---

## 4. SaleOrders (/api/SaleOrders)

### Backend Response Shape

**GET /api/SaleOrders (list)**
```
{
  offset, limit, totalItems,
  items: [{
    id, name, code,
    partnerid, partnername, partnerdisplayname,
    amounttotal, residual, totalpaid,
    state ('sale' | 'done' | 'cancel' | 'draft'),
    companyid, companyname,
    doctorid, doctorname,
    assistantid, assistantname, dentalaideid, dentalaidename,
    quantity, unit, datestart, dateend, notes,
    sourceid, sourcename,
    productid, productname,
    tooth_numbers, tooth_comment,
    datecreated, isdeleted
  }],
  aggregates: { total, totalAmount, totalPaid, totalResidual }
}
```

**GET /api/SaleOrders/:id**
Same as list item plus:
```
lines: [{ id, orderid, pricetotal, isdeleted }]
```

**POST /api/SaleOrders**
Body: `partnerid`, `companyid`, `productid`, `productname`, `doctorid`, `doctorname`, `assistantid`, `dentalaideid`, `quantity`, `unit`, `amounttotal`, `datestart`, `dateend`, `notes`, `tooth_numbers`, `tooth_comment`, `sourceid`.

**PATCH /api/SaleOrders/:id/state**
Body: `state` \u2208 `['sale', 'done', 'cancel', 'draft']`.

**PATCH /api/SaleOrders/:id**
Body: `partnerid`, `companyid`, `productid`, `productname`, `doctorid`, `assistantid`, `dentalaideid`, `quantity`, `unit`, `amounttotal`, `datestart`, `dateend`, `notes`, `tooth_numbers`, `tooth_comment`, `sourceid`.

### Frontend Expected Shape

**`website/src/types/customer.ts` — `CustomerService`**
```ts
interface CustomerService {
  id, date,
  service: string;            // <-- backend calls it productname
  doctor: string;             // <-- backend calls it doctorname
  doctorId?: string;          // <-- backend calls it doctorid
  assistantId?, assistantName?, dentalAideId?, dentalAideName?,
  catalogItemId?: string;     // <-- backend calls it productid
  cost: number;               // <-- backend calls it amounttotal
  quantity?, unit?,
  status: 'completed' | 'active' | 'cancelled'; // <-- backend uses state: 'sale'|'done'|'cancel'|'draft'
  tooth: string;              // <-- backend calls it tooth_numbers
  notes,
  orderName?, orderCode?, paidAmount?, residual?, sourceId?, locationName?
}
```

**`website/src/lib/api/saleOrders.ts` — `ApiSaleOrder`**
```ts
interface ApiSaleOrder {
  id, name, datecreated, state,
  partnerid, partnername, partnerdisplayname,
  companyid, companyname,
  doctorid, doctorname,
  assistantid, assistantname, dentalaideid, dentalaidename,
  productid, productname,
  quantity: string | null;      // <-- backend returns numeric
  unit: string | null,
  amounttotal: string | null;   // <-- backend returns numeric
  residual: string | null;      // <-- backend returns numeric
  totalpaid: string | null;     // <-- backend returns numeric
  datestart, dateend, notes,
  tooth_numbers, tooth_comment,
  sourceid, sourcename,
  lastupdated, isdeleted,
  code?, ref?, origin?          // <-- ref & origin never returned by backend
}
```

### Drift Items

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| S1 | Field naming mismatch | `CustomerService.service` maps to backend `productname`; `CustomerService.doctor` maps to `doctorname`; `CustomerService.tooth` maps to `tooth_numbers`; `CustomerService.catalogItemId` maps to `productid` | Mapping layer required |
| S2 | Type mismatch | `ApiSaleOrder.amounttotal`, `residual`, `totalpaid` typed as `string | null` but backend returns SQL `numeric` (number in JSON) | Arithmetic operations fail without parseFloat |
| S3 | Type mismatch | `ApiSaleOrder.quantity` typed as `string | null` but backend may return number | Same as above |
| S4 | Status value mismatch | `CustomerService.status` uses `'completed'\|'active'\|'cancelled'` but backend `state` uses `'sale'\|'done'\|'cancel'\|'draft'` | No canonical mapping; UI state chips may break |
| S5 | Extra fields (frontend API) | `ApiSaleOrder.ref` and `origin` are typed but backend list/detail queries never return them | Always undefined |
| S6 | Missing nested type | `GET /api/SaleOrders/:id` returns `lines: [{ id, orderid, pricetotal, isdeleted }]` but `ApiSaleOrder` does not include `lines` | Type error when accessing detail view |
| S7 | Missing endpoint | No `deleteSaleOrder` in frontend API client | UI cannot delete sale orders |
| S8 | Unused body fields | `createSaleOrder` accepts `partnername` and `doctorname` which backend ignores (only uses IDs) | Dead code / confusion |
| S9 | Missing aggregates type | Backend returns `aggregates` but `PaginatedResponse<ApiSaleOrder>` lacks it | Type error on access |

---

## 5. Employees (/api/Employees)

### Backend Response Shape

**GET /api/Employees (list)**
```
{
  offset, limit, totalItems,
  items: [{
    id, name, ref, phone, email, avatar,
    isdoctor, isassistant, isreceptionist, active,
    jobtitle, companyid, companyname,
    hrjobid, hrjobname,
    wage, allowance, startworkdate,
    tierId, tierName,
    datecreated, lastupdated,
    locationScopeIds: string[]   // attached dynamically
  }]
}
```

**GET /api/Employees/:id**
Same as list plus:
```
address, identitycard, birthday,
hourlywage, leavepermonth, regularhour, overtimerate, restdayrate,
enrollnumber, medicalprescriptioncode
```

**POST /api/Employees**
Body: `name`, `phone`, `email`, `companyid`, `active`, `isdoctor`, `isassistant`, `isreceptionist`, `startworkdate`, `password`, `jobtitle`, `locationScopeIds`.
⚠️ **Writes to `partners` table, not `employees` table.**

**PUT /api/Employees/:id**
Body: same as POST plus `tierId`. Updates `partners` table; mirrors `tierId` into `employee_permissions`.

**DELETE /api/Employees/:id**
Sets `active = false` on `partners` table.

### Frontend Expected Shape

**`website/src/types/employee.ts` — `Employee`**
```ts
interface Employee {
  id, name, avatar,
  tierId, tierName,
  roles: EmployeeRole[];       // <-- computed client-side, never returned by backend
  status: EmployeeStatus;      // <-- 'active'|'on-leave'|'inactive' (backend returns boolean active)
  locationId: string;          // <-- backend calls it companyid
  locationName: string;        // <-- backend calls it companyname
  locationScopeIds?: string[];
  phone, email,
  schedule: ScheduleBlock[];   // <-- NEVER returned by backend
  linkedEmployeeIds: string[]; // <-- NEVER returned by backend
  hireDate: string;            // <-- backend calls it startworkdate
}
```

**`website/src/lib/api/employees.ts` — `ApiEmployee`**
```ts
interface ApiEmployee {
  id, name, ref, phone, email, avatar,
  isdoctor, isassistant, isreceptionist, active,
  companyid, companyname, locationScopeIds?,
  hrjobid, hrjobname,
  tierId?, tierName?, jobtitle?,
  wage: string | null;         // <-- backend returns number
  allowance: string | null;    // <-- backend returns number
  startworkdate, datecreated, lastupdated
}
```

**`website/src/lib/api/employees.ts` — `CreateEmployeeData`**
```ts
interface CreateEmployeeData {
  name, phone?, email?, password?, companyid?,
  isdoctor?, isassistant?, isreceptionist?, jobtitle?, active?,
  wage?, allowance?, startworkdate?, locationScopeIds?, tierId?
}
```

### Drift Items

| # | Category | Issue | Impact |
|---|----------|-------|--------|
| E1 | Architecture drift | `POST /api/Employees` inserts into `partners` table; `GET /api/Employees` queries `employees` table. If no view/trigger syncs them, created employees are invisible in list | **Critical**: new employees may not appear in employee list |
| E2 | Missing fields (frontend API) | `ApiEmployee` lacks detail-only fields: `address`, `identitycard`, `birthday`, `hourlywage`, `leavepermonth`, `regularhour`, `overtimerate`, `restdayrate`, `enrollnumber`, `medicalprescriptioncode` | Employee profile detail view incomplete |
| E3 | Type mismatch | `ApiEmployee.wage` and `allowance` typed as `string | null` but backend returns numeric | Arithmetic fails |
| E4 | Phantom type fields | `Employee.roles`, `Employee.schedule`, `Employee.linkedEmployeeIds` are typed but backend never returns them | Must be hydrated client-side; risk of undefined access |
| E5 | Field naming mismatch | `Employee.locationId`/`locationName` map to `companyid`/`companyname`; `Employee.hireDate` maps to `startworkdate` | Mapping layer required |
| E6 | Status type mismatch | `Employee.status` is `'active'\|'on-leave'\|'inactive'` but backend returns `active` as boolean | No mapping for 'on-leave' state |
| E7 | Ignored create fields | `CreateEmployeeData` includes `wage`, `allowance`, `tierId` but backend `POST` ignores them (only inserts limited partner columns) | Data loss on creation; tier must be set via separate `PUT` |
| E8 | Missing endpoint | No `fetchEmployeeById` wrapper in frontend API client (only `fetchEmployees` list) | Detail pages may fetch via generic mechanism |

---

## Summary Matrix

| Route | Missing Fields (FE types) | Extra Fields (FE types) | Type Mismatches | Missing Endpoints | Architecture Issues |
|-------|---------------------------|-------------------------|-----------------|-------------------|---------------------|
| Partners | 40+ (avatar, zaloid, barcode, counts, etc.) | `cskhname`, `title`, `photoUrl` | `status` boolean vs enum, aggregates untyped | — | — |
| Appointments | ~20 (aptstate, userid, arrival timestamps, etc.) | `endTime`, `checkInStatus`, `completionTime`, `convertedToServiceId` | `status` values differ; `state` vs `status` naming | `deleteAppointment` | — |
| Payments | `recordId`, `recordType`, `customerName`, `locationName`, `isFullPayment`, `dueDate` | `customerName`, `customerPhone`, `recordName`, `locationName`, `isFullPayment`, `dueDate`, `sources` | `status` enum mismatch; legacy fallback hardcodes | `fetchPaymentById` | Legacy fallback hardcodes method/cashAmount |
| SaleOrders | `lines` nested array | `ref`, `origin` | `amounttotal`/`residual`/`totalpaid` string vs number; `status` enum mismatch | `deleteSaleOrder` | — |
| Employees | `address`, `identitycard`, `birthday`, `hourlywage`, etc. | `roles`, `schedule`, `linkedEmployeeIds` | `wage`/`allowance` string vs number; `status` boolean vs enum | `fetchEmployeeById` | **POST writes to `partners`, GET reads from `employees`** |
