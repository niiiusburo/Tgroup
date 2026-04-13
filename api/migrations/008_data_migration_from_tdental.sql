-- ============================================================================
-- Migration: Full data migration from old tdental DB to tdental_demo DB
-- Uses dblink to connect old DB (tdental@172.17.0.1:54323) from demo DB
-- ============================================================================

-- 1. Enable dblink extension
CREATE EXTENSION IF NOT EXISTS dblink;

-- 2. Expand dotkhams schema to match old DB (26 columns total)
ALTER TABLE dbo.dotkhams
  ADD COLUMN IF NOT EXISTS sequence integer,
  ADD COLUMN IF NOT EXISTS saleorderid uuid,
  ADD COLUMN IF NOT EXISTS date timestamp without time zone,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS companyid uuid,
  ADD COLUMN IF NOT EXISTS doctorid uuid,
  ADD COLUMN IF NOT EXISTS appointmentid uuid,
  ADD COLUMN IF NOT EXISTS assistantid uuid,
  ADD COLUMN IF NOT EXISTS accountinvoiceid uuid,
  ADD COLUMN IF NOT EXISTS createdbyid text,
  ADD COLUMN IF NOT EXISTS writebyid text,
  ADD COLUMN IF NOT EXISTS datecreated timestamp without time zone,
  ADD COLUMN IF NOT EXISTS lastupdated timestamp without time zone,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS userid text,
  ADD COLUMN IF NOT EXISTS activitystatus text,
  ADD COLUMN IF NOT EXISTS assistantsecondaryid uuid,
  ADD COLUMN IF NOT EXISTS invoicestate text,
  ADD COLUMN IF NOT EXISTS paymentstate text,
  ADD COLUMN IF NOT EXISTS totalamount numeric,
  ADD COLUMN IF NOT EXISTS amountresidual numeric;

-- 3. Expand saleorderlines schema to match old DB (65 columns total)
ALTER TABLE dbo.saleorderlines
  ADD COLUMN IF NOT EXISTS priceunit numeric,
  ADD COLUMN IF NOT EXISTS productuomqty numeric,
  ADD COLUMN IF NOT EXISTS productstandardprice double precision,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS orderpartnerid uuid,
  ADD COLUMN IF NOT EXISTS productuomid uuid,
  ADD COLUMN IF NOT EXISTS discount numeric,
  ADD COLUMN IF NOT EXISTS companyid uuid,
  ADD COLUMN IF NOT EXISTS pricesubtotal numeric,
  ADD COLUMN IF NOT EXISTS pricetax numeric,
  ADD COLUMN IF NOT EXISTS salesmanid text,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS invoicestatus text,
  ADD COLUMN IF NOT EXISTS qtytoinvoice numeric,
  ADD COLUMN IF NOT EXISTS qtyinvoiced numeric,
  ADD COLUMN IF NOT EXISTS amounttoinvoice numeric,
  ADD COLUMN IF NOT EXISTS amountinvoiced numeric,
  ADD COLUMN IF NOT EXISTS toothcategoryid uuid,
  ADD COLUMN IF NOT EXISTS toothtype text,
  ADD COLUMN IF NOT EXISTS diagnostic text,
  ADD COLUMN IF NOT EXISTS sequence integer,
  ADD COLUMN IF NOT EXISTS promotionprogramid uuid,
  ADD COLUMN IF NOT EXISTS promotionid uuid,
  ADD COLUMN IF NOT EXISTS couponid uuid,
  ADD COLUMN IF NOT EXISTS isrewardline boolean,
  ADD COLUMN IF NOT EXISTS discounttype text,
  ADD COLUMN IF NOT EXISTS discountfixed numeric,
  ADD COLUMN IF NOT EXISTS pricereduce numeric,
  ADD COLUMN IF NOT EXISTS amountpaid numeric,
  ADD COLUMN IF NOT EXISTS amountresidual numeric,
  ADD COLUMN IF NOT EXISTS amountdiscounttotal double precision,
  ADD COLUMN IF NOT EXISTS amountinsurancepaidtotal numeric,
  ADD COLUMN IF NOT EXISTS insuranceid uuid,
  ADD COLUMN IF NOT EXISTS iscancelled boolean,
  ADD COLUMN IF NOT EXISTS employeeid uuid,
  ADD COLUMN IF NOT EXISTS assistantid uuid,
  ADD COLUMN IF NOT EXISTS counselorid uuid,
  ADD COLUMN IF NOT EXISTS advisoryid uuid,
  ADD COLUMN IF NOT EXISTS isactive boolean,
  ADD COLUMN IF NOT EXISTS date timestamp without time zone,
  ADD COLUMN IF NOT EXISTS datedone timestamp without time zone,
  ADD COLUMN IF NOT EXISTS agentid uuid,
  ADD COLUMN IF NOT EXISTS createdbyid text,
  ADD COLUMN IF NOT EXISTS writebyid text,
  ADD COLUMN IF NOT EXISTS lastupdated timestamp without time zone,
  ADD COLUMN IF NOT EXISTS giftcardid uuid,
  ADD COLUMN IF NOT EXISTS amountdiscount double precision,
  ADD COLUMN IF NOT EXISTS quotationlineid uuid,
  ADD COLUMN IF NOT EXISTS isdownpayment boolean,
  ADD COLUMN IF NOT EXISTS toothrange text,
  ADD COLUMN IF NOT EXISTS toothtypefilter integer,
  ADD COLUMN IF NOT EXISTS isglobaldiscount boolean,
  ADD COLUMN IF NOT EXISTS treatmentplan text,
  ADD COLUMN IF NOT EXISTS lastserviceuserdate timestamp without time zone,
  ADD COLUMN IF NOT EXISTS qtydelivered double precision,
  ADD COLUMN IF NOT EXISTS taxid uuid,
  ADD COLUMN IF NOT EXISTS discountfixedamount numeric,
  ADD COLUMN IF NOT EXISTS amounteinvoiced numeric;

-- ============================================================================
-- 4. TRUNCATE data tables in dependency order (children before parents)
-- ============================================================================

-- New system tables with FK dependencies
TRUNCATE TABLE dbo.employee_location_scope RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.employee_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.group_permissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.permission_overrides RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.monthlyplan_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.planinstallments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.monthlyplans RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.payment_allocations RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.payments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.websitepages RESTART IDENTITY CASCADE;

-- Operational data
TRUNCATE TABLE dbo.appointments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.saleorderlines RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.dotkhams RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.saleorders RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.employees RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.customerreceipts RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.accountpayments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.crmteams RESTART IDENTITY CASCADE;

-- Master data
TRUNCATE TABLE dbo.partners RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.products RESTART IDENTITY CASCADE;
-- productcategories and companies will be handled below

-- ============================================================================
-- 5. Data migration via dblink
-- Connection: tdental DB at 172.17.0.1:54323
-- ============================================================================

-- Companies: direct copy (7 rows)
INSERT INTO dbo.companies
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.companies') AS t(
    id uuid, name text, partnerid uuid, email text, phone text,
    periodlockdate timestamp without time zone, accountincomeid uuid,
    accountexpenseid uuid, logo text, active boolean, reportheader text,
    reportfooter text, notallowexportinventorynegative boolean,
    medicalfacilitycode text, createdbyid text, writebyid text,
    datecreated timestamp without time zone, lastupdated timestamp without time zone,
    isuppercasepartnername boolean, ishead boolean, paymentsmsvalidation boolean,
    paymentsmsvalidationtemplateid uuid, currencyid uuid,
    isconnectconfigmedicalprescription boolean, taxbankaccount text,
    taxbankname text, taxcode text, taxphone text, taxunitaddress text,
    taxunitname text, einvoiceaccountid uuid, einvoicetemplateid uuid,
    defaulthouseholdid uuid, revenueinvisibledate timestamp without time zone,
    parentid uuid, parentpath text
);

-- Product categories: keep demo's existing 11 (do not replace)
-- Old DB has 0 productcategories, so nothing to migrate here.

-- Products: migrate ONLY services from old DB (229 rows), set categid=NULL
-- We intentionally drop inventory/products (type='product') since demo app
-- is service-catalog oriented. Old categories don't exist in demo.
INSERT INTO dbo.products (
  id, name, defaultcode, type, type2, listprice, saleprice,
  categid, uomname, active, canorderlab, companyid, isdeleted,
  datecreated, lastupdated
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  $$SELECT id, name, defaultcode, type, type2, listprice, saleprice,
     NULL::uuid, uomname, active, false, companyid, false, datecreated, lastupdated
   FROM dbo.products WHERE type = 'service'$$)
AS t(
  id uuid, name text, defaultcode text, type text, type2 text,
  listprice numeric, saleprice numeric, categid uuid, uomname text,
  active boolean, canorderlab boolean, companyid uuid, isdeleted boolean,
  datecreated timestamp without time zone, lastupdated timestamp without time zone
);

-- Partners: full direct copy (34,560 rows).
-- password_hash and last_login remain NULL until auth setup step below.
INSERT INTO dbo.partners (
  id, displayname, name, namenosign, street, phone, email,
  supplier, customer, isagent, isinsurance, companyid, ref,
  comment, active, employee, gender, jobtitle, birthyear,
  birthmonth, birthday, medicalhistory, citycode, cityname,
  districtcode, districtname, wardcode, wardname, barcode,
  fax, sourceid, referraluserid, note, avatar, zaloid, date,
  titleid, agentid, weight, healthinsurancecardnumber,
  calendarlastnotifack, createdbyid, writebyid, datecreated,
  lastupdated, iscompany, ishead, hotline, website, countryid,
  stateid, type, userid, stageid, sequencenumber, sequenceprefix,
  birthdaycustomerstate, customerthankstate, emergencyphone,
  lasttreatmentcompletedate, treatmentstatus, taxcode, unitaddress,
  unitname, customername, invoicereceivingmethod, isbusinessinvoice,
  personaladdress, personalname, receiveremail, receiverzalonumber,
  personalidentitycard, personaltaxcode, citycodev2, citynamev2,
  identitynumber, usedaddressv2, wardcodev2, wardnamev2, age,
  contactstatusid, customerstatus, marketingstaffid, potentiallevel,
  marketingteamid, saleteamid, isdeleted,
  password_hash, last_login
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT *, NULL::text, NULL::timestamp without time zone FROM dbo.partners')
AS t(
  id uuid, displayname text, name text, namenosign text, street text, phone text, email text,
  supplier boolean, customer boolean, isagent boolean, isinsurance boolean, companyid uuid, ref text,
  comment text, active boolean, employee boolean, gender text, jobtitle text, birthyear integer,
  birthmonth integer, birthday integer, medicalhistory text, citycode text, cityname text,
  districtcode text, districtname text, wardcode text, wardname text, barcode text,
  fax text, sourceid uuid, referraluserid text, note text, avatar text, zaloid text, date timestamp without time zone,
  titleid uuid, agentid uuid, weight numeric, healthinsurancecardnumber text,
  calendarlastnotifack timestamp without time zone, createdbyid text, writebyid text, datecreated timestamp without time zone,
  lastupdated timestamp without time zone, iscompany boolean, ishead boolean, hotline text, website text, countryid uuid,
  stateid uuid, type text, userid text, stageid uuid, sequencenumber integer, sequenceprefix text,
  birthdaycustomerstate integer, customerthankstate integer, emergencyphone text,
  lasttreatmentcompletedate timestamp without time zone, treatmentstatus text, taxcode text, unitaddress text,
  unitname text, customername text, invoicereceivingmethod text, isbusinessinvoice boolean,
  personaladdress text, personalname text, receiveremail text, receiverzalonumber text,
  personalidentitycard text, personaltaxcode text, citycodev2 text, citynamev2 text,
  identitynumber text, usedaddressv2 boolean, wardcodev2 text, wardnamev2 text, age integer,
  contactstatusid uuid, customerstatus text, marketingstaffid text, potentiallevel text,
  marketingteamid uuid, saleteamid uuid, isdeleted boolean,
  password_hash text, last_login timestamp without time zone
);

-- Employees: partial copy (377 rows).
-- Old employees lacks namenosign, so we pull it from linked partners via ref.
INSERT INTO dbo.employees (
  id, name, namenosign, ref, phone, email, avatar,
  isdoctor, isassistant, isreceptionist, active, companyid, hrjobid,
  wage, allowance, startworkdate, address, identitycard, birthday,
  hourlywage, leavepermonth, regularhour, overtimerate, restdayrate,
  enrollnumber, medicalprescriptioncode, datecreated, lastupdated
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  $$SELECT 
   e.id, e.name, COALESCE(p.namenosign, e.name) AS namenosign, e.ref, e.phone, e.email, e.avatar,
   e.isdoctor, e.isassistant, e.isreceptionist, e.active, e.companyid, e.hrjobid,
   e.wage, e.allowance, e.startworkdate, e.address, e.identitycard, e.birthday,
   e.hourlywage, e.leavepermonth, e.regularhour, e.overtimerate, e.restdayrate,
   e.enrollnumber, e.medicalprescriptioncode, e.datecreated, e.lastupdated
   FROM dbo.employees e
   LEFT JOIN dbo.partners p ON p.ref = e.ref AND p.employee = true$$)
AS t(
  id uuid, name text, namenosign text, ref text, phone text, email text, avatar text,
  isdoctor boolean, isassistant boolean, isreceptionist boolean, active boolean, companyid uuid, hrjobid uuid,
  wage numeric, allowance numeric, startworkdate timestamp without time zone, address text, identitycard text, birthday timestamp without time zone,
  hourlywage numeric, leavepermonth numeric, regularhour numeric, overtimerate numeric, restdayrate numeric,
  enrollnumber text, medicalprescriptioncode text, datecreated timestamp without time zone, lastupdated timestamp without time zone
);

-- Appointments: direct 1:1 copy (233,399 rows)
INSERT INTO dbo.appointments
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.appointments')
AS t(
  id uuid, name text, date timestamp without time zone, time text,
  datetimeappointment timestamp without time zone, dateappointmentreminder timestamp without time zone,
  timeexpected integer, note text, userid text, partnerid uuid, companyid uuid,
  dotkhamid uuid, doctorid uuid, state text, reason text, saleorderid uuid,
  isrepeatcustomer boolean, color text, createdbyid text, writebyid text,
  datecreated timestamp without time zone, lastupdated timestamp without time zone,
  leadid uuid, callid uuid, teamid uuid, lastdatereminder timestamp without time zone,
  confirmedid uuid, datetimearrived timestamp without time zone,
  datetimedismissed timestamp without time zone, datetimeseated timestamp without time zone,
  aptstate text, customerreceiptid uuid, customercarestatus integer,
  datedone timestamp without time zone, isnotreatment boolean, crmtaskid uuid
);

-- Saleorders: map old columns to demo columns (59,754 rows)
INSERT INTO dbo.saleorders (
  id, name, partnerid, companyid, doctorid,
  amounttotal, residual, totalpaid, state, isdeleted, datecreated,
  assistantid, quantity, unit
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  $$SELECT id, name, partnerid, companyid, doctorid,
     amounttotal, residual, totalpaid,
     CASE state
       WHEN 'done' THEN 'completed'
       WHEN 'sale' THEN 'pending'
       WHEN 'draft' THEN 'pending'
       ELSE COALESCE(state, 'pending')
     END,
     isdeleted, datecreated,
     NULL::uuid, NULL::numeric, NULL::text
   FROM dbo.saleorders$$)
AS t(
  id uuid, name text, partnerid uuid, companyid uuid, doctorid uuid,
  amounttotal numeric, residual numeric, totalpaid numeric, state text,
  isdeleted boolean, datecreated timestamp without time zone,
  assistantid uuid, quantity numeric, unit text
);

-- Saleorderlines: full copy now that schema is expanded (24,137 rows)
INSERT INTO dbo.saleorderlines (
  id, priceunit, productuomqty, productstandardprice, name, state,
  orderpartnerid, orderid, productuomid, discount, productid, companyid,
  pricesubtotal, pricetax, pricetotal, salesmanid, note, invoicestatus,
  qtytoinvoice, qtyinvoiced, amounttoinvoice, amountinvoiced, toothcategoryid,
  toothtype, diagnostic, sequence, promotionprogramid, promotionid, couponid,
  isrewardline, discounttype, discountfixed, pricereduce, amountpaid,
  amountresidual, amountdiscounttotal, amountinsurancepaidtotal, insuranceid,
  iscancelled, employeeid, assistantid, counselorid, advisoryid, isactive,
  date, datedone, agentid, createdbyid, writebyid, datecreated, lastupdated,
  giftcardid, amountdiscount, quotationlineid, isdownpayment, toothrange,
  toothtypefilter, isglobaldiscount, treatmentplan, lastserviceuserdate,
  qtydelivered, taxid, discountfixedamount, amounteinvoiced, isdeleted,
  productname
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT id, priceunit, productuomqty, productstandardprice, name, state,
   orderpartnerid, orderid, productuomid, discount, productid, companyid,
   pricesubtotal, pricetax, pricetotal, salesmanid, note, invoicestatus,
   qtytoinvoice, qtyinvoiced, amounttoinvoice, amountinvoiced, toothcategoryid,
   toothtype, diagnostic, sequence, promotionprogramid, promotionid, couponid,
   isrewardline, discounttype, discountfixed, pricereduce, amountpaid,
   amountresidual, amountdiscounttotal, amountinsurancepaidtotal, insuranceid,
   iscancelled, employeeid, assistantid, counselorid, advisoryid, isactive,
   date, datedone, agentid, createdbyid, writebyid, datecreated, lastupdated,
   giftcardid, amountdiscount, quotationlineid, isdownpayment, toothrange,
   toothtypefilter, isglobaldiscount, treatmentplan, lastserviceuserdate,
   qtydelivered, taxid, discountfixedamount, amounteinvoiced, isdeleted,
   name AS productname
   FROM dbo.saleorderlines')
AS t(
  id uuid, priceunit numeric, productuomqty numeric, productstandardprice double precision, name text, state text,
  orderpartnerid uuid, orderid uuid, productuomid uuid, discount numeric, productid uuid, companyid uuid,
  pricesubtotal numeric, pricetax numeric, pricetotal numeric, salesmanid text, note text, invoicestatus text,
  qtytoinvoice numeric, qtyinvoiced numeric, amounttoinvoice numeric, amountinvoiced numeric, toothcategoryid uuid,
  toothtype text, diagnostic text, sequence integer, promotionprogramid uuid, promotionid uuid, couponid uuid,
  isrewardline boolean, discounttype text, discountfixed numeric, pricereduce numeric, amountpaid numeric,
  amountresidual numeric, amountdiscounttotal double precision, amountinsurancepaidtotal numeric, insuranceid uuid,
  iscancelled boolean, employeeid uuid, assistantid uuid, counselorid uuid, advisoryid uuid, isactive boolean,
  date timestamp without time zone, datedone timestamp without time zone, agentid uuid, createdbyid text, writebyid text, datecreated timestamp without time zone, lastupdated timestamp without time zone,
  giftcardid uuid, amountdiscount double precision, quotationlineid uuid, isdownpayment boolean, toothrange text,
  toothtypefilter integer, isglobaldiscount boolean, treatmentplan text, lastserviceuserdate timestamp without time zone,
  qtydelivered double precision, taxid uuid, discountfixedamount numeric, amounteinvoiced numeric, isdeleted boolean,
  productname text
);

-- Dotkhams: full copy now that schema is expanded (84,309 rows)
INSERT INTO dbo.dotkhams (
  id, sequence, name, saleorderid, partnerid, date, reason, state,
  companyid, doctorid, appointmentid, assistantid, accountinvoiceid,
  createdbyid, writebyid, datecreated, lastupdated, note, userid,
  activitystatus, assistantsecondaryid, invoicestate, paymentstate,
  totalamount, amountresidual, isdeleted
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.dotkhams')
AS t(
  id uuid, sequence integer, name text, saleorderid uuid, partnerid uuid,
  date timestamp without time zone, reason text, state text,
  companyid uuid, doctorid uuid, appointmentid uuid, assistantid uuid,
  accountinvoiceid uuid, createdbyid text, writebyid text,
  datecreated timestamp without time zone, lastupdated timestamp without time zone,
  note text, userid text, activitystatus text, assistantsecondaryid uuid,
  invoicestate text, paymentstate text, totalamount numeric,
  amountresidual numeric, isdeleted boolean
);

-- ============================================================================
-- 6. Auth setup: generate emails + set passwords for ALL employee partners
-- ============================================================================

-- Step A: Generate synthetic emails for employee partners who don't have one
-- Use namenosign (name without accents), remove non-alphanumeric, lowercase.
-- Handle duplicates by appending a suffix.
WITH ranked AS (
  SELECT 
    id,
    email,
    namenosign,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(TRIM(email),''), LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(namenosign),''), id::text), '[^a-zA-Z0-9]', '', 'g')) || '@tdental.local')
      ORDER BY id
    ) AS rn
  FROM dbo.partners
  WHERE employee = true
)
UPDATE dbo.partners
SET email = CASE
  WHEN ranked.rn = 1 THEN
    COALESCE(NULLIF(TRIM(ranked.email),''), LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(ranked.namenosign),''), ranked.id::text), '[^a-zA-Z0-9]', '', 'g')) || '@tdental.local')
  ELSE
    LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(ranked.namenosign),''), ranked.id::text), '[^a-zA-Z0-9]', '', 'g')) || ranked.rn::text || '@tdental.local'
END
FROM ranked
WHERE dbo.partners.id = ranked.id
  AND (dbo.partners.email IS NULL OR TRIM(dbo.partners.email) = '');

-- Step B: Set password_hash to bcrypt('123456') for ALL employee partners
UPDATE dbo.partners
SET password_hash = '$2b$10$SqoPEI/FaDN3bXdFkImpdefUOYTEY.r90htnxgvt/M11LwlI8ztEO'
WHERE employee = true;

-- ============================================================================
-- 7. Seed new system tables with defaults
-- ============================================================================

-- Permission groups: create a default Admin group with full permissions
INSERT INTO dbo.permission_groups (id, name, color, description, is_system)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Admin',
  '#EF4444',
  'Full system access',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Grant all demo-known permissions to Admin group
INSERT INTO dbo.group_permissions (group_id, permission)
SELECT '11111111-0000-0000-0000-000000000001', p.id
FROM (
  VALUES
    ('overview.view'),
    ('calendar.view'), ('calendar.edit'),
    ('customers.view'), ('customers.edit'),
    ('appointments.view'), ('appointments.edit'),
    ('services.view'), ('services.edit'),
    ('payment.view'), ('payment.edit'),
    ('external_checkups.view')
) AS p(id)
ON CONFLICT (group_id, permission) DO NOTHING;

-- Assign all migrated employees to Admin group
INSERT INTO dbo.employee_permissions (employee_id, group_id)
SELECT e.id, '11111111-0000-0000-0000-000000000001'
FROM dbo.employees e
ON CONFLICT (employee_id, group_id) DO NOTHING;

-- Ensure company_bank_settings exists for each company
INSERT INTO dbo.company_bank_settings (company_id)
SELECT c.id FROM dbo.companies c
LEFT JOIN dbo.company_bank_settings s ON s.company_id = c.id
WHERE s.company_id IS NULL;

-- ============================================================================
-- 8. Payment history note
-- ============================================================================
-- The old tdental database has ZERO rows in actual payment tables
-- (accountpayments=0, saleorderpayments=0, servicecardorderpayments=0,
--  paymentquotations=0, paymentrequests=0, phieuthuchis=0).
-- The 178,096 rows in customerreceipts have NO amount column and are
-- customer-service queue records, not financial receipts.
-- Therefore no historical payment data exists to migrate.
-- The demo payments table starts fresh.
-- ============================================================================
