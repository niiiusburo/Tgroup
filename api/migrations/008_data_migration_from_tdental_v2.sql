-- ============================================================================
-- Migration v2: Full data migration from old tdental DB to fresh tdental_demo DB
-- Uses dblink to connect old DB (tdental@172.17.0.1:54323) from demo DB
-- ============================================================================

-- 1. Enable dblink extension
CREATE EXTENSION IF NOT EXISTS dblink;

-- ============================================================================
-- 2. Fix demo schema: drop scaffold views and create real tables to match old DB
-- ============================================================================

-- saleorders was a view, needs to be a real table
DROP VIEW IF EXISTS dbo.saleorders;
CREATE TABLE dbo.saleorders (
  id uuid PRIMARY KEY,
  dateorder timestamp without time zone,
  datedone timestamp without time zone,
  partnerid uuid,
  amounttax numeric,
  amountuntaxed numeric,
  amounttotal numeric,
  note text,
  state text,
  name text,
  companyid uuid,
  userid text,
  invoicestatus text,
  residual numeric,
  cardid uuid,
  pricelistid uuid,
  type text,
  isquotation boolean,
  quoteid uuid,
  orderid uuid,
  doctorid uuid,
  codepromoprogramid uuid,
  isfast boolean,
  journalid uuid,
  quotationid uuid,
  totalpaid numeric,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  discountfixed numeric,
  discountpercent numeric,
  discounttype text,
  sequencenumber integer,
  sequenceprefix text,
  appointmentid uuid,
  leadid uuid,
  isoldflow boolean,
  paymentstate text,
  isdeleted boolean DEFAULT false
);

-- saleorderlines was a view, needs to be a real table
DROP VIEW IF EXISTS dbo.saleorderlines;
CREATE TABLE dbo.saleorderlines (
  id uuid PRIMARY KEY,
  priceunit numeric,
  productuomqty numeric,
  productstandardprice double precision,
  name text,
  state text,
  orderpartnerid uuid,
  orderid uuid,
  productuomid uuid,
  discount numeric,
  productid uuid,
  companyid uuid,
  pricesubtotal numeric,
  pricetax numeric,
  pricetotal numeric,
  salesmanid text,
  note text,
  invoicestatus text,
  qtytoinvoice numeric,
  qtyinvoiced numeric,
  amounttoinvoice numeric,
  amountinvoiced numeric,
  toothcategoryid uuid,
  toothtype text,
  diagnostic text,
  sequence integer,
  promotionprogramid uuid,
  promotionid uuid,
  couponid uuid,
  isrewardline boolean,
  discounttype text,
  discountfixed numeric,
  pricereduce numeric,
  amountpaid numeric,
  amountresidual numeric,
  amountdiscounttotal double precision,
  amountinsurancepaidtotal numeric,
  insuranceid uuid,
  iscancelled boolean,
  employeeid uuid,
  assistantid uuid,
  counselorid uuid,
  advisoryid uuid,
  isactive boolean,
  date timestamp without time zone,
  datedone timestamp without time zone,
  agentid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  giftcardid uuid,
  amountdiscount double precision,
  quotationlineid uuid,
  isdownpayment boolean,
  toothrange text,
  toothtypefilter integer,
  isglobaldiscount boolean,
  treatmentplan text,
  lastserviceuserdate timestamp without time zone,
  qtydelivered double precision,
  taxid uuid,
  discountfixedamount numeric,
  amounteinvoiced numeric,
  isdeleted boolean DEFAULT false,
  productname text
);

-- dotkhams was a view, needs to be a real table
DROP VIEW IF EXISTS dbo.dotkhams;
CREATE TABLE dbo.dotkhams (
  id uuid PRIMARY KEY,
  sequence integer,
  name text,
  saleorderid uuid,
  partnerid uuid,
  date timestamp without time zone,
  reason text,
  state text,
  companyid uuid,
  doctorid uuid,
  appointmentid uuid,
  assistantid uuid,
  accountinvoiceid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  note text,
  userid text,
  activitystatus text,
  assistantsecondaryid uuid,
  invoicestate text,
  paymentstate text,
  totalamount numeric,
  amountresidual numeric,
  isdeleted boolean DEFAULT false
);

-- employees was a view, needs to be a real table
-- We include both old DB columns and demo-expected columns
DROP VIEW IF EXISTS dbo.employees;
CREATE TABLE dbo.employees (
  id uuid PRIMARY KEY REFERENCES dbo.partners(id),
  name text,
  namenosign text,
  active boolean,
  ref text,
  address text,
  phone text,
  identitycard text,
  email text,
  birthday timestamp without time zone,
  categoryid uuid,
  companyid uuid,
  partnerid uuid,
  isdoctor boolean,
  isassistant boolean,
  commissionid uuid,
  assistantcommissionid uuid,
  counselorcommissionid uuid,
  userid text,
  structuretypeid uuid,
  wage numeric,
  hourlywage numeric,
  startworkdate timestamp without time zone,
  enrollnumber text,
  leavepermonth numeric,
  regularhour numeric,
  overtimerate numeric,
  restdayrate numeric,
  allowance numeric,
  avatar text,
  isallowsurvey boolean,
  groupid uuid,
  hrjobid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  medicalprescriptioncode text,
  tokenmedicalprescription text,
  isreceptionist boolean
);

-- customerreceipts was a view, make it a real table for data migration
DROP VIEW IF EXISTS dbo.customerreceipts;
CREATE TABLE dbo.customerreceipts (
  id uuid PRIMARY KEY,
  datewaiting timestamp without time zone,
  dateexamination timestamp without time zone,
  datedone timestamp without time zone,
  timeexpected integer,
  note text,
  userid text,
  partnerid uuid,
  companyid uuid,
  doctorid uuid,
  state text,
  reason text,
  isrepeatcustomer boolean,
  isnotreatment boolean,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone
);

-- accountpayments was a view, make it a real table (will remain empty)
DROP VIEW IF EXISTS dbo.accountpayments;
CREATE TABLE dbo.accountpayments (
  id uuid PRIMARY KEY,
  companyid uuid,
  partnerid uuid,
  partnertype text,
  paymentdate timestamp without time zone,
  journalid uuid,
  insuranceid uuid,
  state text,
  name text,
  paymenttype text,
  amount numeric,
  communication text,
  paymentdifferencehandling text,
  writeoffaccountid uuid,
  destinationaccountid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  destinationjournalid uuid,
  isinternaltransfer boolean,
  pairedinternaltransferpaymentid uuid,
  destinationcompanyid uuid,
  isintercompany boolean,
  pairedintercompanypaymentid uuid,
  paymentrequestid uuid,
  partnerbankid uuid,
  partnerjournaltype text,
  requester text,
  currencyid uuid,
  householdbusinessid uuid,
  isprepayment boolean,
  moveid uuid,
  sequencenumber integer,
  sequenceprefix text
);

-- crmteams was a view, make it a real table
DROP VIEW IF EXISTS dbo.crmteams;
CREATE TABLE dbo.crmteams (
  id uuid PRIMARY KEY,
  name text,
  sequence integer,
  active boolean,
  companyid uuid,
  userid text,
  color text,
  datecreated timestamp without time zone,
  createdbyid text,
  lastupdated timestamp without time zone,
  writebyid text,
  isho boolean,
  useleads boolean,
  useopportunities boolean,
  leadpropertiesdefinition text
);

-- agents was a view, make it a real table
DROP VIEW IF EXISTS dbo.agents;
CREATE TABLE dbo.agents (
  id uuid PRIMARY KEY,
  name text,
  classify text,
  customerid uuid,
  employeeid uuid,
  gender text,
  birthyear integer,
  birthmonth integer,
  birthday integer,
  jobtitle text,
  phone text,
  email text,
  address text,
  bankid uuid,
  bankbranch text,
  accountnumber text,
  accountholder text,
  companyid uuid,
  partnerid uuid,
  commissionid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone
);

-- aspnetusers was a view, make it a real table
DROP VIEW IF EXISTS dbo.aspnetusers;
CREATE TABLE dbo.aspnetusers (
  id text PRIMARY KEY,
  name text,
  partnerid uuid,
  companyid uuid,
  active boolean,
  isuserroot boolean,
  facebookpageid uuid,
  username text,
  normalizedusername text,
  email text,
  normalizedemail text,
  emailconfirmed boolean,
  passwordhash text,
  securitystamp text,
  concurrencystamp text,
  phonenumber text,
  phonenumberconfirmed boolean,
  twofactorenabled boolean,
  lockoutend timestamp with time zone,
  lockoutenabled boolean,
  accessfailedcount integer,
  tenantid text,
  companyisunrestricted boolean,
  totpsecret text
);

-- hrjobs was a view, make it a real table
DROP VIEW IF EXISTS dbo.hrjobs;
CREATE TABLE dbo.hrjobs (
  id uuid PRIMARY KEY,
  name text,
  companyid uuid,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone
);

-- partnersources was a view, make it a real table
DROP VIEW IF EXISTS dbo.partnersources;
CREATE TABLE dbo.partnersources (
  id uuid PRIMARY KEY,
  name text,
  type text,
  createdbyid text,
  writebyid text,
  datecreated timestamp without time zone,
  lastupdated timestamp without time zone,
  iscollaborators boolean,
  isactive boolean
);

-- ============================================================================
-- 3. Fix base tables column constraints
-- ============================================================================

-- appointments.timeexpected is NOT NULL in demo but old DB has NULLs.
-- Allow NULL to preserve historical data.
ALTER TABLE dbo.appointments ALTER COLUMN timeexpected DROP NOT NULL;

-- ============================================================================
-- 4. TRUNCATE all target tables in dependency order
-- ============================================================================

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

TRUNCATE TABLE dbo.appointments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.saleorderlines RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.dotkhams RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.saleorders RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.employees RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.customerreceipts RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.accountpayments RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.crmteams RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.agents RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.aspnetusers RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.hrjobs RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.partnersources RESTART IDENTITY CASCADE;

TRUNCATE TABLE dbo.partners RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.products RESTART IDENTITY CASCADE;
TRUNCATE TABLE dbo.companies RESTART IDENTITY CASCADE;

-- ============================================================================
-- 5. Data migration via dblink
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

-- Product categories: keep demo's existing 11 seeded rows
-- Old DB has 0 productcategories.

-- Products: migrate ONLY services from old DB (229 rows), categid=NULL
INSERT INTO dbo.products (
  id, name, namenosign, defaultcode, type, type2, listprice, saleprice,
  purchaseprice, laboprice, categid, uomid, uomname, companyid, active,
  canorderlab, datecreated, lastupdated
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  $$SELECT id, name, namenosign, defaultcode, type, type2, listprice, saleprice,
     NULL::numeric, NULL::numeric, NULL::uuid, uomid, uomname, companyid, active,
     false, datecreated, lastupdated
   FROM dbo.products WHERE type = 'service'$$)
AS t(
  id uuid, name text, namenosign text, defaultcode text, type text, type2 text,
  listprice numeric, saleprice numeric, purchaseprice numeric, laboprice numeric,
  categid uuid, uomid uuid, uomname text, companyid uuid, active boolean,
  canorderlab boolean, datecreated timestamp without time zone, lastupdated timestamp without time zone
);

-- Partners: full direct copy (34,560 rows)
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

-- Employees: partial copy from old employees table (377 rows)
-- Pull namenosign from linked partner via ref.
INSERT INTO dbo.employees (
  id, name, active, ref, address, phone, identitycard, email, birthday,
  categoryid, companyid, partnerid, isdoctor, isassistant, commissionid,
  assistantcommissionid, counselorcommissionid, userid, structuretypeid,
  wage, hourlywage, startworkdate, enrollnumber, leavepermonth, regularhour,
  overtimerate, restdayrate, allowance, avatar, isallowsurvey, groupid,
  hrjobid, createdbyid, writebyid, datecreated, lastupdated,
  medicalprescriptioncode, tokenmedicalprescription, isreceptionist,
  namenosign
)
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  $$SELECT 
   e.id, e.name, e.active, e.ref, e.address, e.phone, e.identitycard, e.email, e.birthday,
   e.categoryid, e.companyid, e.partnerid, e.isdoctor, e.isassistant, e.commissionid,
   e.assistantcommissionid, e.counselorcommissionid, e.userid, e.structuretypeid,
   e.wage, e.hourlywage, e.startworkdate, e.enrollnumber, e.leavepermonth, e.regularhour,
   e.overtimerate, e.restdayrate, e.allowance, e.avatar, e.isallowsurvey, e.groupid,
   e.hrjobid, e.createdbyid, e.writebyid, e.datecreated, e.lastupdated,
   e.medicalprescriptioncode, e.tokenmedicalprescription, e.isreceptionist,
   p.namenosign
   FROM dbo.employees e
   LEFT JOIN dbo.partners p ON p.ref = e.ref AND p.employee = true$$)
AS t(
  id uuid, name text, active boolean, ref text, address text, phone text, identitycard text, email text,
  birthday timestamp without time zone, categoryid uuid, companyid uuid, partnerid uuid,
  isdoctor boolean, isassistant boolean, commissionid uuid, assistantcommissionid uuid,
  counselorcommissionid uuid, userid text, structuretypeid uuid, wage numeric, hourlywage numeric,
  startworkdate timestamp without time zone, enrollnumber text, leavepermonth numeric,
  regularhour numeric, overtimerate numeric, restdayrate numeric, allowance numeric,
  avatar text, isallowsurvey boolean, groupid uuid, hrjobid uuid, createdbyid text,
  writebyid text, datecreated timestamp without time zone, lastupdated timestamp without time zone,
  medicalprescriptioncode text, tokenmedicalprescription text, isreceptionist boolean,
  namenosign text
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
INSERT INTO dbo.saleorders
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.saleorders')
AS t(
  id uuid, dateorder timestamp without time zone, datedone timestamp without time zone,
  partnerid uuid, amounttax numeric, amountuntaxed numeric, amounttotal numeric,
  note text, state text, name text, companyid uuid, userid text,
  invoicestatus text, residual numeric, cardid uuid, pricelistid uuid,
  type text, isquotation boolean, quoteid uuid, orderid uuid, doctorid uuid,
  codepromoprogramid uuid, isfast boolean, journalid uuid, quotationid uuid,
  totalpaid numeric, createdbyid text, writebyid text, datecreated timestamp without time zone,
  lastupdated timestamp without time zone, discountfixed numeric, discountpercent numeric,
  discounttype text, sequencenumber integer, sequenceprefix text, appointmentid uuid,
  leadid uuid, isoldflow boolean, paymentstate text, isdeleted boolean
);

-- Saleorderlines: full copy (24,137 rows)
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

-- Dotkhams: full copy (84,309 rows)
INSERT INTO dbo.dotkhams
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

-- Customerreceipts: direct copy (178,096 rows)
INSERT INTO dbo.customerreceipts
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.customerreceipts')
AS t(
  id uuid, datewaiting timestamp without time zone, dateexamination timestamp without time zone,
  datedone timestamp without time zone, timeexpected integer, note text, userid text,
  partnerid uuid, companyid uuid, doctorid uuid, state text, reason text,
  isrepeatcustomer boolean, isnotreatment boolean, createdbyid text, writebyid text,
  datecreated timestamp without time zone, lastupdated timestamp without time zone
);

-- CRM teams: direct copy (7 rows)
INSERT INTO dbo.crmteams
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.crmteams')
AS t(
  id uuid, name text, sequence integer, active boolean, companyid uuid,
  userid text, color text, datecreated timestamp without time zone,
  createdbyid text, lastupdated timestamp without time zone, writebyid text,
  isho boolean, useleads boolean, useopportunities boolean,
  leadpropertiesdefinition text
);

-- Agents: direct copy (93 rows)
INSERT INTO dbo.agents
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.agents')
AS t(
  id uuid, name text, classify text, customerid uuid, employeeid uuid,
  gender text, birthyear integer, birthmonth integer, birthday integer,
  jobtitle text, phone text, email text, address text, bankid uuid,
  bankbranch text, accountnumber text, accountholder text, companyid uuid,
  partnerid uuid, commissionid uuid, createdbyid text, writebyid text,
  datecreated timestamp without time zone, lastupdated timestamp without time zone
);

-- AspNetUsers: direct copy (221 rows)
INSERT INTO dbo.aspnetusers
SELECT * FROM dblink('host=172.17.0.1 port=54323 dbname=tdental user=tdental password=TDental2026Dok!',
  'SELECT * FROM dbo.aspnetusers')
AS t(
  id text, name text, partnerid uuid, companyid uuid, active boolean,
  isuserroot boolean, facebookpageid uuid, username text, normalizedusername text,
  email text, normalizedemail text, emailconfirmed boolean, passwordhash text,
  securitystamp text, concurrencystamp text, phonenumber text,
  phonenumberconfirmed boolean, twofactorenabled boolean,
  lockoutend timestamp with time zone, lockoutenabled boolean,
  accessfailedcount integer, tenantid text, companyisunrestricted boolean,
  totpsecret text
);

-- ============================================================================
-- 6. Auth setup: generate emails + set passwords for ALL employee partners
-- ============================================================================

-- Generate synthetic emails for employee partners who don't have one
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

-- Set password_hash to bcrypt('123456') for ALL employee partners
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

-- Grant all known permissions to Admin group
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
ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

-- Ensure company_bank_settings row exists (demo has 1 default row; preserve it)
-- The table has id=1 as a singleton config row. If it was truncated above,
-- re-insert a default row.
INSERT INTO dbo.company_bank_settings (id, bank_bin, bank_number, bank_account_name, updated_at)
VALUES (1, '970418', '8815251137', 'TG Clinic Test', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Payment history note
-- ============================================================================
-- Old tdental has ZERO rows in actual payment tables. The 178,096
-- customerreceipts rows are queue/visit tracking records, not financial
-- receipts (no amount column). Payments in the new app start fresh.
-- ============================================================================
