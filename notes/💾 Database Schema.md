# TGroup Database Schema

## Connection

```
postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo
```

## Tables

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
| datecreated | timestamp | Creation date |
| lastupdated | timestamp | Last update |

**Count:** 56 total (30 customers + 19 doctors + 7 branch accounts)

### dbo.appointments
Patient appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partner_id | uuid | FK → partners (patient) |
| doctor_id | uuid | FK → partners (doctor) |
| company_id | uuid | FK → companies |
| appointment_date | timestamp | Date & time |
| duration | integer | Minutes |
| status | varchar(50) | pending/confirmed/completed/cancelled |
| notes | text | Appointment notes |
| service_id | uuid | FK → services |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

**Count:** 120 appointments

### dbo.services
Dental services catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(255) | Service name |
| description | text | Service description |
| price | decimal(10,2) | Price |
| duration | integer | Duration in minutes |
| category | varchar(100) | Service category |
| status | varchar(50) | active/inactive |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update |

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

### dbo.customerreceipts
Payment receipts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| partner_id | uuid | FK → partners |
| company_id | uuid | FK → companies |
| receipt_date | date | Payment date |
| amount | decimal(10,2) | Amount paid |
| payment_method | varchar(50) | cash/card/transfer |
| notes | text | Notes |
| created_at | timestamp | Creation date |

## Views

### dbo.employees
View combining partners with `employee=true`. Passes through real columns from partners.

| Column | Source | Description |
|--------|--------|-------------|
| id | partners.id | Primary key |
| name | partners.name | Full name |
| isdoctor | partners.isdoctor | Is doctor (real column) |
| isassistant | partners.isassistant | Is assistant (real column) |
| isreceptionist | partners.isreceptionist | Is receptionist (real column) |
| active | partners.active | Active status |
| jobtitle | partners.jobtitle | Job title |
| companyid | partners.companyid | FK → companies |
| hrjobid | partners.hrjobid | FK → hrjobs |
| wage | partners.wage | Base wage |
| allowance | partners.allowance | Allowance |
| startworkdate | partners.startworkdate | Start work date |
| address | partners.street | Home address |
| birthday | derived | From birthyear/birthmonth/birthday |
| hourlywage..enrollnumber | NULL | HR fields (not yet used) |

**Count:** 28 employees (19 doctors + test assistants + admin)

## Empty Tables (Not Yet Used)

- `partnersources` — Customer source tracking
- `agents` — Sales agents
- `aspnetusers` — Auth users
- `dotkhams` — Medical records
- `crmteams` — CRM team assignments
- `saleorderlines` — Order line items
- `accountpayments` — Account payments

## Indexes

Common indexes to add for performance:

```sql
-- Partners
CREATE INDEX idx_partners_customer ON dbo.partners(customer) WHERE customer = true;
CREATE INDEX idx_partners_employee ON dbo.partners(employee) WHERE employee = true;
CREATE INDEX idx_partners_company ON dbo.partners(company_id);

-- Appointments
CREATE INDEX idx_appointments_date ON dbo.appointments(appointment_date);
CREATE INDEX idx_appointments_partner ON dbo.appointments(partner_id);
CREATE INDEX idx_appointments_doctor ON dbo.appointments(doctor_id);
CREATE INDEX idx_appointments_company ON dbo.appointments(company_id);
CREATE INDEX idx_appointments_status ON dbo.appointments(status);
```

## Demo Data Summary

| Entity | Count |
|--------|-------|
| Companies (Locations) | 7 |
| Partners (Total) | 56 |
| Customers | 30 |
| Employees (Doctors) | 19 |
| Appointments | 120 |
| Services | ~20+ |
| Sale Orders | 0 (empty) |
| Customer Receipts | 0 (empty) |
