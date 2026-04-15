# TGroup Database Schema

## Connection

### ⚠️ Local Development (Mac / Homebrew)
```
postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo
```
- **Port:** `5433` — Homebrew PostgreSQL@15
- **Start:** `pg_ctl -D /opt/homebrew/var/postgresql@15 start`
- **Data dir:** `/opt/homebrew/var/postgresql@15`

### Docker / VPS
```
postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo
```
- **Port:** `55433` — Docker-mapped port (only when `docker compose up db` is running)

**CRITICAL for local dev:** The API `.env` must use **port 5433**. Port 55433 will throw `ECONNREFUSED` if Docker is not running.

**Last verified:** 2026-04-15 (from live database via `\d tablename`)

---

## Tables

### dbo.companies
Clinic branches/locations. 7 branches.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NOT NULL | Primary key |
| name | text | NOT NULL | Company name |
| partnerid | uuid | NOT NULL | FK → partners (owner/manager) |
| email | text | YES | Contact email |
| phone | text | YES | Contact phone |
| logo | text | YES | Logo URL/path |
| active | boolean | NOT NULL | Active status |
| address | text | YES | Physical address (via parent or separate) |
| taxcode | text | YES | Tax code |
| taxbankaccount | text | YES | Tax bank account |
| taxbankname | text | YES | Tax bank name |
| taxphone | text | YES | Tax phone |
| taxunitaddress | text | YES | Tax unit address |
| taxunitname | text | YES | Tax unit name |
| medicalfacilitycode | text | YES | Medical facility code |
| currencyid | uuid | YES | Currency FK |
| parentid | uuid | YES | Parent company FK |
| parentpath | text | YES | Parent path |
| datecreated | timestamp | YES | Creation date |
| lastupdated | timestamp | YES | Last update |
| createdbyid | text | YES | Created by user ID |
| writebyid | text | YES | Last updated by user ID |
| + ~15 more config columns | | | SMS, e-invoice, prescription config |

**Indexes:** `companies_pkey` (id)

### dbo.partners
Customers AND employees/doctors. All in one table. 56+ records.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NOT NULL | Primary key |
| displayname | text | YES | Display name |
| name | text | NOT NULL | Full name |
| namenosign | text | YES | Name without diacritics |
| street | text | YES | Home address |
| phone | text | YES | Phone number |
| email | text | YES | Email address |
| supplier | boolean | NOT NULL | Is supplier |
| customer | boolean | NOT NULL | Is customer |
| isagent | boolean | NOT NULL | Is sales agent |
| isinsurance | boolean | NOT NULL | Is insurance |
| companyid | uuid | YES | FK → companies |
| ref | text | YES | Reference code |
| active | boolean | NOT NULL | Active status |
| employee | boolean | NOT NULL | Is employee |
| isdoctor | boolean | NOT NULL (default: false) | Is doctor |
| isassistant | boolean | NOT NULL (default: false) | Is assistant |
| isreceptionist | boolean | NOT NULL (default: false) | Is receptionist |
| gender | text | YES | Gender |
| jobtitle | text | YES | Job title |
| birthyear | integer | YES | Birth year |
| birthmonth | integer | YES | Birth month |
| birthday | integer | YES | Birth day |
| medicalhistory | text | YES | Medical history |
| citycode | text | YES | City code |
| cityname | text | YES | City name |
| districtcode | text | YES | District code |
| districtname | text | YES | District name |
| wardcode | text | YES | Ward code |
| wardname | text | YES | Ward name |
| sourceid | uuid | YES | Customer source FK |
| referraluserid | text | YES | Referral user ID |
| note | text | YES | Notes |
| comment | text | YES | Comments |
| avatar | text | YES | Avatar URL |
| zaloid | text | YES | Zalo ID |
| weight | numeric | YES | Weight |
| healthinsurancecardnumber | text | YES | Health insurance card |
| emergencyphone | text | YES | Emergency phone |
| taxcode | text | YES | Tax code |
| identitynumber | text | YES | Identity number |
| treatmentstatus | text | YES | Treatment status |
| cskhid | uuid | YES | Customer care staff FK |
| salestaffid | uuid | YES | Sales staff FK |
| hrjobid | uuid | YES | HR job classification FK |
| startworkdate | timestamp | YES | Start work date (employees) |
| wage | numeric | YES | Base wage (employees) |
| allowance | numeric | YES | Allowance (employees) |
| password_hash | text | YES | Auth password hash |
| face_subject_id | text | YES (UNIQUE) | CompreFace subject ID |
| face_registered_at | timestamp | YES | Face registration date |
| datecreated | timestamp | YES | Creation date |
| lastupdated | timestamp | YES | Last update |
| + ~20 more CRM/invoice columns | | | stageid, sequencenumber, isbusinessinvoice, etc. |

**Indexes:** `partners_pkey` (id), `idx_partners_companyid` (companyid), `idx_partners_cskhid` (cskhid), `idx_partners_salestaffid` (salestaffid), `partners_face_subject_id_key` (face_subject_id)

**FK:** `companyid` → `dbo.companies(id)` ON DELETE SET NULL

### dbo.appointments
Patient appointments. 120+ records.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NOT NULL | Primary key |
| name | text | NOT NULL | Appointment name/title |
| date | timestamp | NOT NULL | Appointment date & time |
| time | text | YES | Time string (e.g. "09:00") |
| datetimeappointment | timestamp | YES | Exact datetime |
| dateappointmentreminder | timestamp | YES | Reminder date |
| timeexpected | integer | NOT NULL | Expected duration (minutes) |
| note | text | YES | Notes (contains Service:, Duration:, Type: lines) |
| userid | text | YES | Assigned user ID |
| partnerid | uuid | NOT NULL | FK → partners (patient) |
| companyid | uuid | NOT NULL | FK → companies (location) |
| doctorid | uuid | YES | FK → partners (doctor) |
| dotkhamid | uuid | YES | FK → medical record |
| saleorderid | uuid | YES | FK → saleorders |
| state | text | YES | Appointment state (pending/confirmed/done/cancelled) |
| reason | text | YES | Cancellation/change reason |
| isrepeatcustomer | boolean | NOT NULL | Is returning customer |
| color | text | YES | Display color |
| aptstate | text | YES | Additional state (check-in flow) |
| datetimearrived | timestamp | YES | Check-in time |
| datetimeseated | timestamp | YES | Seated time |
| datetimedismissed | timestamp | YES | Dismissed time |
| datedone | timestamp | YES | Completed time |
| customercarestatus | integer | YES | Customer care status |
| isnotreatment | boolean | NOT NULL | No treatment flag |
| customerreceiptid | uuid | YES | FK → payment receipt |
| leadid | uuid | YES | Lead FK |
| callid | uuid | YES | Call FK |
| teamid | uuid | YES | Team FK |
| crmtaskid | uuid | YES | CRM task FK |
| confirmedid | uuid | YES | Confirmed by FK |
| lastdatereminder | timestamp | YES | Last reminder date |
| createdbyid | text | YES | Created by |
| writebyid | text | YES | Updated by |
| datecreated | timestamp | YES | Creation date |
| lastupdated | timestamp | YES | Last update |

**NOTE:** Column names use NO underscores for FKs: `partnerid`, `companyid`, `doctorid` (NOT `partner_id`, `company_id`, `doctor_id`). Status column is `state` (NOT `status`). Date column is `date` (NOT `appointment_date`).

**Indexes:** `appointments_pkey` (id), `idx_appointments_companyid` (companyid), `idx_appointments_date` (date), `idx_appointments_partnerid` (partnerid)

**FK:** `companyid` → `dbo.companies(id)` ON DELETE CASCADE, `partnerid` → `dbo.partners(id)` ON DELETE CASCADE

### dbo.saleorders
Treatment/service orders linked to patients. Replaces the old "services" concept.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| name | text | YES | | Order name |
| code | text | YES | | Unique order code |
| partnerid | uuid | YES | | FK → partners (patient) |
| companyid | uuid | YES | | FK → companies (location) |
| doctorid | uuid | YES | | FK → partners (doctor) |
| assistantid | uuid | YES | | FK → partners (assistant) |
| dentalaideid | uuid | YES | | FK → partners (dental aide) |
| amounttotal | numeric | YES | 0 | Total amount |
| residual | numeric | YES | 0 | Remaining balance |
| totalpaid | numeric | YES | 0 | Amount paid |
| state | text | YES | 'draft' | Order state |
| isdeleted | boolean | YES | false | Soft delete |
| quantity | numeric | YES | 1 | Quantity |
| unit | text | YES | 'răng' | Unit (default: tooth) |
| datestart | date | YES | | Treatment start date |
| dateend | date | YES | | Expected end date |
| notes | text | YES | | Notes |
| datecreated | timestamp | YES | now() | Creation date |

**Indexes:** `saleorders_pkey` (id), `uniq_saleorders_code` (code) WHERE code IS NOT NULL AND isdeleted = false

### dbo.products (Service Catalog)
Dental service catalog — the list of available procedures with prices.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| name | text | NOT NULL | | Service name |
| namenosign | text | YES | | Name without diacritics |
| defaultcode | text | YES | | Service code |
| type | text | YES | 'service' | Product type |
| type2 | text | YES | 'service' | Secondary type |
| listprice | numeric | YES | 0 | List price |
| saleprice | numeric | YES | 0 | Sale price |
| purchaseprice | numeric | YES | 0 | Purchase price |
| laboprice | numeric | YES | 0 | Lab price |
| categid | uuid | YES | | FK → productcategories |
| uomid | uuid | YES | | Unit of measure FK |
| uomname | text | YES | 'Lần' | Unit name (default: "session") |
| companyid | uuid | YES | | FK → companies |
| active | boolean | NOT NULL | true | Active status |
| canorderlab | boolean | NOT NULL | false | Can order lab work |
| datecreated | timestamp | YES | now() | Creation date |
| lastupdated | timestamp | YES | now() | Last update |

**NOTE:** This is `dbo.products`, NOT `dbo.services`. The old `dbo.services` table does NOT exist in the database. Frontend ServiceCatalog uses `/api/Products` endpoint.

### dbo.payments
Payment records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | Primary key |
| customer_id | uuid | YES | | FK → partners |
| service_id | uuid | YES | | FK → saleorders |
| amount | numeric | YES | 0 | Payment amount |
| method | text | YES | 'cash' | Payment method |
| notes | text | YES | | Notes |
| payment_date | date | YES | | Payment date |
| reference_code | text | YES | | Reference code |
| status | varchar(20) | YES | 'posted' | Payment status |
| deposit_used | numeric(15,2) | YES | 0 | Deposit amount used |
| cash_amount | numeric(15,2) | YES | 0 | Cash portion |
| bank_amount | numeric(15,2) | YES | 0 | Bank transfer portion |
| receipt_number | text | YES | | Receipt number |
| deposit_type | varchar(20) | YES | | 'deposit'/'refund'/'usage' |
| created_at | timestamp | YES | now() | Creation date |

**NOTE:** This table uses `customer_id` and `service_id` (WITH underscores), unlike appointments/saleorders. Mixed convention.

## Views

### dbo.employees
View over `partners` where `employee=true`. Passes through real columns.

| Column | Source | Description |
|--------|--------|-------------|
| id | partners.id | Primary key |
| name | partners.name | Full name |
| isdoctor | partners.isdoctor | Is doctor |
| isassistant | partners.isassistant | Is assistant |
| isreceptionist | partners.isreceptionist | Is receptionist |
| active | partners.active | Active status |
| jobtitle | partners.jobtitle | Job title |
| companyid | partners.companyid | FK → companies |
| hrjobid | partners.hrjobid | FK → hrjobs |
| wage | partners.wage | Base wage |
| allowance | partners.allowance | Allowance |
| startworkdate | partners.startworkdate | Start work date |
| address | partners.street | Home address |
| birthday | derived | From birthyear/birthmonth/birthday |

### dbo.customerreceipts
View. Returns only `id` and `dateexamination`.

---

## Naming Convention Gotchas

| Table | FK Convention | Status Column | Date Column | Created Column |
|-------|---------------|---------------|-------------|----------------|
| appointments | `partnerid` (no underscore) | `state` | `date` | `datecreated` |
| saleorders | `partnerid` (no underscore) | `state` | — | `datecreated` |
| partners | `companyid` (no underscore) | `active` (boolean) | — | `datecreated` |
| companies | `partnerid` (no underscore) | `active` (boolean) | — | `datecreated` |
| products | `companyid` (no underscore) | `active` (boolean) | — | `datecreated` |
| payments | `customer_id` (WITH underscore) | `status` | `payment_date` | `created_at` |
| employees (view) | `companyid` (no underscore) | `active` | — | `datecreated` |

**Key takeaway:** Most tables use no underscores for FKs and `state`/`datecreated`/`lastupdated`. The `payments` table is the exception (uses underscores, `status`, `created_at`).

## Demo Data Summary (After Seeding)

| Entity | Count | Notes |
|--------|-------|-------|
| Companies (Locations) | 7 | 7 clinic branches |
| Partners (Total) | 340 | 40 customers + 300 employees |
| Customers | 40 | Active dental patients |
| Employees | 300 | Includes ~110 doctors |
| Appointments | ~160 | Total across all dates |
| Appointments (today) | 24 | Seeded for the current calendar day |
| Products (Service Catalog) | 20+ | Real service catalog |
| Sale Orders | Active | Treatment orders linked to patients |
| Payments | Active | Payment records with allocations |
