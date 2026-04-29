# TGroup Database Schema

## Connection

**Local Development:**
```
postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo
```

## Core Tables

### dbo.companies
Clinic branches/locations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(255) | Company name |
| address | text | Physical address |
| phone | varchar(50) | Contact phone |
| email | varchar(255) | Contact email |
| status | varchar(50) | active/inactive |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Count:** 7 branches

### dbo.partners
Customers and employees (doctors/staff).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Full name |
| email | text | Email address |
| phone | text | Phone number |
| street | text | Home address |
| jobtitle | text | Job title (e.g. "Bác sĩ Nha khoa") |
| customer | boolean | Is customer |
| employee | boolean | Is employee |
| active | boolean | Active status |
| isdoctor | boolean | Is doctor |
| isassistant | boolean | Is assistant |
| isreceptionist | boolean | Is receptionist |
| companyid | uuid | FK → companies |
| hrjobid | uuid | FK → hrjobs (for HR job classification) |
| startworkdate | timestamp | Start work date |
| wage | numeric | Base wage |
| allowance | numeric | Allowance |
| password_hash | text | Auth password hash |
| tier_id | uuid | FK → permission_groups |
| datecreated | timestamp | Creation date |
| lastupdated | timestamp | Last update |

**Count:** 370 total (employees + customers combined)

### dbo.appointments
Patient appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Appointment title |
| partnerid | uuid | FK → partners (patient) |
| doctorid | uuid | FK → partners (doctor) |
| companyid | uuid | FK → companies |
| date | timestamp | Date & time |
| time | text | Time string |
| status | varchar(50) | pending/confirmed/completed/cancelled |
| note | text | Appointment notes |
| timeexpected | integer | Expected duration (minutes) |
| color | text | Calendar color |
| productid | uuid | FK → products (service) |
| createdbyid | text | Creator user ID |
| writebyid | text | Last editor ID |
| datecreated | timestamp | Creation date |
| lastupdated | timestamp | Last update |

**Count:** 259 appointments

### dbo.products
Dental services catalog. *(Legacy system uses `products` for services.)*

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(255) | Service name |
| defaultcode | text | Internal code |
| description | text | Service description |
| listprice | decimal(10,2) | Price |
| type | varchar(50) | Product type (usually 'service') |
| categid | uuid | FK → productcategories |
| companyid | uuid | FK → companies |
| active | boolean | Active status |
| datecreated | timestamp | Creation date |
| lastupdated | timestamp | Last update |

**Count:** 162 services

### dbo.saleorders
Sales orders (treatment plans).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partner_id | uuid | FK → partners |
| company_id | uuid | FK → companies |
| order_date | date | Order date |
| total_amount | decimal(10,2) | Total |
| status | varchar(50) | pending/completed/cancelled |
| notes | text | Notes |
| created_at | timestamp | Creation date |

**Count:** 47 sale orders

### dbo.saleorderlines
Order line items.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| saleorderid | uuid | FK → saleorders |
| productid | uuid | FK → products |
| quantity | numeric | Quantity |
| price_unit | decimal(10,2) | Unit price |
| discount | numeric | Discount % |
| amount | decimal(10,2) | Line total |

### dbo.payments
Payment records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partnerid | uuid | FK → partners |
| companyid | uuid | FK → companies |
| amount | decimal(10,2) | Payment amount |
| paymentdate | date | Payment date |
| paymentmethod | varchar(50) | cash/card/transfer |
| state | varchar(50) | Payment status |
| notes | text | Notes |
| datecreated | timestamp | Creation date |

### dbo.monthlyplans
Payment installment plans.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partnerid | uuid | FK → partners |
| companyid | uuid | FK → companies |
| totalamount | decimal(10,2) | Total plan amount |
| downpayment | decimal(10,2) | Initial deposit |
| installments | integer | Number of installments |
| startdate | date | First installment date |
| status | varchar(50) | active/completed/cancelled |

### dbo.dotkhams
Medical records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partnerid | uuid | FK → partners (patient) |
| doctorid | uuid | FK → partners (doctor) |
| companyid | uuid | FK → companies |
| date | timestamp | Record date |
| note | text | Notes |

### dbo.dotkhamsteps
Medical record steps/procedures.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| dotkhamid | uuid | FK → dotkhams |
| productid | uuid | FK → products (service) |
| quantity | numeric | Quantity |
| status | varchar(50) | Status |
| note | text | Notes |

## Views

### dbo.employees
View combining partners with `employee=true`.

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
| tier_id | partners.tier_id | FK → permission_groups |

**Count:** 319 employees

## Permission System Tables

### dbo.permission_groups
Role definitions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(255) | Group name (Admin, Dentist, etc.) |
| color | varchar(50) | Hex color for UI |
| description | text | Description |
| is_system | boolean | System group (non-deletable) |

**Rows:** Admin, Clinic Manager, Dentist, Receptionist, Dental Assistant

### dbo.group_permissions
Role-to-permission mappings.

| Column | Type | Description |
|--------|------|-------------|
| group_id | uuid | FK → permission_groups |
| permission | varchar(255) | Permission string (e.g. customers.view) |

### dbo.employee_permissions
User-to-role assignments.

| Column | Type | Description |
|--------|------|-------------|
| employee_id | uuid | FK → partners |
| group_id | uuid | FK → permission_groups |

### dbo.permission_overrides
Individual grant/revoke exceptions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| employee_id | uuid | FK → partners |
| permission | varchar(255) | Permission string |
| override_type | varchar(50) | grant or revoke |

### dbo.employee_location_scope
User location access control.

| Column | Type | Description |
|--------|------|-------------|
| employee_id | uuid | FK → partners |
| company_id | uuid | FK → companies |

## Feedback Tables

### dbo.feedback_threads
Feedback conversation threads.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Thread title |
| status | varchar(50) | open/closed |
| created_at | timestamp | Creation date |

### dbo.feedback_messages
Individual messages in threads.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| thread_id | uuid | FK → feedback_threads |
| author_name | text | Author name |
| content | text | Message body |
| created_at | timestamp | Creation date |

### dbo.feedback_attachments
Message attachments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| message_id | uuid | FK → feedback_messages |
| file_url | text | Attachment URL |

## Config Tables

### dbo.systempreferences
Application-wide settings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | varchar(255) | Setting key |
| value | text | Setting value |
| updated_at | timestamp | Last update |

### dbo.company_bank_settings
Bank account for VietQR.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| bank_bin | text | Bank BIN |
| bank_number | text | Account number |
| bank_account_name | text | Account holder name |
| updated_at | timestamp | Last update |

### dbo.websitepages
CMS pages.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| slug | varchar(255) | URL slug |
| title | text | Page title |
| content | text | Page content |
| meta_title | text | SEO title |
| meta_description | text | SEO description |
| active | boolean | Published status |

## Demo Data Summary

| Entity | Count |
|--------|-------|
| Companies (Locations) | 7 |
| Partners (Total) | 35,438 |
| Partners (Customers) | ~35,000 |
| Appointments | 222,079 |
| Products (Services) | 407 |
| Sale Orders | 61,459 |
| Sale Order Lines | 63,429 |
| Payments | 61,755 |
| Dotkhams (Medical Records) | 69 |

> ⚠️ These counts reflect the post-TDental-migration database. The original demo data had ~259 appointments and ~370 partners.

## Common Indexes

### Performance-critical indexes (migration 041)
```sql
-- Partners: trigram indexes for fast text search (ILIKE phone/name/ref)
CREATE INDEX idx_partners_phone_trgm ON dbo.partners USING gin (phone gin_trgm_ops);
CREATE INDEX idx_partners_name_trgm ON dbo.partners USING gin (name gin_trgm_ops);
CREATE INDEX idx_partners_namenosign_trgm ON dbo.partners USING gin (namenosign gin_trgm_ops);
CREATE INDEX idx_partners_ref_trgm ON dbo.partners USING gin (ref gin_trgm_ops);

-- Partners: partial index for customer listing (used in EVERY partners query)
CREATE INDEX idx_partners_customer_active ON dbo.partners (datecreated DESC)
    WHERE customer = true AND isdeleted = false;

-- SaleOrders: FK indexes (61K rows — previously seq scan = 15ms)
CREATE INDEX idx_saleorders_partnerid ON dbo.saleorders (partnerid, isdeleted)
    WHERE isdeleted = false;
CREATE INDEX idx_saleorders_companyid ON dbo.saleorders (companyid);
CREATE INDEX idx_saleorders_doctorid ON dbo.saleorders (doctorid);
CREATE INDEX idx_saleorders_state ON dbo.saleorders (state);
CREATE INDEX idx_saleorders_datecreated ON dbo.saleorders (datecreated DESC);

-- SaleOrderLines: FK indexes (63K rows — previously seq scan = 21.5ms)
CREATE INDEX idx_saleorderlines_orderid ON dbo.saleorderlines (orderid);
CREATE INDEX idx_saleorderlines_productid ON dbo.saleorderlines (productid);
CREATE INDEX idx_saleorderlines_employeeid ON dbo.saleorderlines (employeeid);
CREATE INDEX idx_saleorderlines_datecreated ON dbo.saleorderlines (datecreated DESC);

-- Payments: FK + date indexes (62K rows — previously seq scan = 46ms)
CREATE INDEX idx_payments_customer_id ON dbo.payments (customer_id);
CREATE INDEX idx_payments_payment_date ON dbo.payments (payment_date DESC);
CREATE INDEX idx_payments_service_id ON dbo.payments (service_id);
CREATE INDEX idx_payments_category_date ON dbo.payments (payment_category, payment_date DESC);

-- Appointments: additional FK indexes (222K rows)
CREATE INDEX idx_appointments_doctorid ON dbo.appointments (doctorid);
CREATE INDEX idx_appointments_state ON dbo.appointments (state);
CREATE INDEX idx_appointments_productid ON dbo.appointments (productid);
CREATE INDEX idx_appointments_assistantid ON dbo.appointments (assistantid);
CREATE INDEX idx_appointments_date_state ON dbo.appointments (date, state);
```

### Original indexes (pre-TDental migration)
```sql
-- Partners
CREATE INDEX idx_partners_company ON dbo.partners(companyid);

-- Appointments
CREATE INDEX idx_appointments_date ON dbo.appointments(date);
CREATE INDEX idx_appointments_partner ON dbo.appointments(partnerid);
CREATE INDEX idx_appointments_doctor ON dbo.appointments(doctorid);
CREATE INDEX idx_appointments_company ON dbo.appointments(companyid);
CREATE INDEX idx_appointments_status ON dbo.appointments(status);
```
