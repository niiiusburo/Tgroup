--
-- PostgreSQL database dump
--

\restrict U73ECB3P8EJJLyhpJTIX6qtL6W4mYmSXUHLNMInNzYmrdQ2iOUiHtIq24SP6mGK

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dbo; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA dbo;


--
-- Name: accountpayments; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.accountpayments AS
 SELECT NULL::uuid AS id,
    NULL::uuid AS partnerid,
    NULL::numeric AS amount,
    NULL::text AS paymenttype,
    NULL::text AS state
  WHERE false;


--
-- Name: agents; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.agents AS
 SELECT NULL::uuid AS id,
    NULL::text AS name
  WHERE false;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.appointments (
    id uuid NOT NULL,
    name text NOT NULL,
    date timestamp without time zone NOT NULL,
    "time" text,
    datetimeappointment timestamp without time zone,
    dateappointmentreminder timestamp without time zone,
    timeexpected integer NOT NULL,
    note text,
    userid text,
    partnerid uuid NOT NULL,
    companyid uuid NOT NULL,
    dotkhamid uuid,
    doctorid uuid,
    state text,
    reason text,
    saleorderid uuid,
    isrepeatcustomer boolean NOT NULL,
    color text,
    createdbyid text,
    writebyid text,
    datecreated timestamp without time zone,
    lastupdated timestamp without time zone,
    leadid uuid,
    callid uuid,
    teamid uuid,
    lastdatereminder timestamp without time zone,
    confirmedid uuid,
    datetimearrived timestamp without time zone,
    datetimedismissed timestamp without time zone,
    datetimeseated timestamp without time zone,
    aptstate text,
    customerreceiptid uuid,
    customercarestatus integer,
    datedone timestamp without time zone,
    isnotreatment boolean NOT NULL,
    crmtaskid uuid
);


--
-- Name: aspnetusers; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.aspnetusers AS
 SELECT NULL::text AS id,
    NULL::text AS name
  WHERE false;


--
-- Name: companies; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.companies (
    id uuid NOT NULL,
    name text NOT NULL,
    partnerid uuid NOT NULL,
    email text,
    phone text,
    periodlockdate timestamp without time zone,
    accountincomeid uuid,
    accountexpenseid uuid,
    logo text,
    active boolean NOT NULL,
    reportheader text,
    reportfooter text,
    notallowexportinventorynegative boolean NOT NULL,
    medicalfacilitycode text,
    createdbyid text,
    writebyid text,
    datecreated timestamp without time zone,
    lastupdated timestamp without time zone,
    isuppercasepartnername boolean NOT NULL,
    ishead boolean NOT NULL,
    paymentsmsvalidation boolean NOT NULL,
    paymentsmsvalidationtemplateid uuid,
    currencyid uuid,
    isconnectconfigmedicalprescription boolean NOT NULL,
    taxbankaccount text,
    taxbankname text,
    taxcode text,
    taxphone text,
    taxunitaddress text,
    taxunitname text,
    einvoiceaccountid uuid,
    einvoicetemplateid uuid,
    defaulthouseholdid uuid,
    revenueinvisibledate timestamp without time zone,
    parentid uuid,
    parentpath text
);


--
-- Name: crmteams; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.crmteams AS
 SELECT NULL::uuid AS id,
    NULL::text AS name
  WHERE false;


--
-- Name: customerreceipts; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.customerreceipts AS
 SELECT NULL::uuid AS id,
    NULL::timestamp without time zone AS dateexamination
  WHERE false;


--
-- Name: dotkhams; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.dotkhams AS
 SELECT NULL::uuid AS id,
    NULL::text AS name,
    NULL::uuid AS partnerid,
    NULL::boolean AS isdeleted
  WHERE false;


--
-- Name: employee_location_scope; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.employee_location_scope (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    location_id uuid NOT NULL
);


--
-- Name: employee_permissions; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.employee_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    group_id uuid NOT NULL,
    loc_scope text DEFAULT 'assigned'::text NOT NULL,
    datecreated timestamp without time zone DEFAULT now(),
    lastupdated timestamp without time zone DEFAULT now()
);


--
-- Name: partners; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.partners (
    id uuid NOT NULL,
    displayname text,
    name text NOT NULL,
    namenosign text,
    street text,
    phone text,
    email text,
    supplier boolean NOT NULL,
    customer boolean NOT NULL,
    isagent boolean NOT NULL,
    isinsurance boolean NOT NULL,
    companyid uuid,
    ref text,
    comment text,
    active boolean NOT NULL,
    employee boolean NOT NULL,
    gender text,
    jobtitle text,
    birthyear integer,
    birthmonth integer,
    birthday integer,
    medicalhistory text,
    citycode text,
    cityname text,
    districtcode text,
    districtname text,
    wardcode text,
    wardname text,
    barcode text,
    fax text,
    sourceid uuid,
    referraluserid text,
    note text,
    avatar text,
    zaloid text,
    date timestamp without time zone,
    titleid uuid,
    agentid uuid,
    weight numeric,
    healthinsurancecardnumber text,
    calendarlastnotifack timestamp without time zone,
    createdbyid text,
    writebyid text,
    datecreated timestamp without time zone,
    lastupdated timestamp without time zone,
    iscompany boolean NOT NULL,
    ishead boolean NOT NULL,
    hotline text,
    website text,
    countryid uuid,
    stateid uuid,
    type text,
    userid text,
    stageid uuid,
    sequencenumber integer,
    sequenceprefix text,
    birthdaycustomerstate integer,
    customerthankstate integer,
    emergencyphone text,
    lasttreatmentcompletedate timestamp without time zone,
    treatmentstatus text,
    taxcode text,
    unitaddress text,
    unitname text,
    customername text,
    invoicereceivingmethod text,
    isbusinessinvoice boolean NOT NULL,
    personaladdress text,
    personalname text,
    receiveremail text,
    receiverzalonumber text,
    personalidentitycard text,
    personaltaxcode text,
    citycodev2 text,
    citynamev2 text,
    identitynumber text,
    usedaddressv2 boolean,
    wardcodev2 text,
    wardnamev2 text,
    age integer,
    contactstatusid uuid,
    customerstatus text,
    marketingstaffid text,
    potentiallevel text,
    marketingteamid uuid,
    saleteamid uuid,
    isdeleted boolean NOT NULL,
    password_hash text,
    last_login timestamp without time zone
);


--
-- Name: employees; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.employees AS
 SELECT id,
    name,
    namenosign,
    ref,
    phone,
    email,
    avatar,
    true AS isdoctor,
    false AS isassistant,
    false AS isreceptionist,
    active,
    companyid,
    NULL::uuid AS hrjobid,
    NULL::numeric AS wage,
    NULL::numeric AS allowance,
    NULL::timestamp without time zone AS startworkdate,
    street AS address,
    NULL::text AS identitycard,
        CASE
            WHEN ((birthyear IS NOT NULL) AND (birthmonth IS NOT NULL) AND (birthday IS NOT NULL)) THEN (make_date(birthyear, birthmonth, birthday))::timestamp without time zone
            ELSE NULL::timestamp without time zone
        END AS birthday,
    NULL::numeric AS hourlywage,
    NULL::numeric AS leavepermonth,
    NULL::numeric AS regularhour,
    NULL::numeric AS overtimerate,
    NULL::numeric AS restdayrate,
    NULL::text AS enrollnumber,
    NULL::text AS medicalprescriptioncode,
    datecreated,
    lastupdated
   FROM dbo.partners p
  WHERE (employee = true);


--
-- Name: group_permissions; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.group_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    permission text NOT NULL
);


--
-- Name: hrjobs; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.hrjobs AS
 SELECT NULL::uuid AS id,
    NULL::text AS name
  WHERE false;


--
-- Name: partnersources; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.partnersources AS
 SELECT NULL::uuid AS id,
    NULL::text AS name
  WHERE false;


--
-- Name: permission_groups; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.permission_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#94A3B8'::text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    datecreated timestamp without time zone DEFAULT now(),
    lastupdated timestamp without time zone DEFAULT now()
);


--
-- Name: permission_overrides; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.permission_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    permission text NOT NULL,
    override_type text NOT NULL,
    datecreated timestamp without time zone DEFAULT now(),
    CONSTRAINT permission_overrides_override_type_check CHECK ((override_type = ANY (ARRAY['grant'::text, 'revoke'::text])))
);


--
-- Name: productcategories; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.productcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    completename text,
    parentid uuid,
    active boolean DEFAULT true NOT NULL,
    datecreated timestamp without time zone DEFAULT now(),
    lastupdated timestamp without time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: dbo; Owner: -
--

CREATE TABLE dbo.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    namenosign text,
    defaultcode text,
    type text DEFAULT 'service'::text,
    type2 text DEFAULT 'service'::text,
    listprice numeric DEFAULT 0,
    saleprice numeric DEFAULT 0,
    purchaseprice numeric DEFAULT 0,
    laboprice numeric DEFAULT 0,
    categid uuid,
    uomid uuid,
    uomname text DEFAULT 'Lần'::text,
    companyid uuid,
    active boolean DEFAULT true NOT NULL,
    canorderlab boolean DEFAULT false NOT NULL,
    datecreated timestamp without time zone DEFAULT now(),
    lastupdated timestamp without time zone DEFAULT now()
);


--
-- Name: saleorderlines; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.saleorderlines AS
 SELECT NULL::uuid AS id,
    NULL::uuid AS orderid,
    NULL::numeric AS pricetotal,
    NULL::boolean AS isdeleted
  WHERE false;


--
-- Name: saleorders; Type: VIEW; Schema: dbo; Owner: -
--

CREATE VIEW dbo.saleorders AS
 SELECT NULL::uuid AS id,
    NULL::text AS name,
    NULL::uuid AS partnerid,
    NULL::numeric AS amounttotal,
    NULL::numeric AS totalpaid,
    NULL::numeric AS residual,
    NULL::boolean AS isdeleted,
    NULL::uuid AS companyid,
    NULL::uuid AS doctorid,
    NULL::text AS state,
    NULL::timestamp without time zone AS datecreated
  WHERE false;


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.appointments (id, name, date, "time", datetimeappointment, dateappointmentreminder, timeexpected, note, userid, partnerid, companyid, dotkhamid, doctorid, state, reason, saleorderid, isrepeatcustomer, color, createdbyid, writebyid, datecreated, lastupdated, leadid, callid, teamid, lastdatereminder, confirmedid, datetimearrived, datetimedismissed, datetimeseated, aptstate, customerreceiptid, customercarestatus, datedone, isnotreatment, crmtaskid) FROM stdin;
afb8d354-2743-46f8-a871-b03100222700	AP01541	2023-06-30 11:30:00	\N	\N	\N	60	\N	\N	1e9d5389-810b-436c-8dbb-b0310021f217	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	dbefd061-dbb0-44d7-8eed-afe3007a8017	done	\N	\N	f	0	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	2023-06-30 09:04:20.692868	2023-06-30 13:59:43.042274	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
2b8bab79-0bae-4595-acc2-b0310065cfd5	AP01556	2023-07-10 10:00:00	\N	\N	\N	60	MÀI SỨ	\N	1e9d5389-810b-436c-8dbb-b0310021f217	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	dbefd061-dbb0-44d7-8eed-afe3007a8017	done	\N	\N	f	3	661769c7-fe5d-4de0-97b3-12d129198ccc	661769c7-fe5d-4de0-97b3-12d129198ccc	2023-06-30 13:10:41.135866	2023-07-10 10:50:54.450781	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
c1cfa517-2392-4c46-a920-b03b00631ff4	AP01874	2023-07-13 10:30:00	\N	\N	\N	30	Thử Răng - Ý	\N	1e9d5389-810b-436c-8dbb-b0310021f217	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	dbefd061-dbb0-44d7-8eed-afe3007a8017	done	\N	\N	f	3	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	b4ce78f5-c73f-4f36-888a-914287165026	2023-07-10 13:00:54.147205	2023-07-13 10:23:57.373806	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
6aee400c-78d0-4f84-8a51-b03e0043a62d	AP01992	2023-07-15 13:30:00	\N	\N	\N	30	GẮN KT - Ý 	\N	1e9d5389-810b-436c-8dbb-b0310021f217	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	dbefd061-dbb0-44d7-8eed-afe3007a8017	done	\N	\N	f	3	b4ce78f5-c73f-4f36-888a-914287165026	661769c7-fe5d-4de0-97b3-12d129198ccc	2023-07-13 11:06:18.177448	2023-07-15 15:04:12.066385	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
1d74e3c9-300c-493f-902e-b10b006baae0	AP18553	2024-02-04 10:00:00	\N	\N	\N	60	MCLD Sứ 4R - Quyên	\N	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	6ac1a478-0568-4ec6-a3d6-b05b009de13d	done	\N	\N	t	4	8a553679-4de6-496c-8cf3-a25b09f124b4	8a553679-4de6-496c-8cf3-a25b09f124b4	2024-02-03 13:32:00.320007	2024-02-04 10:40:58.943243	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
757d5337-d5c3-4b62-8267-b10c00a2090d	AP18674	2024-02-05 17:30:00	\N	\N	\N	60	gắn sứ ( THU THÊM 3tr1) - quyên	\N	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	6ac1a478-0568-4ec6-a3d6-b05b009de13d	done	\N	\N	t	4	8a553679-4de6-496c-8cf3-a25b09f124b4	8a553679-4de6-496c-8cf3-a25b09f124b4	2024-02-04 16:49:57.161136	2024-02-05 17:22:31.232896	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
74148cc5-9ef3-4098-a898-b1660089956a	AP30330	2024-05-20 17:00:00	\N	\N	\N	60	GDLCN - GMC - TRÂM	\N	a62414fe-b577-41a2-84d1-b14d008dc0c5	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	b41477e0-8eed-4520-a41a-b145008c51b0	done	\N	\N	f	4	1301042d-f731-41ef-b3d4-4f075d59c711	aedc7e28-b6c1-44e0-a895-8524012c03e4	2024-05-04 15:20:55.604329	2024-05-20 16:20:00.521218	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	89582f8e-8091-464b-89cd-b1760099cf9c	\N	\N	f	\N
6ff9080a-94a5-486a-983b-b17400aa3f37	AP33050	2024-05-26 15:00:00	\N	\N	\N	60	Tư vấn niềng răng 	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	140d4c43-227b-4a1f-93e7-b17400aa26b1	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	fd67fda4-42ea-4f85-b100-b14c0090e6e4	done	\N	\N	f	2	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	34faeb06-ee46-4277-bb29-544c49a99771	2024-05-18 17:19:51.00757	2024-05-26 16:16:38.345804	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	5bbc2e79-39a3-4c99-b7cd-b17c00893945	\N	\N	f	\N
928bc3aa-8335-4b89-a0d4-b17600d100e4	AP33447	2024-07-03 10:15:00	\N	\N	\N	30	TĂNG LỰC  + NCR 36 - TRÂM	aedc7e28-b6c1-44e0-a895-8524012c03e4	a62414fe-b577-41a2-84d1-b14d008dc0c5	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	b41477e0-8eed-4520-a41a-b145008c51b0	done	\N	\N	t	3	aedc7e28-b6c1-44e0-a895-8524012c03e4	aedc7e28-b6c1-44e0-a895-8524012c03e4	2024-05-20 19:40:57.503834	2024-07-03 11:17:35.966583	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	780f765d-ccaa-4022-84b7-b1a20046c075	\N	\N	f	\N
a252c884-95c9-4bbe-a690-b1770040eee6	AP33492	2024-05-21 15:00:00	\N	\N	\N	60	THỬ SỨ - THẢO 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e2972973-56ed-4b6e-a411-b1760022319c	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-05-21 10:56:24.872658	2024-05-21 14:57:26.902845	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	d11193ab-5820-409c-b3f7-b17700832296	\N	\N	f	\N
5c53123a-ac62-41c1-86cc-b17700b17a85	AP33613	2024-05-22 15:00:00	\N	\N	\N	60	thử sứ - Thảo 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e2972973-56ed-4b6e-a411-b1760022319c	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-05-21 17:46:10.787066	2024-05-22 15:31:31.792862	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	a0964f45-8598-408d-a7ee-b178008c7ef1	\N	\N	f	\N
88d73a48-4865-4298-bd0a-b18300b44518	AP35903	2024-06-06 09:00:00	\N	\N	\N	30	hàn răng - HA	34faeb06-ee46-4277-bb29-544c49a99771	140d4c43-227b-4a1f-93e7-b17400aa26b1	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	fd67fda4-42ea-4f85-b100-b14c0090e6e4	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-06-02 17:56:20.558793	2024-06-06 09:23:52.492207	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	204c7150-f03b-4657-91e6-b18700278430	\N	\N	f	\N
242962af-d06f-4ef0-b01f-b187002d89d1	AP36504	2024-06-14 09:00:00	\N	\N	\N	60	hàn cứng	34faeb06-ee46-4277-bb29-544c49a99771	140d4c43-227b-4a1f-93e7-b17400aa26b1	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	fd67fda4-42ea-4f85-b100-b14c0090e6e4	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-06-06 09:45:48.004534	2024-06-14 09:02:01.481562	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	951fc075-e166-4e70-b7e5-b18f002183da	\N	\N	f	\N
f8459096-6581-4a91-aecc-b193003bfa09	AP38645	2024-06-19 17:00:00	\N	\N	\N	60	ĐTT tiếp - Thảo 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e2972973-56ed-4b6e-a411-b1760022319c	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-06-18 10:38:22.110416	2024-06-19 17:02:35.865098	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	9ebd1570-8537-4705-b4d2-b19400a58227	\N	\N	f	\N
a36c5aea-fb4c-4d51-a5b4-b1ce00a363f5	AP50542	2024-08-17 10:00:00	\N	\N	\N	60	kiểm tra răng - Thảo 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e2972973-56ed-4b6e-a411-b1760022319c	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	t	5	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-08-16 16:54:53.188874	2024-08-17 09:48:08.186144	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	9d272815-b40b-4429-b089-b1cf002e2e02	1	\N	f	\N
4a68bc7f-a8bd-4cce-aaeb-b1ce00c77e5c	AP50594	2024-08-17 14:00:00	\N	\N	\N	60	KTQ - răng đau	34faeb06-ee46-4277-bb29-544c49a99771	80953c05-6320-4feb-b31e-b1ce00c73f79	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f1abd11e-6309-4b5b-add9-b14c0090f199	done	\N	\N	t	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-16 19:06:20.038095	2024-08-17 14:29:04.78601	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	7bfa43c7-5786-4410-8e35-b1cf0079c456	1	\N	f	\N
5c87e220-c758-4820-9abb-b1cf00acaebd	AP50781	2024-08-22 09:30:00	\N	\N	\N	60	lắp răng - Hải - oki	34faeb06-ee46-4277-bb29-544c49a99771	80953c05-6320-4feb-b31e-b1ce00c73f79	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	a3a0e8dc-6b40-468f-803b-b1cf0063ad84	done	\N	\N	f	3	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-17 17:28:43.08065	2024-08-22 09:32:29.064524	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
d2de1ab9-cb9a-450f-8e48-b1d000b917e4	AP51024	2024-08-23 09:30:00	\N	\N	\N	15	NHỔ RĂNG -QUYÊN 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	ed346f4b-c27b-428f-8e46-b05b009de13d	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-08-18 18:13:54.25239	2024-08-23 10:05:03.554092	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	631b8aa0-8177-44d0-a1b9-b1d50032d3e8	1	\N	f	\N
afe18863-2d89-44cd-b9c7-b1d5004fa20c	AP51996	2024-09-22 12:00:00	\N	\N	\N	30	mcld 12-21 - Quyên 	2eb12148-bf3f-4694-8f3e-0a7db0815502	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	ed346f4b-c27b-428f-8e46-b05b009de13d	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-08-23 11:49:56.094445	2024-09-22 10:22:43.112074	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	d30e4386-4991-483c-a465-b1f30037ad9f	1	\N	f	\N
acb61377-6741-4d71-bfeb-b1d5004fed83	AP51998	2024-08-24 16:00:00	\N	\N	\N	30	lắp răng	34faeb06-ee46-4277-bb29-544c49a99771	80953c05-6320-4feb-b31e-b1ce00c73f79	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-23 11:51:00.488768	2024-08-24 16:29:10.156198	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e878b8ea-9695-4216-9fec-b1d6009c53b3	1	\N	f	\N
6848efe1-6816-4c78-a3f1-b1d600a8e110	AP52276	2024-08-26 17:00:00	\N	\N	\N	60	lắp R - oki	34faeb06-ee46-4277-bb29-544c49a99771	80953c05-6320-4feb-b31e-b1ce00c73f79	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	fd67fda4-42ea-4f85-b100-b14c0090e6e4	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-24 17:14:52.211583	2024-08-26 16:45:43.580642	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
5bf1d97b-cd86-48ef-97e4-b1f3004ae35f	AP57879	2024-10-06 11:00:00	\N	\N	\N	30	gắn răng - quyên	2eb12148-bf3f-4694-8f3e-0a7db0815502	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	ed346f4b-c27b-428f-8e46-b05b009de13d	done	\N	\N	t	3	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-09-22 11:32:39.569084	2024-10-06 10:24:18.371607	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	bf477adf-d541-48db-b63d-b20100381d33	1	\N	f	\N
6c821846-f45f-4ffb-857f-b217003b57af	AP65866	2024-10-28 18:00:00	\N	\N	\N	30	Tư vấn răng sứ	816d038b-856e-4227-9b19-9cac831fe139	7f38b288-2f0f-4caa-81ac-b217003b3c31	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	done	\N	\N	f	2	816d038b-856e-4227-9b19-9cac831fe139	557ae18c-c3b7-44a5-80b4-726395a545f6	2024-10-28 10:36:03.571989	2024-10-28 18:46:30.986562	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	03951f27-4560-4914-a70c-b21700c20cea	1	\N	f	\N
c8aad010-ef3d-456c-9579-b21800ddc89a	AP66262	2024-10-30 09:15:00	\N	\N	\N	30	MCLD -nthao	4849e001-51cb-47b5-864b-9bb0405cc376	7f38b288-2f0f-4caa-81ac-b217003b3c31	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	0	4849e001-51cb-47b5-864b-9bb0405cc376	557ae18c-c3b7-44a5-80b4-726395a545f6	2024-10-29 20:27:29.3627	2024-10-30 09:12:47.954217	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
2a2d7e5b-e1b7-43d2-ad10-b219008458dd	AP66407	2024-11-01 10:00:00	\N	\N	\N	60	GẮN SỨ 11,12	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	7f38b288-2f0f-4caa-81ac-b217003b3c31	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	bd0a4290-cb99-4b8c-a00f-53c9375df455	2024-10-30 15:01:51.667589	2024-11-01 10:44:58.047625	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e6accf51-c9bb-4456-a8bf-b21b003dca01	1	\N	f	\N
0f4de9e9-76bf-4bd5-bfec-b21c0032f9f6	AP66943	2024-11-04 12:00:00	\N	\N	\N	30	GIAO HÀM DUY TRÌ	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	7f38b288-2f0f-4caa-81ac-b217003b3c31	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	bd0a4290-cb99-4b8c-a00f-53c9375df455	2024-11-02 10:05:35.967616	2024-11-04 11:55:09.564703	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e9071ceb-2f64-4cc1-ab82-b21e00511160	1	\N	f	\N
5123e7f4-328f-4216-9833-b2200099917c	AP68030	2024-11-18 11:00:00	\N	\N	\N	60	TRÁM R -NTHAO	557ae18c-c3b7-44a5-80b4-726395a545f6	7f38b288-2f0f-4caa-81ac-b217003b3c31	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	557ae18c-c3b7-44a5-80b4-726395a545f6	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	2024-11-06 16:19:07.506575	2024-11-18 10:56:09.947502	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
e4c6121a-7a0d-465a-9238-b24c003555b2	AP78800	2024-12-20 14:30:00	\N	\N	\N	60	kiểm tra làm lại răng sứ	34faeb06-ee46-4277-bb29-544c49a99771	c977958d-09c6-4067-8f4d-b24c00353bcf	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	84e06356-f141-4c9f-be74-960ceb256379	2024-12-20 10:14:11.155287	2024-12-20 17:07:11.063741	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	27fffd6f-73f5-481e-bd20-b24c00a6c49a	1	\N	f	\N
ddc5fa73-fb96-4441-802d-b24d00a4f01a	AP79216	2025-03-18 14:00:00	\N	\N	\N	30	làm lại 8R Sứ HT	34faeb06-ee46-4277-bb29-544c49a99771	c977958d-09c6-4067-8f4d-b24c00353bcf	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	3c2a3bda-879f-48b7-8ee4-b266004978ea	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-12-21 17:00:31.231493	2025-03-18 14:39:33.45913	\N	\N	\N	\N	\N	\N	\N	\N	\N	f82ac509-acad-4670-831b-b2a4007e389c	1	\N	f	\N
0439daef-e23e-4b79-b7eb-b25f0077488b	AP83330	2025-01-08 12:00:00	\N	\N	\N	60	TV TRÁM	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2da1bae8-d8e2-4a85-9da8-b25f0077382c	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	2	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-08 14:14:17.850579	2025-01-08 14:14:21.838617	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	fd39cac7-9da6-4861-8013-b25f00774d33	1	\N	f	\N
0961721a-d34d-4672-9897-b25f009c5bcd	AP83391	2025-01-13 16:00:00	\N	\N	\N	60	TRÁM KT + SỨ 4R - THU THẢO	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2da1bae8-d8e2-4a85-9da8-b25f0077382c	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-08 16:29:17.054669	2025-01-13 13:23:26.207529	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	60a1e94e-a25d-4a3e-9cba-b26400695061	1	\N	f	\N
bfdd1f34-b13f-41cf-95ce-b2640092666c	AP84702	2025-01-16 14:00:00	\N	\N	\N	60	THỬ R-THU THẢO	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2da1bae8-d8e2-4a85-9da8-b25f0077382c	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-13 15:53:01.583911	2025-01-16 13:25:40.501819	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	fb1fc568-0411-46c6-b3bc-b2670069edc0	1	\N	f	\N
db6c2d9a-3438-443f-8702-b2670083c6d2	AP85507	2025-01-21 14:00:00	\N	\N	\N	60	THỬ R-THU THẢO	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2da1bae8-d8e2-4a85-9da8-b25f0077382c	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-16 14:59:47.045542	2025-01-21 13:31:45.735107	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	2f4a9c4a-8294-4f26-ac82-b26c006b99bb	1	\N	f	\N
9dd16fff-9b41-40b8-a934-b2a400a9c6dd	AP101112	2025-03-20 15:00:00	\N	\N	\N	60	lắp răng	34faeb06-ee46-4277-bb29-544c49a99771	c977958d-09c6-4067-8f4d-b24c00353bcf	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	3c2a3bda-879f-48b7-8ee4-b266004978ea	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-03-18 17:18:08.308432	2025-03-20 16:13:38.590005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	\N	f	\N
7eeed08b-5c1f-449c-b084-b2b400a4cc19	AP105744	2025-04-08 15:00:00	\N	\N	\N	30	làm lại HĐ + ktra lại răng lâu r chưa tái khám - Ly ( TRANG )	aedc7e28-b6c1-44e0-a895-8524012c03e4	a62414fe-b577-41a2-84d1-b14d008dc0c5	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	b41477e0-8eed-4520-a41a-b145008c51b0	done	\N	\N	t	5	aedc7e28-b6c1-44e0-a895-8524012c03e4	dce9b0d9-4a2f-4045-8606-472311a5ea63	2025-04-03 17:00:00.50797	2025-04-08 15:11:16.223547	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	0c99f2e6-7bfa-46b8-a487-b2b90086ee6b	1	\N	f	\N
eb33ae03-6a13-4fb0-a581-b2e8007b7909	AP122315	2025-05-25 13:30:00	\N	\N	\N	30	nhổ R sữa	34faeb06-ee46-4277-bb29-544c49a99771	0958759d-2985-4323-8807-b2e8007b4e9d	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-05-25 14:29:33.042761	2025-05-25 14:29:39.598271	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	\N	f	\N
7671344e-c30a-417a-9c66-b2fe00c1e90b	AP130083	2025-06-20 16:00:00	\N	\N	\N	60	GẮN CÙI GIẢ + LẤY DẤU SỨ - Y	b4ce78f5-c73f-4f36-888a-914287165026	e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	b4ce78f5-c73f-4f36-888a-914287165026	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	2025-06-16 18:46:00.352903	2025-06-21 11:33:22.281961	\N	\N	\N	\N	\N	\N	\N	\N	\N	cdec823e-71df-4553-8b8d-b30200834e19	1	\N	f	\N
f59ba8c3-4151-4a68-9936-b30200b0bc80	AP131394	2025-06-25 16:10:00	\N	\N	\N	50	LẤY DẤU RĂNG SỨ-Ý	b4ce78f5-c73f-4f36-888a-914287165026	e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	4	b4ce78f5-c73f-4f36-888a-914287165026	db1910ec-5dda-46d7-9d88-5d963cd5aadd	2025-06-20 17:43:28.639259	2025-06-25 16:01:14.138888	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	611b3ec5-e426-40df-befa-b3070094a79c	1	\N	f	\N
daa17a00-4791-4ceb-99eb-b3070031030c	AP133002	2025-06-25 18:00:00	\N	\N	\N	60	DTT r25 - D  ( KHÁCH CHỈ ĐI DC 18H ) THU TIỀN  YCPT KIÊN  )	a3710d9f-eef0-420c-a03c-a983c701bb42	06364188-d7e1-421b-a409-b3030060b209	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	a3710d9f-eef0-420c-a03c-a983c701bb42	a3710d9f-eef0-420c-a03c-a983c701bb42	2025-06-25 09:58:26.812458	2025-06-26 10:16:45.324748	\N	\N	\N	\N	\N	\N	\N	\N	\N	ba5c6cca-ce89-4b0b-9da4-b30700ac4b64	1	\N	f	\N
0fc3120f-21f9-41d4-b770-b30700a440a1	AP133199	2025-06-28 15:40:00	\N	\N	\N	20	GẮN RĂNG - Ý	db1910ec-5dda-46d7-9d88-5d963cd5aadd	e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	3	db1910ec-5dda-46d7-9d88-5d963cd5aadd	db1910ec-5dda-46d7-9d88-5d963cd5aadd	2025-06-25 16:58:01.494301	2025-06-28 15:52:02.193893	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	7d87903b-27c0-4707-9540-b30a009220ca	1	\N	f	\N
53a3abb1-e031-4223-8dd9-b30700c42939	AP133247	2025-07-09 18:00:00	\N	\N	\N	10	TKT , MCLD 1 RĂNG  - D ( THU TIỀN )	db1910ec-5dda-46d7-9d88-5d963cd5aadd	06364188-d7e1-421b-a409-b3030060b209	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	db1910ec-5dda-46d7-9d88-5d963cd5aadd	abb07db2-3cb6-4eae-b50f-0d191a86a38e	2025-06-25 18:54:12.026962	2025-07-10 09:48:17.911574	\N	\N	\N	\N	\N	\N	\N	\N	\N	24da995e-a775-477f-aa4a-b31500a55f3f	1	\N	f	\N
281a0c39-cbc5-443a-b2f9-b30a00650910	AP133987	2025-06-30 18:00:00	\N	\N	\N	60	Tư vấn răng sứ	c0a08fa8-569c-4ac9-9f41-57089701b2f2	fa3f3aa0-2bc9-4656-8029-b30a0064edf2	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	done	\N	\N	f	2	c0a08fa8-569c-4ac9-9f41-57089701b2f2	9f14688a-8e2d-40e7-850d-19f1abae8b63	2025-06-28 13:07:51.520314	2025-06-30 18:14:58.363799	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	83d32ff1-8a28-4b89-a184-b30c00b962fe	1	\N	f	\N
8a4e7a17-b9b1-4fc5-b38b-b30a00a311ae	AP134123	2025-07-01 17:00:00	\N	\N	\N	60	gắn sứ-Ý ( LÊN LIỀN K ĐỢI)	db1910ec-5dda-46d7-9d88-5d963cd5aadd	e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	db1910ec-5dda-46d7-9d88-5d963cd5aadd	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-28 16:53:42.97804	2025-07-02 10:54:18.532018	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	cf7e1665-c08a-4f4d-a659-b30d00aa3626	1	\N	f	\N
9a4df259-8237-49df-b0c0-b30a00a33b1b	AP134125	2025-07-01 18:00:00	\N	\N	\N	30	GẮN SỨ -Ý	db1910ec-5dda-46d7-9d88-5d963cd5aadd	e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	db1910ec-5dda-46d7-9d88-5d963cd5aadd	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-28 16:54:18.327592	2025-07-02 10:55:20.579687	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	9fdc38a7-91ec-4309-b5b8-b30d00aa3a22	1	\N	f	\N
23fe50ae-4af1-437e-8e35-b3150099de54	AP138192	2025-07-09 17:30:00	\N	\N	\N	30	TKT , MCLD 1 RĂNG - D ( THU TIỀN )	a3710d9f-eef0-420c-a03c-a983c701bb42	06364188-d7e1-421b-a409-b3030060b209	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	a3710d9f-eef0-420c-a03c-a983c701bb42	abb07db2-3cb6-4eae-b50f-0d191a86a38e	2025-07-09 16:20:13.078746	2025-07-10 09:47:58.077985	\N	\N	\N	\N	\N	\N	\N	\N	\N	75a9318e-afe9-457a-bdcb-b31500a55b0f	1	\N	f	\N
989494cb-7735-4916-a123-b31500a6e016	AP138225	2025-07-09 14:00:00	\N	\N	\N	30	nhổ R sữa	34faeb06-ee46-4277-bb29-544c49a99771	0958759d-2985-4323-8807-b2e8007b4e9d	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-07-09 17:07:34.472183	2025-07-09 17:07:45.406608	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	\N	f	\N
26953ee3-d1d7-49ea-9610-b31500c2f3bc	AP138285	2025-07-19 16:00:00	\N	\N	\N	60	GẮN R - D	db1910ec-5dda-46d7-9d88-5d963cd5aadd	06364188-d7e1-421b-a409-b3030060b209	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	db1910ec-5dda-46d7-9d88-5d963cd5aadd	0908329c-0d8c-40de-81c1-4dcd4ccbeac2	2025-07-09 18:49:47.929755	2025-07-20 09:54:56.633087	\N	\N	\N	\N	\N	\N	\N	\N	\N	e2ef9556-af4b-47df-9084-b31f009423f4	1	\N	f	\N
803d07ad-9b37-456d-9aa4-b32100a2723c	AP142471	2025-08-16 14:00:00	\N	\N	\N	30	NR 1 chân răng - d ( đã xin bác 17 )	6d527434-519a-46b9-848a-6085a9543d08	06364188-d7e1-421b-a409-b3030060b209	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	90e19070-f750-415b-ba52-b05f002e9438	done	dl	\N	f	7	6d527434-519a-46b9-848a-6085a9543d08	abb07db2-3cb6-4eae-b50f-0d191a86a38e	2025-07-21 16:51:26.918859	2025-08-17 09:41:45.533902	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	\N	f	\N
2473e7b6-5e02-49b9-acf7-b32300c06535	AP143209	2025-07-23 18:40:00	\N	\N	\N	60	Nhổ r sữa	34faeb06-ee46-4277-bb29-544c49a99771	0958759d-2985-4323-8807-b2e8007b4e9d	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f03fce3f-d90e-4194-a28f-b1d400752590	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-07-23 18:40:29.402177	2025-07-23 18:40:34.814788	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
e3cd7d03-1b53-42fa-91bf-b326004ab926	AP144056	2025-08-06 13:30:00	\N	\N	\N	180	TRÁM TÁI TẠO R33 (CẨM TIÊN ĐÃ THU PHÍ )+ MCLD SỨ 8R - THU THẢO	9f14688a-8e2d-40e7-850d-19f1abae8b63	fa3f3aa0-2bc9-4656-8029-b30a0064edf2	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	4	9f14688a-8e2d-40e7-850d-19f1abae8b63	f879eaed-e8df-4b2f-91ae-e0409eabb639	2025-07-26 11:32:03.540673	2025-08-06 13:59:53.270466	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
8688f161-9e4b-4508-a2f4-b334001cbdbe	AP148845	2025-08-12 16:30:00	\N	\N	\N	30	thử sứ-thu thảo	f879eaed-e8df-4b2f-91ae-e0409eabb639	fa3f3aa0-2bc9-4656-8029-b30a0064edf2	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	f879eaed-e8df-4b2f-91ae-e0409eabb639	f879eaed-e8df-4b2f-91ae-e0409eabb639	2025-08-09 08:44:38.607007	2025-08-12 17:25:58.310323	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
ef90bda2-c171-4ecd-a14c-b33700bac7e4	AP150346	2025-08-21 09:00:00	\N	\N	\N	60	GẮN R- THU THẢO 	9f14688a-8e2d-40e7-850d-19f1abae8b63	fa3f3aa0-2bc9-4656-8029-b30a0064edf2	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	9f14688a-8e2d-40e7-850d-19f1abae8b63	557ae18c-c3b7-44a5-80b4-726395a545f6	2025-08-12 18:20:02.890168	2025-08-21 10:09:54.314493	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	5a3663ba-c31b-463d-abda-b340003428ae	1	\N	f	\N
b6ac573f-c796-42c1-b058-b34a004fb7a6	AP156703	2025-08-31 10:30:00	\N	\N	\N	30	NN R26- QUỲNH NHƯ	14901ece-9fd9-4f5a-8921-423ca8c120dc	804e1102-7e0f-42b6-8158-b342003f49b5	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	14901ece-9fd9-4f5a-8921-423ca8c120dc	14901ece-9fd9-4f5a-8921-423ca8c120dc	2025-08-31 11:50:14.525933	2025-08-31 11:50:17.756936	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
c633842e-567c-468e-a438-b34a004fe8a8	AP156704	2025-09-07 09:30:00	\N	\N	\N	15	NN R26-QUỲNH NHƯ	14901ece-9fd9-4f5a-8921-423ca8c120dc	804e1102-7e0f-42b6-8158-b342003f49b5	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	14901ece-9fd9-4f5a-8921-423ca8c120dc	557ae18c-c3b7-44a5-80b4-726395a545f6	2025-08-31 11:50:56.346491	2025-09-07 10:02:45.670597	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	768a6148-6357-4bb6-89b4-b3510032325d	1	\N	f	\N
12210a09-4905-42c1-9170-b34d00426636	AP157206	2025-09-03 13:00:00	\N	\N	\N	60	Tư vấn điều trị tủy 	628be5fe-ecec-4919-829e-871dfb5006ef	4da68ebf-0e77-4f33-a5f3-b34d00423c10	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f03fce3f-d90e-4194-a28f-b1d400752590	done	\N	\N	f	2	628be5fe-ecec-4919-829e-871dfb5006ef	34faeb06-ee46-4277-bb29-544c49a99771	2025-09-03 11:01:45.140782	2025-09-03 14:24:26.729663	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	\N	f	\N
e500faaa-6575-4bb8-9fa9-b34d00959d22	AP157362	2025-09-07 16:00:00	\N	\N	\N	60	đtt tiếp	34faeb06-ee46-4277-bb29-544c49a99771	4da68ebf-0e77-4f33-a5f3-b34d00423c10	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f03fce3f-d90e-4194-a28f-b1d400752590	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-09-03 16:04:43.63085	2025-09-07 16:14:33.724941	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
0867f431-fe61-4b21-af58-b351006c57be	AP158949	2025-09-14 10:10:00	\N	\N	\N	60	NN-  QUỲNH NHƯ ( TG 1 TIẾNG BÁO VỚI BA BÉ)	14901ece-9fd9-4f5a-8921-423ca8c120dc	804e1102-7e0f-42b6-8158-b342003f49b5	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	14901ece-9fd9-4f5a-8921-423ca8c120dc	f879eaed-e8df-4b2f-91ae-e0409eabb639	2025-09-07 13:34:27.832407	2025-09-14 10:12:53.152949	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	b0b0c9d2-a345-4f6d-865a-b3580034fa41	1	\N	f	\N
079be370-c250-4182-9bed-b35100b46280	AP159102	2025-11-10 14:00:00	\N	\N	\N	60	hàn tủy 	34faeb06-ee46-4277-bb29-544c49a99771	4da68ebf-0e77-4f33-a5f3-b34d00423c10	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f03fce3f-d90e-4194-a28f-b1d400752590	done	\N	\N	t	3	34faeb06-ee46-4277-bb29-544c49a99771	519b9e4b-9949-4422-bacc-6f17c1f4031e	2025-09-07 17:56:45.650626	2025-11-10 13:55:29.734138	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e056eda4-c73b-43fa-9619-b39100721e7f	1	\N	f	\N
e7e1f32a-8e49-4d17-911d-b35400ab7f8d	AP160220	2025-09-12 13:30:54	\N	\N	\N	60	Tư vấn niềng răng 	816d038b-856e-4227-9b19-9cac831fe139	10f79eec-0965-4397-aeeb-b35400ab5326	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	done	\N	\N	f	2	816d038b-856e-4227-9b19-9cac831fe139	dce9b0d9-4a2f-4045-8606-472311a5ea63	2025-09-10 17:24:24.361224	2025-09-12 15:30:17.459032	\N	\N	\N	\N	\N	\N	\N	\N	\N	80a6cbea-2ff5-4876-a34c-b356008c27d0	1	\N	f	\N
4dd874ab-ec17-48f7-a8d9-b356009b3e05	AP160936	2025-09-12 16:24:00	\N	\N	\N	60	GẮN MẮC CÀI -V-KHÁNH	dce9b0d9-4a2f-4045-8606-472311a5ea63	10f79eec-0965-4397-aeeb-b35400ab5326	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	4	dce9b0d9-4a2f-4045-8606-472311a5ea63	dce9b0d9-4a2f-4045-8606-472311a5ea63	2025-09-12 16:25:13.189826	2025-09-12 16:25:16.809673	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
f9765187-e9c4-4db5-b5df-b35600ba214d	AP161003	2025-10-20 16:10:00	\N	\N	\N	20	TĂNG LỰC  -V-KHÁNH-LY	dce9b0d9-4a2f-4045-8606-472311a5ea63	10f79eec-0965-4397-aeeb-b35400ab5326	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	dce9b0d9-4a2f-4045-8606-472311a5ea63	07133b25-d559-419c-ae04-ddb4545df960	2025-09-12 18:17:40.73442	2025-10-20 16:42:06.606605	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	94b250c4-3be6-43e3-827e-b37c009fe19b	1	\N	f	\N
81084ac8-27ef-4412-9a9d-b3580064e0fd	AP161657	2025-09-20 10:00:00	\N	\N	\N	15	TKT- QUỲNH NHƯ	14901ece-9fd9-4f5a-8921-423ca8c120dc	804e1102-7e0f-42b6-8158-b342003f49b5	6861c928-0e13-4664-c781-08dcdfa45074	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	done	\N	\N	f	3	14901ece-9fd9-4f5a-8921-423ca8c120dc	f879eaed-e8df-4b2f-91ae-e0409eabb639	2025-09-14 13:07:17.322705	2025-09-20 10:13:55.209741	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	df257813-806c-4fd8-b2a5-b35e003542fd	1	\N	f	\N
009c5e5a-b33a-4d91-af5a-b366007b028b	AP166864	2025-10-01 15:00:00	\N	\N	\N	60	CHỬA TUỶ R47-DƯƠNG	47f96103-8fad-4d6e-ba79-9eb01eaa5451	281f07e9-1916-4f3f-95d7-b3660060ccaa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	f	5	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-09-28 14:27:51.927655	2025-10-01 15:00:56.251834	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	82afa4da-5089-49db-b3f6-b369008417e5	1	\N	f	\N
870ce075-782b-4934-86de-b36900900919	AP167962	2025-10-15 14:15:00	\N	\N	\N	45	TBOT - DƯƠNG (45P)	47f96103-8fad-4d6e-ba79-9eb01eaa5451	281f07e9-1916-4f3f-95d7-b3660060ccaa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	f	5	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-10-01 15:44:25.043418	2025-10-15 14:20:35.877851	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	0d0ea1d2-c4b3-4d95-9383-b37700790373	1	\N	f	\N
cc1d154f-6778-4b8e-94a2-b36d008a81b3	AP169485	2025-10-05 15:00:00	\N	\N	\N	60	nhổ R sữa 	34faeb06-ee46-4277-bb29-544c49a99771	0958759d-2985-4323-8807-b2e8007b4e9d	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	f03fce3f-d90e-4194-a28f-b1d400752590	done	\N	\N	f	4	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2025-10-05 15:24:17.234515	2025-10-05 15:24:21.537298	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
e5d639d9-4f1e-4682-a9d2-b377008835a8	AP173401	2025-10-22 16:00:00	\N	\N	\N	60	Trám KT R47 - Dương	47f96103-8fad-4d6e-ba79-9eb01eaa5451	281f07e9-1916-4f3f-95d7-b3660060ccaa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	f	5	47f96103-8fad-4d6e-ba79-9eb01eaa5451	d67346f6-837e-499d-8e8f-0eea533fcd4c	2025-10-15 15:15:55.440198	2025-10-22 16:06:25.818254	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	57db3583-3a72-41d4-b4bd-b37e009614df	1	\N	f	\N
3467deae-2c82-46cc-89f2-b37800216e02	AP173558	2025-10-16 09:00:00	\N	\N	\N	60	tư vấn niềng răng 	2b860551-c401-48a3-ac11-4286e01fca87	fd51b881-a221-4469-9c28-b37800215caa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	done	\N	\N	f	2	2b860551-c401-48a3-ac11-4286e01fca87	2d2c75ee-b087-468d-b848-51ea016b28b9	2025-10-16 09:01:42.835359	2025-10-16 09:57:42.779219	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	8768abab-2a83-4a21-896f-b3780030cf6e	1	\N	f	\N
e4af3433-c8e6-45ff-bb11-b37c00b28a72	AP175345	2026-01-15 14:55:00	\N	\N	\N	15	TĂNG LỰC-V-KHÁNH-K-LY	07133b25-d559-419c-ae04-ddb4545df960	10f79eec-0965-4397-aeeb-b35400ab5326	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-10-20 17:50:02.830148	2026-01-15 15:21:51.274208	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	58fade68-2f11-49c4-8b91-b3d30089d687	1	\N	f	\N
8a47e9f3-c983-47fa-8fbd-b37e00a6485d	AP176045	2025-11-19 16:00:00	\N	\N	\N	60	ĐẶT CHỐT SỢI-D (đã tt chốt sợi)	d67346f6-837e-499d-8e8f-0eea533fcd4c	281f07e9-1916-4f3f-95d7-b3660060ccaa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	f	5	d67346f6-837e-499d-8e8f-0eea533fcd4c	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-10-22 17:05:25.000752	2025-11-19 16:00:41.843611	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	6641083a-855e-4b4b-bca2-b39a00948191	1	\N	f	\N
d45fde8f-5394-4557-8b9b-b38a00624e8f	AP180453	2025-12-01 09:00:00	\N	\N	\N	30	TĂNG LỰC + GẮN MC R7 + DÁN CL - DƯƠNG -	47f96103-8fad-4d6e-ba79-9eb01eaa5451	3dc647ea-698d-4038-94e6-b38a0022baa8	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	t	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-11-03 12:57:55.463737	2025-12-02 09:47:10.288098	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	cd418fc9-2178-42c1-a647-b3a60021014d	1	\N	f	\N
deaa2889-230f-4eb0-a858-b38b0030813a	AP180711	2025-11-24 10:30:00	\N	\N	\N	60	Kiểm tra răng sâu đến tủy để Điều trị tuỷ - Uyên ( CDDV -2tr)	47f96103-8fad-4d6e-ba79-9eb01eaa5451	fd51b881-a221-4469-9c28-b37800215caa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	f	5	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-11-04 09:56:36.03275	2025-11-24 11:00:13.876672	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	d8d88c84-fac2-42d9-a99c-b39f0041fb26	1	\N	f	\N
ed913f1f-92a8-4424-8e12-b38c006a67f2	AP181225	2025-11-20 14:00:00	\N	\N	\N	20	NR DƯ- THẢO  (đg)	de5ceb25-27e1-44cd-8529-19cacbbdec40	a7640271-7120-4917-904c-b388003ba146	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	t	0	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-11-05 13:27:24.751385	2025-11-20 13:50:06.911442	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	9b40fe72-fdc2-452b-8b18-b39b0070a41e	1	\N	f	\N
46097468-8779-493b-b058-b38d0042445c	AP181555	2025-11-08 10:00:00	\N	\N	\N	60	GẮN MẮC CÀI-LY-TRANG 	aedc7e28-b6c1-44e0-a895-8524012c03e4	a918ec28-0fdd-4671-8744-b38800685e88	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	4	aedc7e28-b6c1-44e0-a895-8524012c03e4	07133b25-d559-419c-ae04-ddb4545df960	2025-11-06 11:01:16.254357	2025-11-08 09:52:58.330985	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	a89d944f-fa34-42f6-861a-b38f002f820e	1	\N	f	\N
06c6dc4c-b842-4f08-8abe-b38f006dfcb8	AP182371	2025-12-06 11:00:00	\N	\N	\N	15	TĂNG LỰC-TH-TRANG (GỬI 50K ĐÁNH GIÁ GG)	07133b25-d559-419c-ae04-ddb4545df960	a918ec28-0fdd-4671-8744-b38800685e88	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	07133b25-d559-419c-ae04-ddb4545df960	faab7710-1535-48bd-a868-a1bd2daf863d	2025-11-08 13:40:27.065546	2025-12-06 11:23:49.107725	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	dda287d9-de5d-4979-925a-b3ab004875a0	1	\N	f	\N
e7e0690a-3e58-4ed3-84ae-b395005978df	AP184657	2025-12-12 17:45:00	\N	\N	\N	30	TĂNG LỰC+GMC HD-TV- TRANG	07133b25-d559-419c-ae04-ddb4545df960	a5a89433-420a-40dd-801c-b39000b34540	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	5	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-11-14 12:25:45.488124	2025-12-12 17:07:36.911726	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	33aee882-f1ce-496e-8b2e-b3b100a6e2cc	1	\N	f	\N
1d5063dd-003d-4352-80c3-b395006c7f51	AP184686	2025-11-14 13:34:00	\N	\N	\N	60	GMC- TR- TRANG	07133b25-d559-419c-ae04-ddb4545df960	a5a89433-420a-40dd-801c-b39000b34540	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	f	4	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-11-14 13:35:01.604124	2025-11-14 13:35:29.980439	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	a69c41a2-d1c1-4ed3-ac95-b395006ca08b	1	\N	f	\N
fee66077-af45-4b97-ad1d-b39b007cb5bf	AP187067	2025-11-28 11:30:00	\N	\N	\N	60	TĂNG LỰC  - THẢO (đg)	de5ceb25-27e1-44cd-8529-19cacbbdec40	a7640271-7120-4917-904c-b388003ba146	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	f	0	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-11-20 14:34:03.303559	2025-11-28 11:10:59.540826	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	0accda69-4e6b-44ba-b135-b3a30044efc7	1	\N	f	\N
eef581d8-6fce-4255-9de2-b39f0054bb81	AP188527	2025-12-27 11:30:00	\N	\N	\N	20	TRÁM KT - UYÊN -	47f96103-8fad-4d6e-ba79-9eb01eaa5451	fd51b881-a221-4469-9c28-b37800215caa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	t	5	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-11-24 12:08:30.083858	2025-12-27 11:16:56.537076	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	f7127c16-c19b-461a-8e75-b3c000469224	1	\N	f	\N
4f12d454-32ce-4a3f-894a-b3a300bb30e2	AP190358	2025-12-09 13:30:00	\N	\N	\N	30	nhổ răng 14,44 GLMC47   - THẢO  	de5ceb25-27e1-44cd-8529-19cacbbdec40	a7640271-7120-4917-904c-b388003ba146	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	f	0	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-11-28 18:21:32.484668	2025-12-09 13:16:26.333415	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	43dc91e5-05e3-4879-97cf-b3ae0067643f	1	\N	f	\N
f372873c-2fa6-48ad-8b79-b3a60038d46f	AP191207	2025-12-31 09:00:00	\N	\N	\N	30	Tăng lực _ D-o -	47f96103-8fad-4d6e-ba79-9eb01eaa5451	3dc647ea-698d-4038-94e6-b38a0022baa8	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	t	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-01 10:26:54.662273	2026-01-04 18:25:16.894368	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	391c9679-b6c2-4405-9421-b3c40021cf87	1	\N	f	\N
6789a04a-e121-41fe-82d9-b3a6005c8378	AP191278	2025-12-01 14:00:00	\N	\N	\N	15	KTRA CHẶN LƯỠI - D	47f96103-8fad-4d6e-ba79-9eb01eaa5451	3dc647ea-698d-4038-94e6-b38a0022baa8	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	f	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-01 12:36:49.894515	2025-12-02 09:46:00.319432	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
5ecf95ef-2064-4fd2-a1be-b3ab004f5c08	AP193181	2026-01-03 14:45:00	\N	\N	\N	15	TĂNG LỰC-V-TRANG	07133b25-d559-419c-ae04-ddb4545df960	a918ec28-0fdd-4671-8744-b38800685e88	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-12-06 11:48:56.346875	2026-01-03 14:38:30.0324	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	6c9e6910-049b-4be6-b46c-b3c7007dee20	1	\N	f	\N
b47c4f57-4d37-478e-b251-b3ad007cb77d	AP194138	2025-12-16 10:00:00	\N	\N	\N	60	Tư vấn niềng răng - Ý	c0a08fa8-569c-4ac9-9f41-57089701b2f2	250c1ff6-8b5e-4bc6-9ac3-b3ad007ca9b0	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	done	dl	\N	f	7	c0a08fa8-569c-4ac9-9f41-57089701b2f2	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-08 14:34:04.78869	2025-12-17 17:47:31.366302	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
70126983-afc4-4633-bbb8-b3ae00790894	AP194534	2025-12-24 13:00:00	\N	\N	\N	60	NR24,34- THẢO  đg 	de5ceb25-27e1-44cd-8529-19cacbbdec40	a7640271-7120-4917-904c-b388003ba146	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	t	0	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-12-09 14:20:40.171693	2025-12-24 13:05:21.310253	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	717edeac-7bb0-419d-b3fd-b3bd006458e7	1	\N	f	\N
2de8b558-4f94-4e30-bd1e-b3b100b794ef	AP195834	2026-01-10 11:00:00	\N	\N	\N	15	TĂNG LỰC-TR-TRANG	07133b25-d559-419c-ae04-ddb4545df960	a5a89433-420a-40dd-801c-b39000b34540	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-12-12 18:08:24.048512	2026-01-10 11:07:50.339169	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e23e4387-dca4-4e48-9436-b3ce0044120e	1	\N	f	\N
b1604f08-8952-4bec-8fd8-b3b20042eeb2	AP195987	2025-12-13 16:00:00	\N	\N	\N	60	Tư vấn niềng răng 	816d038b-856e-4227-9b19-9cac831fe139	c928ee81-c3c1-4f56-9d0c-b3b20042e2db	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	done	\N	\N	f	7	816d038b-856e-4227-9b19-9cac831fe139	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-13 11:03:41.60756	2025-12-17 17:43:24.842846	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	8dd144d6-7c63-49cd-ba06-b3b200945add	1	\N	f	\N
6241b9f2-649b-4c83-a6c0-b3b300660955	AP196620	2025-12-15 10:00:00	\N	\N	\N	60	Tư vấn niềng răng	c0a08fa8-569c-4ac9-9f41-57089701b2f2	79d56f7b-0572-424f-aa97-b3b30065fa75	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	done	\N	\N	f	2	c0a08fa8-569c-4ac9-9f41-57089701b2f2	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-14 13:11:30.202979	2025-12-15 10:25:23.032215	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	1c9ac141-5190-4129-aba1-b3b4003868f0	1	\N	f	\N
2894db7f-220d-4a25-8506-b3b4005291c6	AP197097	2025-12-15 13:00:00	\N	\N	\N	60	Cvr+ GDL + GMC KLTC - Uyên ( đưa HĐ)	47f96103-8fad-4d6e-ba79-9eb01eaa5451	79d56f7b-0572-424f-aa97-b3b30065fa75	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	f	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-15 12:00:37.565924	2025-12-15 13:52:07.699871	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	5db12ad0-3031-4fbb-b5f7-b3b4007131aa	1	\N	f	\N
56ff5e36-2f58-46c1-83a1-b3b500463b2f	AP197469	2025-12-30 11:00:00	\N	\N	\N	60	CHỮA TỦY R47 - Y ko bắt máy	b4ce78f5-c73f-4f36-888a-914287165026	250c1ff6-8b5e-4bc6-9ac3-b3ad007ca9b0	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-16 11:15:42.236934	2026-01-02 12:20:12.893378	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	e28f889c-478d-4edf-8069-b3c30044a4e8	1	\N	f	\N
8cbcc50b-2090-4f43-a728-b3ba004e0157	AP199481	2025-12-27 13:30:00	\N	\N	\N	60	gmc -nga (dg)	b5ebc1bc-f9a0-4923-9253-71a7e688428e	498c13ed-3f68-4c4f-b461-b28b003c173e	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	f	4	b5ebc1bc-f9a0-4923-9253-71a7e688428e	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-12-21 11:44:00.503349	2025-12-27 14:03:00.03369	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	fc893acc-ed5a-4ee3-b023-b3c000742dff	1	\N	f	\N
7b11340c-e16c-482e-a436-b3bd007527cf	AP200814	2026-01-21 14:30:00	\N	\N	\N	30	TĂNG LỰC  - THẢO dg	de5ceb25-27e1-44cd-8529-19cacbbdec40	a7640271-7120-4917-904c-b388003ba146	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	43190b77-570b-4557-b470-b33e00663454	done	\N	\N	f	0	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-12-24 14:06:33.009282	2026-01-21 14:34:31.509319	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	7599154d-384b-4185-bec2-b3d9007cd6af	1	\N	f	\N
5a7ae0a4-e470-42ce-977f-b3c000c8d868	AP202251	2026-01-10 15:20:00	\N	\N	\N	20	NR - NGA (đến 14h45 đợi bác )	de5ceb25-27e1-44cd-8529-19cacbbdec40	498c13ed-3f68-4c4f-b461-b28b003c173e	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	f	5	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-12-27 19:11:15.330476	2026-01-10 14:58:45.581072	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	8e4e7660-330f-4661-86b0-b3ce00837eaa	1	\N	f	\N
abfed2b4-307c-4c75-bb29-b3c3005f54f5	AP203236	2026-01-13 09:00:00	\N	\N	\N	20	TKT - Y	b4ce78f5-c73f-4f36-888a-914287165026	250c1ff6-8b5e-4bc6-9ac3-b3ad007ca9b0	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-30 12:47:05.562112	2026-01-15 16:11:57.192181	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	9fa2f1de-ec18-403b-a75b-b3d10022248d	1	\N	f	\N
b9e93122-4705-4dd7-82af-b3c4002fe487	AP203528	2026-02-03 09:00:00	\N	\N	\N	30	TĂNG LỰC - D--	b85bc72b-ed58-45ff-8b45-35f12a53d409	3dc647ea-698d-4038-94e6-b38a0022baa8	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	t	1	b85bc72b-ed58-45ff-8b45-35f12a53d409	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-31 09:54:22.317936	2026-02-05 10:02:56.397709	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	a9be1a8e-de8b-4dfe-bc7b-b3e6001f886b	1	\N	f	\N
5355152c-d75c-410b-8741-b3ca002c7a4f	AP205624	2026-01-06 14:00:00	\N	\N	\N	60	ktra răng - phụ tá làm xong (nhờ bác ktra )	b5ebc1bc-f9a0-4923-9253-71a7e688428e	498c13ed-3f68-4c4f-b461-b28b003c173e	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	\N	\N	f	5	b5ebc1bc-f9a0-4923-9253-71a7e688428e	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-06 09:41:56.317561	2026-01-06 16:01:54.841669	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	d99aa8f3-103d-427f-9d68-b3ca0094d6f3	1	\N	f	\N
17deeea2-0bd4-4cd3-a9e5-b3ce004eed3f	AP207435	2026-02-10 14:10:00	\N	\N	\N	15	TĂNG LỰC-V-TRANG-TV-LY	07133b25-d559-419c-ae04-ddb4545df960	a5a89433-420a-40dd-801c-b39000b34540	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2026-01-10 11:47:21.808763	2026-02-10 13:40:44.396578	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	ebefc543-0455-4f41-9852-b3ed006e10e9	1	\N	f	\N
be49668a-85ab-42bb-88cf-b3ce008b27da	AP207561	2026-01-29 12:30:00	\N	\N	\N	20	TĂNG LỰC  - NGA dg	de5ceb25-27e1-44cd-8529-19cacbbdec40	498c13ed-3f68-4c4f-b461-b28b003c173e	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	7f9f1030-20ea-4c23-84e6-b16000c1e144	done	bận	\N	t	5	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-10 15:26:39.017316	2026-01-29 13:52:03.973849	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	63fb4512-6149-4ea8-849d-b3e100712d2d	1	\N	f	\N
ee6581ab-d067-424d-8792-b3d00095e8e6	AP208562	2026-01-12 16:30:00	\N	\N	\N	30	Tư vấn niềng răng 	816d038b-856e-4227-9b19-9cac831fe139	b2262736-c7f4-4072-a67f-b3d00095dcf1	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	done	\N	\N	f	2	816d038b-856e-4227-9b19-9cac831fe139	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-12 16:05:48.284233	2026-01-12 16:47:46.932795	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	b30149f9-4244-4fc8-af5e-b3d000a17054	1	\N	f	\N
14572225-a83f-4037-9080-b3d000b8623f	AP208696	2026-01-15 14:00:00	\N	\N	\N	60	gmc - quyên(knm)	de5ceb25-27e1-44cd-8529-19cacbbdec40	b2262736-c7f4-4072-a67f-b3d00095dcf1	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	6ac1a478-0568-4ec6-a3d6-b05b009de13d	done	\N	\N	f	4	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-12 18:11:19.24858	2026-01-15 13:59:07.737904	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	\N	1	\N	f	\N
33ef8e79-4f1e-4059-8327-b3d10089dfe5	AP209028	2026-01-16 13:30:00	\N	\N	\N	15	Tăng lực - Uyên - TTG -	47f96103-8fad-4d6e-ba79-9eb01eaa5451	79d56f7b-0572-424f-aa97-b3b30065fa75	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	f	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2026-01-13 15:21:59.161826	2026-01-16 13:49:13.785027	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	c57d3679-d66c-4f63-897f-b3d4007065d1	1	\N	f	\N
005a11ad-c3fa-49a0-bff2-b3d300c2bce7	AP210080	2026-02-11 13:20:00	\N	\N	\N	10	TL - QUYÊN đg (thu tg trước)	de5ceb25-27e1-44cd-8529-19cacbbdec40	b2262736-c7f4-4072-a67f-b3d00095dcf1	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	6ac1a478-0568-4ec6-a3d6-b05b009de13d	done	\N	\N	f	3	de5ceb25-27e1-44cd-8529-19cacbbdec40	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-15 18:49:01.141499	2026-02-11 13:45:56.853843	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	5fcc238c-1e5f-4eb2-b983-b3ee006f7f11	1	\N	f	\N
adf765c7-2bbf-42d2-8c6d-b3d900a5efa2	AP212589	2026-01-22 10:00:00	\N	\N	\N	60	Tư  vấn niềng răng	c0a08fa8-569c-4ac9-9f41-57089701b2f2	45fe0ac9-60cf-499a-81ed-b3d900a5e292	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	done	\N	\N	f	2	c0a08fa8-569c-4ac9-9f41-57089701b2f2	07133b25-d559-419c-ae04-ddb4545df960	2026-01-21 17:04:09.283147	2026-01-22 09:35:44.247001	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	106e8356-5448-441c-abd4-b3da002ac62a	1	\N	f	\N
118e5f38-c46f-478d-bf68-b3db002caef3	AP213160	2026-01-24 14:00:00	\N	\N	\N	60	GẮN MẮC CÀI-LY-TRANG 	aedc7e28-b6c1-44e0-a895-8524012c03e4	45fe0ac9-60cf-499a-81ed-b3d900a5e292	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	0b8e06d1-d517-4207-a8c0-b1f7002d7476	done	\N	\N	t	4	aedc7e28-b6c1-44e0-a895-8524012c03e4	07133b25-d559-419c-ae04-ddb4545df960	2026-01-23 09:42:41.237864	2026-01-24 14:16:48.31005	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	df1f52e5-4dad-475e-aa1e-b3dc0077f8be	1	\N	f	\N
a42475e9-52b6-4234-86c1-b3db007936dd	AP213308	2026-01-23 17:30:00	\N	\N	\N	30	Tư vấn niềng răng 	816d038b-856e-4227-9b19-9cac831fe139	541bd083-7b08-4b7a-9517-b3db007928c7	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	done	\N	\N	f	2	816d038b-856e-4227-9b19-9cac831fe139	d67346f6-837e-499d-8e8f-0eea533fcd4c	2026-01-23 14:21:19.668777	2026-01-23 18:40:12.28747	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	80f19069-93d7-48c1-b311-b3db00c05108	1	\N	f	\N
330d0954-ae68-410f-a7ee-b3dd008c831f	AP214236	2026-01-27 10:00:00	\N	\N	\N	20	CVRL2-LY-TRANG ( ZALO)	aedc7e28-b6c1-44e0-a895-8524012c03e4	45fe0ac9-60cf-499a-81ed-b3d900a5e292	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	9968161f-e735-448b-9adb-b14f0038c98e	done	\N	\N	t	3	aedc7e28-b6c1-44e0-a895-8524012c03e4	07133b25-d559-419c-ae04-ddb4545df960	2026-01-25 15:31:35.353969	2026-01-27 10:10:25.534542	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	b4641fd1-674e-4097-9577-b3df00344d2a	1	\N	f	\N
bcee18f4-2dd8-4764-9371-b3dd00c2d7cb	AP214408	2026-01-27 17:30:00	\N	\N	\N	60	CVR + trám + GDL + GDL TĐ -Uyên	47f96103-8fad-4d6e-ba79-9eb01eaa5451	541bd083-7b08-4b7a-9517-b3db007928c7	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	f	1	47f96103-8fad-4d6e-ba79-9eb01eaa5451	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2026-01-25 18:49:24.08794	2026-01-27 17:03:59.488695	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	6ae34b4f-db54-46c7-8ca3-b3df00a5e406	1	\N	f	\N
cee9a298-5efd-4433-a7a3-b3e5002739ef	AP217201	2026-02-07 16:15:00	\N	\N	\N	15	TĂNG LỰC-TV-TRANG	aedc7e28-b6c1-44e0-a895-8524012c03e4	a918ec28-0fdd-4671-8744-b38800685e88	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	done	\N	\N	t	3	aedc7e28-b6c1-44e0-a895-8524012c03e4	07133b25-d559-419c-ae04-ddb4545df960	2026-02-02 09:22:49.116523	2026-02-07 16:09:51.678025	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	a0a04e34-8336-435c-95a2-b3ea00970602	1	\N	f	\N
2902066d-bfd8-40cc-99bd-b3e70045fbef	AP218268	2026-02-05 15:00:00	\N	\N	\N	60	tư vấn niềng răng	f228b5c0-e26b-4825-bd80-08393b2a44e7	34f9945d-a2b3-4a7b-bbc5-b3e70045e958	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	done	\N	\N	f	2	f228b5c0-e26b-4825-bd80-08393b2a44e7	14901ece-9fd9-4f5a-8921-423ca8c120dc	2026-02-04 11:14:48.264964	2026-02-05 16:24:34.958577	\N	\N	\N	\N	\N	\N	\N	\N	confirmed	6f105875-7d9f-44ad-8c57-b3e8009b1119	1	\N	f	\N
dabe091b-2559-4a29-b765-b3fb008e0593	AP223319	2026-02-24 17:30:00	\N	\N	\N	30	GMC MỚI- HOÀNG LAN	\N	34f9945d-a2b3-4a7b-bbc5-b3e70045e958	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	done	\N	\N	f	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
3acacb1f-a379-4d04-824d-b3fc0027734a	AP223506	2026-02-25 14:00:00	\N	\N	\N	15	TĂNG LỰC - UYÊN -	\N	79d56f7b-0572-424f-aa97-b3b30065fa75	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	t	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
2589233a-6cb3-40b7-86ff-b405008d0618	AP228047	2026-03-06 17:15:00	\N	\N	\N	45	TĂNG LỰC + GMCHD + Kt răng trám bị nhức - UYÊN ( PHÚC) -	\N	541bd083-7b08-4b7a-9517-b3db007928c7	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	t	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
2938296a-5128-47ae-94ca-b40500a364e5	AP228122	2026-03-08 10:00:00	\N	\N	\N	60	GDLCN + MCKL - PL 	\N	c928ee81-c3c1-4f56-9d0c-b3b20042e2db	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
301c4504-3e9b-456e-bbf8-b4090031c432	AP230057	2026-03-10 13:00:00	\N	\N	\N	5	GMC HD	\N	34f9945d-a2b3-4a7b-bbc5-b3e70045e958	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	done	\N	\N	f	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
88cb3c06-6c30-4db2-bfe7-b40300378061	AP226729	2026-03-11 09:30:00	\N	\N	\N	30	NHỜ BS KTRA R TRÁM BỊ NHỨC NHIỀU - UYÊN 	\N	fd51b881-a221-4469-9c28-b37800215caa	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	done	\N	\N	t	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
b685f177-1d28-442d-853b-b40900b0e789	AP230469	2026-03-11 18:00:00	\N	\N	\N	60	CDC  - PL  	\N	c928ee81-c3c1-4f56-9d0c-b3b20042e2db	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	done	\N	\N	f	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
95651a3a-2d01-4768-96ef-b4040055f0d1	AP227383	2026-03-12 13:00:00	\N	\N	\N	30	GMC 1 SỔ HT-TH-TRANG	\N	45fe0ac9-60cf-499a-81ed-b3d900a5e292	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	0b8e06d1-d517-4207-a8c0-b1f7002d7476	done	\N	\N	t	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
56cec849-dd8f-4b4b-982d-b40c00569757	AP231904	2026-03-13 13:00:00	\N	\N	\N	15	GMCR - UYÊN	\N	541bd083-7b08-4b7a-9517-b3db007928c7	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	done	\N	\N	t	6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
b3a410ad-5051-4839-8518-b412004b9f6b	AP235011	2026-03-19 17:40:00	\N	\N	\N	10	KIỂM TRA RĂNG BỊ ĐAU - PL	\N	c928ee81-c3c1-4f56-9d0c-b3b20042e2db	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	done	\N	\N	f	7	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
0455be7a-bfd6-477f-9be2-b413008d3eb3	AP235538	2026-03-20 17:00:00	\N	\N	\N	10	smc- NGA 	\N	498c13ed-3f68-4c4f-b461-b28b003c173e	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	done	\N	\N	f	6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
c80f0337-5cc8-491a-8506-b412007c621d	AP235101	2026-03-23 18:00:00	\N	\N	\N	10	TĂNG LỰC - QUYÊN (thu tg trước) (knm)	\N	b2262736-c7f4-4072-a67f-b3d00095dcf1	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	6ac1a478-0568-4ec6-a3d6-b05b009de13d	done	\N	\N	f	3	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
1491ca3e-3492-4aca-89a1-6c8103bfbe23	Lịch sáng 8h	2026-04-07 08:00:00	08:00	2026-04-07 08:00:00	\N	45	\N	\N	1e9d5389-810b-436c-8dbb-b0310021f217	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	confirmed	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
0aba1eba-57bb-4aac-b6f2-ca9f0a8f3ca0	Lịch 9h	2026-04-07 09:00:00	09:00	2026-04-07 09:00:00	\N	60	\N	\N	e9fd09c2-e3be-4c59-88e0-b1030040130f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	afde36ab-1eca-4281-b8e4-b1930033a9c6	arrived	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
3af20ccc-5f50-4840-8cac-b9d847a16b63	Lịch 10h nhổ	2026-04-07 10:00:00	10:00	2026-04-07 10:00:00	\N	90	Nhổ răng khôn	\N	a62414fe-b577-41a2-84d1-b14d008dc0c5	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	b41477e0-8eed-4520-a41a-b145008c51b0	done	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
c674827a-bb00-48a2-8b4d-5d4fb62ab1ee	Lịch 11h	2026-04-07 11:00:00	11:00	2026-04-07 11:00:00	\N	30	\N	\N	140d4c43-227b-4a1f-93e7-b17400aa26b1	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	0b8e06d1-d517-4207-a8c0-b1f7002d7476	confirmed	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
523490a3-ef11-404a-8ff3-f04c10e0b842	Lịch 8h30	2026-04-07 08:30:00	08:30	2026-04-07 08:30:00	\N	60	Tẩy trắng	\N	e2972973-56ed-4b6e-a411-b1760022319c	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	arrived	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
e96ae487-5f3a-484d-a017-779673980133	Lịch 10h	2026-04-07 10:00:00	10:00	2026-04-07 10:00:00	\N	45	\N	\N	e9fd09c2-e3be-4c59-88e0-b1030040130f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	dbefd061-dbb0-44d7-8eed-afe3007a8017	confirmed	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
5a6da6ff-1dff-45f5-94be-adbe02967de7	Lịch 9h	2026-04-07 09:00:00	09:00	2026-04-07 09:00:00	\N	60	\N	\N	140d4c43-227b-4a1f-93e7-b17400aa26b1	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	confirmed	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
a2d59849-a3cd-421e-ae2d-dd4eea87fa0c	Lịch 10h30 hủy	2026-04-07 10:30:00	10:30	2026-04-07 10:30:00	\N	45	Khách hủy	\N	a62414fe-b577-41a2-84d1-b14d008dc0c5	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	494dd94b-0f5c-4037-a183-b2d5004495bc	cancelled	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
d01f2caa-2301-4e18-98c9-93d5ac6729b6	Lịch 8h	2026-04-07 08:00:00	08:00	2026-04-07 08:00:00	\N	60	Niềng răng check	\N	1e9d5389-810b-436c-8dbb-b0310021f217	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	arrived	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
92da01c6-d5b3-4276-b6f1-9e27e6097e61	Lịch 10h	2026-04-07 10:00:00	10:00	2026-04-07 10:00:00	\N	45	\N	\N	e9fd09c2-e3be-4c59-88e0-b1030040130f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	in-progress	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
57c4b0e3-9c0e-4311-a7eb-88bcb0de1b06	Lịch 8h30	2026-04-07 08:30:00	08:30	2026-04-07 08:30:00	\N	60	\N	\N	a62414fe-b577-41a2-84d1-b14d008dc0c5	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	90e19070-f750-415b-ba52-b05f002e9438	arrived	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
e3a441c6-7b7c-4fb6-8805-6e3a667457f7	Lịch 11h	2026-04-07 11:00:00	11:00	2026-04-07 11:00:00	\N	120	Bọc răng sứ	\N	e2972973-56ed-4b6e-a411-b1760022319c	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	90e19070-f750-415b-ba52-b05f002e9438	confirmed	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:03:05.764834	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N
b4cee5e1-b41c-4b4e-a226-37f6e4a49725	Lịch 14h	2026-04-07 14:00:00	14:00	2026-04-07 14:00:00	\N	30	Trám răng	\N	1e9d5389-810b-436c-8dbb-b0310021f217	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	21360b9b-8e24-46e1-83a3-b1ef009a1911	in Examination	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:45:34.159705	\N	\N	\N	\N	\N	\N	\N	\N	in Examination	\N	\N	\N	f	\N
ec7fc6db-8e2b-4449-a639-b222b4f65ead	Lịch 13h	2026-04-07 13:00:00	13:00	2026-04-07 13:00:00	\N	60	\N	\N	e2972973-56ed-4b6e-a411-b1760022319c	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	cab2a199-ae6f-4746-8d8f-b3690092e93c	done	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:45:36.728203	\N	\N	\N	\N	\N	\N	\N	\N	done	\N	\N	\N	f	\N
52eb878e-9ac8-432e-8ecc-5ce96d45316a	Lịch 14h	2026-04-07 14:00:00	14:00	2026-04-07 14:00:00	\N	30	Lấy cao răng	\N	140d4c43-227b-4a1f-93e7-b17400aa26b1	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	c48e8550-f68f-4be5-89bb-b2110032b4e1	arrived	\N	\N	f	\N	\N	\N	2026-04-07 14:03:05.764834	2026-04-07 14:45:49.61827	\N	\N	\N	\N	\N	\N	\N	\N	arrived	\N	\N	\N	f	\N
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.companies (id, name, partnerid, email, phone, periodlockdate, accountincomeid, accountexpenseid, logo, active, reportheader, reportfooter, notallowexportinventorynegative, medicalfacilitycode, createdbyid, writebyid, datecreated, lastupdated, isuppercasepartnername, ishead, paymentsmsvalidation, paymentsmsvalidationtemplateid, currencyid, isconnectconfigmedicalprescription, taxbankaccount, taxbankname, taxcode, taxphone, taxunitaddress, taxunitname, einvoiceaccountid, einvoicetemplateid, defaulthouseholdid, revenueinvisibledate, parentid, parentpath) FROM stdin;
c6b4b453-d260-46d4-4fd9-08db24f7ae8e	Tấm Dentist Quận 3	21734bc3-68ae-40f3-91a4-afc7006cf314	tamdentist.vn@gmail.com	096 608 06 38	\N	862e78e4-b4c2-45ec-ab7c-afe30052aac3	bd15d90d-df1c-4656-9bdb-afe30052aac3	https://img.tpos.vn/Lkyt5MQ0pgKGfwEJVo7Fp5T-fvdGE0PD-XwgDzirDGc/rs::::1/g:no/plain/tdental/tamdentist/07082023/LOGO%20DENTIST-01.png	t	\N	\N	f	\N	\N	103b375f-236c-4b62-896d-0a1879e8e65e	2023-03-16 13:36:40.62075	2026-01-28 10:57:48.624774	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	C6B4B453-D260-46D4-4FD9-08DB24F7AE8E/
b178d5ee-d9ac-477e-088e-08db9a4c4cf4	Tấm Dentist Thủ Đức	359155c1-89a4-4edc-95db-b05b009a2149	\N	0902501001	\N	\N	\N	https://img.tpos.vn/ZElELEdi0zr4v6oegeOKf25aQWHMFHfMpBTxV2ubBOY/rs::::1/g:no/plain/tdental/tamdentist/15082023/z4605012910184_42fe9f1e023d3bb313c6cf3007df783e.jpg	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	de5ceb25-27e1-44cd-8529-19cacbbdec40	2023-08-11 16:21:10.225851	2025-12-27 11:45:44.980394	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	B178D5EE-D9AC-477E-088E-08DB9A4C4CF4/
765f6593-2b19-4d06-cc8c-08dc4d479451	Tấm Dentist Gò Vấp	86d44007-e3a8-4f4d-a51d-b13f003eb759	\N	0966 080 638	\N	\N	\N	\N	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	816d038b-856e-4227-9b19-9cac831fe139	2024-03-26 10:48:20.584095	2026-02-20 09:48:41.187156	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	765F6593-2B19-4D06-CC8C-08DC4D479451/
cad65000-6ff3-47c7-cc8d-08dc4d479451	Tấm Dentist Đống Đa	d73c7cd6-7be4-4356-b2b6-b13f003ed8a4	\N	0966 080 638	\N	\N	\N	\N	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-03-26 10:48:48.980643	2025-10-22 18:00:49.799352	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6861c928-0e13-4664-c781-08dcdfa45074	Tấm Dentist Quận 7	cc59d7c8-3ec4-4a2c-90a3-b1f900a4cb11	\N	0926563968	\N	\N	\N	\N	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	816d038b-856e-4227-9b19-9cac831fe139	2024-09-28 16:59:59.707667	2026-02-20 08:47:16.310692	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6861C928-0E13-4664-C781-08DCDFA45074/
f0f6361e-b99d-4ac7-4108-08dd8159c64a	Tấm Dentist Quận 10	542d9beb-ab18-4670-980e-b2c70050e717	\N	0977041698	\N	\N	\N	\N	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	cf98dcf5-0e49-46c5-8fdb-0a56317281b8	2025-04-22 11:54:33.510385	2026-02-14 22:21:17.365132	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	F0F6361E-B99D-4AC7-4108-08DD8159C64A/
dde8b85e-e35a-41fa-4a6b-08de107d59ec	Nha khoa Tấm Dentist	499921f5-e290-42a3-8c2c-b37d008eaf2a	\N	\N	\N	\N	\N	\N	t	\N	\N	f	\N	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2025-10-21 15:39:29.867429	2025-10-21 15:39:31.075716	f	f	f	\N	89cf28e3-0f59-4fe7-c6ea-08dd9ffa7fb5	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: employee_location_scope; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.employee_location_scope (id, employee_id, location_id) FROM stdin;
d78dde6a-571f-449c-9c1f-0e18ced0c606	b41477e0-8eed-4520-a41a-b145008c51b0	765f6593-2b19-4d06-cc8c-08dc4d479451
3ea29218-125a-4da0-8ccb-4425a004361e	0b8e06d1-d517-4207-a8c0-b1f7002d7476	765f6593-2b19-4d06-cc8c-08dc4d479451
2af5cd48-a880-4a74-b989-766cb30070ff	9968161f-e735-448b-9adb-b14f0038c98e	765f6593-2b19-4d06-cc8c-08dc4d479451
53b8b171-fc3d-4444-a13e-5451ffe67b17	cab2a199-ae6f-4746-8d8f-b3690092e93c	f0f6361e-b99d-4ac7-4108-08dd8159c64a
94a5418a-bcf4-45a7-aa12-9d65f92507cf	494dd94b-0f5c-4037-a183-b2d5004495bc	f0f6361e-b99d-4ac7-4108-08dd8159c64a
04968ae5-f07b-42b8-bac0-ecb9245da0fc	21360b9b-8e24-46e1-83a3-b1ef009a1911	c6b4b453-d260-46d4-4fd9-08db24f7ae8e
68b22f02-d7ab-4135-8056-4e35d6bd0be8	dbefd061-dbb0-44d7-8eed-afe3007a8017	c6b4b453-d260-46d4-4fd9-08db24f7ae8e
8d0d40ef-e1cf-474b-a7b1-fd6f27e03513	90e19070-f750-415b-ba52-b05f002e9438	c6b4b453-d260-46d4-4fd9-08db24f7ae8e
115e6662-73a6-48e2-85e1-30bb98d0ea85	c48e8550-f68f-4be5-89bb-b2110032b4e1	6861c928-0e13-4664-c781-08dcdfa45074
b6f8d542-8d0d-4794-adf4-99f77b9a89dc	7f9f1030-20ea-4c23-84e6-b16000c1e144	b178d5ee-d9ac-477e-088e-08db9a4c4cf4
d41c8a25-7307-4419-b28d-30710dced8c9	43190b77-570b-4557-b470-b33e00663454	b178d5ee-d9ac-477e-088e-08db9a4c4cf4
e2ec81a6-bab0-460a-949b-24d217286eac	6ac1a478-0568-4ec6-a3d6-b05b009de13d	b178d5ee-d9ac-477e-088e-08db9a4c4cf4
640500e7-5b29-4637-9f1f-e61d05d94dc0	ed346f4b-c27b-428f-8e46-b05b009de13d	b178d5ee-d9ac-477e-088e-08db9a4c4cf4
a865a92d-a926-4f77-816c-235e0a0da9c0	f03fce3f-d90e-4194-a28f-b1d400752590	cad65000-6ff3-47c7-cc8d-08dc4d479451
05e8c81c-d765-4b2b-86ab-46d342610f3d	fd67fda4-42ea-4f85-b100-b14c0090e6e4	cad65000-6ff3-47c7-cc8d-08dc4d479451
d89155f2-3ae8-417e-abe0-e6dc815fcb9f	3c2a3bda-879f-48b7-8ee4-b266004978ea	cad65000-6ff3-47c7-cc8d-08dc4d479451
35637a57-79bd-4699-8212-f19113460818	a3a0e8dc-6b40-468f-803b-b1cf0063ad84	cad65000-6ff3-47c7-cc8d-08dc4d479451
7e218683-7ba5-4c15-8d2f-cd4092f284a0	f1abd11e-6309-4b5b-add9-b14c0090f199	cad65000-6ff3-47c7-cc8d-08dc4d479451
d8829606-b591-417a-aced-942cbb60a37e	afde36ab-1eca-4281-b8e4-b1930033a9c6	765f6593-2b19-4d06-cc8c-08dc4d479451
a31527b2-d60a-44d0-9b86-5c236548d60e	28e2c9eb-d410-4881-9cf2-efb2494baad7	c6b4b453-d260-46d4-4fd9-08db24f7ae8e
a21468b5-4e5e-4026-8f9d-c8ecf5ede509	28e2c9eb-d410-4881-9cf2-efb2494baad7	b178d5ee-d9ac-477e-088e-08db9a4c4cf4
f8d8a35e-37f0-4840-9d17-654b405ca055	28e2c9eb-d410-4881-9cf2-efb2494baad7	765f6593-2b19-4d06-cc8c-08dc4d479451
0d91a1f7-416e-4961-af04-3d482de73eff	28e2c9eb-d410-4881-9cf2-efb2494baad7	cad65000-6ff3-47c7-cc8d-08dc4d479451
a5a5b1ab-bc10-4cd5-a653-2020fdaede48	28e2c9eb-d410-4881-9cf2-efb2494baad7	6861c928-0e13-4664-c781-08dcdfa45074
3436b3d1-0ec1-426a-b47e-d8476a084934	28e2c9eb-d410-4881-9cf2-efb2494baad7	f0f6361e-b99d-4ac7-4108-08dd8159c64a
7a4344f1-51d7-4736-88ea-358e0337943e	28e2c9eb-d410-4881-9cf2-efb2494baad7	dde8b85e-e35a-41fa-4a6b-08de107d59ec
\.


--
-- Data for Name: employee_permissions; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.employee_permissions (id, employee_id, group_id, loc_scope, datecreated, lastupdated) FROM stdin;
125b4c34-1993-4675-a1e6-848a1c8fc872	b41477e0-8eed-4520-a41a-b145008c51b0	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
14b0d63f-71ed-47eb-8e0e-ee5242d4eb85	0b8e06d1-d517-4207-a8c0-b1f7002d7476	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
5df6a781-8f85-41c0-a445-552f8ca21434	9968161f-e735-448b-9adb-b14f0038c98e	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
824d9ea4-9dbd-4547-900f-f662d465ec03	cab2a199-ae6f-4746-8d8f-b3690092e93c	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
d273a0d8-6209-4bc8-9f6b-338011b23fd0	494dd94b-0f5c-4037-a183-b2d5004495bc	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
d68217a8-753f-4e1f-a228-2870275ac034	21360b9b-8e24-46e1-83a3-b1ef009a1911	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
7f8e0b9d-192b-422c-9870-c72e09de8712	dbefd061-dbb0-44d7-8eed-afe3007a8017	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
3a978f21-1ca4-4a4a-bf50-13d3dba24386	90e19070-f750-415b-ba52-b05f002e9438	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
abc7de9a-20e7-4a5d-8ba6-128da56e9e24	c48e8550-f68f-4be5-89bb-b2110032b4e1	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
4b642654-01e8-4083-943e-5040efb722ac	7f9f1030-20ea-4c23-84e6-b16000c1e144	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
4c906db7-7ddc-48c3-8dbb-4ac974f80199	43190b77-570b-4557-b470-b33e00663454	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
ee59e245-f5a3-4e8e-9d85-48a166f9bb9e	6ac1a478-0568-4ec6-a3d6-b05b009de13d	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
1a014a24-4d36-4b28-99c1-40d74e8caff5	ed346f4b-c27b-428f-8e46-b05b009de13d	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
598f3111-0590-4d97-8e78-896e8e5c3be6	f03fce3f-d90e-4194-a28f-b1d400752590	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
a45ce062-6e39-49bc-8816-b3c590bd82cf	fd67fda4-42ea-4f85-b100-b14c0090e6e4	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
5098fe4e-b848-4092-b728-8f1f65b5420a	3c2a3bda-879f-48b7-8ee4-b266004978ea	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
441392a5-2b14-4ea7-b720-a84f9d41debd	a3a0e8dc-6b40-468f-803b-b1cf0063ad84	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
0685e8f9-973f-44dd-a2af-283b90cefe29	f1abd11e-6309-4b5b-add9-b14c0090f199	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 13:59:19.410765
4838654a-25ba-4083-a329-e5defe3c05a1	afde36ab-1eca-4281-b8e4-b1930033a9c6	11111111-0000-0000-0000-000000000003	assigned	2026-04-07 13:59:19.410765	2026-04-07 14:00:40.45315
25994c08-fae4-4eef-8cad-a53ecdad48cc	28e2c9eb-d410-4881-9cf2-efb2494baad7	11111111-0000-0000-0000-000000000001	all	2026-04-07 14:44:42.162171	2026-04-07 14:44:42.162171
\.


--
-- Data for Name: group_permissions; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.group_permissions (id, group_id, permission) FROM stdin;
feb42be5-7ad0-4d13-b551-451055431b0d	11111111-0000-0000-0000-000000000001	overview.view
a070e6e6-0d5c-42bf-b6d6-ea30bd89f762	11111111-0000-0000-0000-000000000001	calendar.view
e338501c-53b4-4db6-8348-b1bdaffe9547	11111111-0000-0000-0000-000000000001	calendar.edit
0553d6a6-2c4e-4b44-bf8b-56a2a6c4ad73	11111111-0000-0000-0000-000000000001	customers.view
a1b2c3d4-e5f6-7890-abcd-ef1234567890	11111111-0000-0000-0000-000000000001	customers.view.all
4590ae3e-2675-4c41-8512-930fb1ad0d41	11111111-0000-0000-0000-000000000001	customers.add
bfc90eb4-125e-4778-a1f4-75cc2e26faa6	11111111-0000-0000-0000-000000000001	customers.edit
6ac434ab-cf61-41bc-81aa-82721c5c6d7f	11111111-0000-0000-0000-000000000001	customers.delete
d091498b-0fca-4518-8fb1-9736dfebe9d8	11111111-0000-0000-0000-000000000001	appointments.view
12a02f84-e9c9-48d0-994c-b41682a8bcf3	11111111-0000-0000-0000-000000000001	appointments.add
210bbff0-3139-4591-ae5a-accdc1c17afc	11111111-0000-0000-0000-000000000001	appointments.edit
8aa13877-c00f-42f2-a303-7a0a20c27679	11111111-0000-0000-0000-000000000001	services.view
466e26ee-1052-43ce-8cff-4e82014125ee	11111111-0000-0000-0000-000000000001	services.add
84e53331-7552-40b3-bc12-ef672b33cc03	11111111-0000-0000-0000-000000000001	services.edit
942e591d-0f03-4e6a-9f36-255e6b0660ad	11111111-0000-0000-0000-000000000001	payment.view
398344b2-68f1-4853-b97f-389158715284	11111111-0000-0000-0000-000000000001	payment.add
56c0678d-6fce-4480-b727-6da59eafc5ef	11111111-0000-0000-0000-000000000001	payment.edit
ee0dcd2f-44c3-4ca2-bd5d-6db9de624272	11111111-0000-0000-0000-000000000001	payment.refund
7c016126-90bb-41af-89dc-43c02b27c093	11111111-0000-0000-0000-000000000001	employees.view
3f6a7fa0-355c-4f14-8d37-888150396446	11111111-0000-0000-0000-000000000001	employees.add
42ac111e-4c92-49b3-a98a-8836d751595f	11111111-0000-0000-0000-000000000001	employees.edit
19607b98-8f92-480e-8d9f-85408c74d7b3	11111111-0000-0000-0000-000000000001	locations.view
79dfd37c-0efa-4ecc-ae4c-e4eba9795df7	11111111-0000-0000-0000-000000000001	locations.add
7c67e641-e133-4446-bb09-9a6d9ad84023	11111111-0000-0000-0000-000000000001	locations.edit
f60b367f-3709-4a85-9d3e-14036a18a5db	11111111-0000-0000-0000-000000000001	reports.view
c2bad0a4-c3f7-4bb2-8bac-50ce63f6d04e	11111111-0000-0000-0000-000000000001	reports.export
31287524-8004-4a5b-8101-bd8d0eff5125	11111111-0000-0000-0000-000000000001	commission.view
b9c6e5a8-d212-44a2-8d89-9931c1e6b82a	11111111-0000-0000-0000-000000000001	commission.edit
7f176eb1-8ca6-4499-91d7-fda90d2f8668	11111111-0000-0000-0000-000000000001	settings.view
9f193d9d-3460-466c-ac70-110b7c8f82a5	11111111-0000-0000-0000-000000000001	settings.edit
356a5bf3-8ba1-4fb6-9b38-8e39915b1774	11111111-0000-0000-0000-000000000001	notifications.view
0f83eead-a267-47c5-ab20-a683577ec6c9	11111111-0000-0000-0000-000000000001	notifications.edit
2aeb399c-f5d9-4174-bf9c-14f86f764038	11111111-0000-0000-0000-000000000003	overview.view
6164bd5a-e55e-41c2-bcdb-f033c76517dc	11111111-0000-0000-0000-000000000003	calendar.view
2a5c31e1-0259-4206-bede-c1f1f052ed18	11111111-0000-0000-0000-000000000003	calendar.edit
e1b5f724-d28f-453a-ac4b-9a3dd4d6626f	11111111-0000-0000-0000-000000000003	customers.view
a26e66df-11ff-4ecd-9781-f392a4f2862c	11111111-0000-0000-0000-000000000003	appointments.view
3aeced02-800f-4215-bb56-28574c7b1d7e	11111111-0000-0000-0000-000000000003	appointments.add
05f68a67-cb86-4688-8276-3283fe35edfc	11111111-0000-0000-0000-000000000003	appointments.edit
00d6b5d6-0f54-4ef9-9695-786ef9935711	11111111-0000-0000-0000-000000000003	services.view
32f9d3d1-b4e3-4a65-ac77-a5c29118fc53	11111111-0000-0000-0000-000000000003	commission.view
96e37db8-412b-4959-929f-3abfd4a60aa9	11111111-0000-0000-0000-000000000005	overview.view
c2122723-b5d6-4fd3-9164-1b6999faed29	11111111-0000-0000-0000-000000000005	calendar.view
557732ca-08b2-4f69-9c31-49228d104fe9	11111111-0000-0000-0000-000000000005	customers.view
dd9cef64-ed37-4c1e-a676-e35bd5ef6608	11111111-0000-0000-0000-000000000005	appointments.view
e16a184d-433c-4a65-94a9-fb5982db6306	11111111-0000-0000-0000-000000000005	services.view
8bb41bd6-ebc6-4ad5-b6df-d390cc00500c	11111111-0000-0000-0000-000000000005	notifications.view
e164fded-ef5f-4963-9123-24569fd27acd	11111111-0000-0000-0000-000000000002	appointments.add
45d8b7a9-4c49-4a26-8ce5-892362b743ad	11111111-0000-0000-0000-000000000002	appointments.edit
60487310-a36d-4043-8823-609f83b25390	11111111-0000-0000-0000-000000000002	appointments.view
6629e461-761f-4f9d-9a83-6332c4739ec6	11111111-0000-0000-0000-000000000002	calendar.edit
6c163884-0011-408f-bdd0-8854169f7251	11111111-0000-0000-0000-000000000002	calendar.view
4206cff5-5bfb-4a21-b1db-231fb5da2b05	11111111-0000-0000-0000-000000000002	commission.edit
04c36c7d-f7d5-4ea9-a423-7c79315fe935	11111111-0000-0000-0000-000000000002	commission.view
8106b3c4-4c4e-475c-8c93-57c004791908	11111111-0000-0000-0000-000000000002	customers.add
036b837d-b82b-4be2-9c1d-f6d2ecd93575	11111111-0000-0000-0000-000000000002	customers.edit
1e56a01b-e4a9-465a-b573-ee9ecb7fcf14	11111111-0000-0000-0000-000000000002	customers.view
29c50b96-b24a-4b0e-afb3-0fdf64db9c61	11111111-0000-0000-0000-000000000002	employees.add
76a2118a-6ac9-4965-b995-e63589f5d1f9	11111111-0000-0000-0000-000000000002	employees.edit
40ca4195-4207-472f-8e15-8b21e51353c8	11111111-0000-0000-0000-000000000002	employees.view
0fa49d5d-db5e-49e9-91d7-9926892ef71d	11111111-0000-0000-0000-000000000002	locations.view
02ef6979-45c6-4581-8863-b68c596bf952	11111111-0000-0000-0000-000000000002	notifications.edit
7e65b568-b902-4fdf-93b1-ae1c893956f1	11111111-0000-0000-0000-000000000002	notifications.view
ed6e1a1b-5537-4672-923d-06c4aad4294d	11111111-0000-0000-0000-000000000002	payment.add
9aaacc01-dbde-460b-a3c7-ad147583839b	11111111-0000-0000-0000-000000000002	payment.edit
2303e6e1-1e26-45c4-b0f0-48313d485f06	11111111-0000-0000-0000-000000000002	payment.view
0972f7f6-8000-4aba-a72b-d86e5e6ff599	11111111-0000-0000-0000-000000000002	reports.export
f8b86b41-fb88-44ab-babe-3b52e491f6be	11111111-0000-0000-0000-000000000002	reports.view
5f5f7a19-cd74-49b3-a1f7-08163e422b07	11111111-0000-0000-0000-000000000002	services.add
4984e615-75a0-4750-a7a8-ba8e4d057377	11111111-0000-0000-0000-000000000002	services.edit
4f486ca0-ce46-4d0a-ab24-3c4ac00f7d49	11111111-0000-0000-0000-000000000002	services.view
b3d11958-3bcc-4081-b4bc-46b878d2d0dd	11111111-0000-0000-0000-000000000002	settings.view
5ddadcb8-d72f-43a3-9e10-b86d4d5d2fc4	11111111-0000-0000-0000-000000000002	overview.view
3f80e382-7f45-4723-ade7-9015cb8ffd96	11111111-0000-0000-0000-000000000004	appointments.add
7ef67fc6-e563-4bd0-bbff-b9c4dd3154ea	11111111-0000-0000-0000-000000000004	appointments.edit
42d26e41-558f-4cd2-b26b-1fbebb86b958	11111111-0000-0000-0000-000000000004	appointments.view
648475fe-b38d-44c8-b703-8efd38b679c6	11111111-0000-0000-0000-000000000004	calendar.edit
4d3b9da0-224e-4067-b767-b25d71e0bea8	11111111-0000-0000-0000-000000000004	calendar.view
40d72607-0982-49e0-87dd-731f2614721e	11111111-0000-0000-0000-000000000004	customers.add
6e13ad35-ac9a-44ef-a3b8-151702693de3	11111111-0000-0000-0000-000000000004	customers.edit
a80cf66d-2212-46c8-a4a5-368cd4008605	11111111-0000-0000-0000-000000000004	customers.view
e5a315d3-3ec3-4b3a-8919-274d0067d583	11111111-0000-0000-0000-000000000004	payment.add
7a34cbaf-3986-4af7-b413-fe0224c3d1bb	11111111-0000-0000-0000-000000000004	payment.edit
26961e66-6a05-418a-9068-03192ec13f8b	11111111-0000-0000-0000-000000000004	payment.view
661070e0-9f02-4cda-b498-547be7a27515	11111111-0000-0000-0000-000000000004	overview.view
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.partners (id, displayname, name, namenosign, street, phone, email, supplier, customer, isagent, isinsurance, companyid, ref, comment, active, employee, gender, jobtitle, birthyear, birthmonth, birthday, medicalhistory, citycode, cityname, districtcode, districtname, wardcode, wardname, barcode, fax, sourceid, referraluserid, note, avatar, zaloid, date, titleid, agentid, weight, healthinsurancecardnumber, calendarlastnotifack, createdbyid, writebyid, datecreated, lastupdated, iscompany, ishead, hotline, website, countryid, stateid, type, userid, stageid, sequencenumber, sequenceprefix, birthdaycustomerstate, customerthankstate, emergencyphone, lasttreatmentcompletedate, treatmentstatus, taxcode, unitaddress, unitname, customername, invoicereceivingmethod, isbusinessinvoice, personaladdress, personalname, receiveremail, receiverzalonumber, personalidentitycard, personaltaxcode, citycodev2, citynamev2, identitynumber, usedaddressv2, wardcodev2, wardnamev2, age, contactstatusid, customerstatus, marketingstaffid, potentiallevel, marketingteamid, saleteamid, isdeleted, password_hash, last_login) FROM stdin;
1e9d5389-810b-436c-8dbb-b0310021f217	[T0963] PHẠM NGUYỄN MINH HIẾU 	PHẠM NGUYỄN MINH HIẾU 	PHAM NGUYEN MINH HIEU 	\N	0563757416	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T0963	\N	t	f	male	\N	1998	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2023-06-30 09:03:35.545583	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	661769c7-fe5d-4de0-97b3-12d129198ccc	2023-06-30 09:03:35.545585	2023-07-10 16:18:27.264405	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	28	\N	\N	\N	\N	\N	\N	f	\N	\N
e9fd09c2-e3be-4c59-88e0-b1030040130f	[T4944] Nguyễn Thị Thanh	Nguyễn Thị Thanh	Nguyen Thi Thanh	\N	0908177761	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T4944	\N	t	f	female	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2024-01-26 00:00:00	\N	\N	\N	\N	2024-01-26 10:53:17.275413	8a553679-4de6-496c-8cf3-a25b09f124b4	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-01-26 10:53:17.275415	2024-10-01 17:53:52.536776	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	4944	T	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
a62414fe-b577-41a2-84d1-b14d008dc0c5	[T6771] NGUYỄN THỊ UYÊN	NGUYỄN THỊ UYÊN	NGUYEN THI UYEN	\N	0843656412	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T6771	Tư vấn niềng răng 	t	f	female	DungBtt	2002	5	24	\N	74	Tỉnh Bình Dương	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-04-09 00:00:00	096ad7ef-bbf1-4a2e-ae77-afe30052abca	\N	\N	\N	2024-04-09 15:36:06.413583	816d038b-856e-4227-9b19-9cac831fe139	aedc7e28-b6c1-44e0-a895-8524012c03e4	2024-04-09 15:36:06.413585	2024-04-10 20:36:30.672043	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	24	\N	\N	\N	\N	\N	\N	f	\N	\N
140d4c43-227b-4a1f-93e7-b17400aa26b1	[T8126] Vũ Hữu Đạt	Vũ Hữu Đạt	Vu Huu Dat	\N	0388682636	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T8126	Tư vấn niềng răng 	t	f	male	nhunght	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-05-18 00:00:00	\N	\N	\N	\N	2024-05-18 17:19:30.082489	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	2024-05-18 17:19:30.082492	2024-05-18 17:19:30.082493	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
e2972973-56ed-4b6e-a411-b1760022319c	[T8160] Đặng Thị Hồng Thúy	Đặng Thị Hồng Thúy	Dang Thi Hong Thuy	\N	0977407980	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T8160	Sdt khác: 0376097208	t	f	female	\N	1964	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2024-05-20 00:00:00	\N	\N	\N	\N	2024-05-20 09:04:29.747179	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-05-20 09:04:29.747182	2024-05-25 09:32:22.812513	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	62	\N	\N	\N	\N	\N	\N	f	\N	\N
80953c05-6320-4feb-b31e-b1ce00c73f79	[T11028] Nguyễn Thị Nguyệt	Nguyễn Thị Nguyệt	Nguyen Thi Nguyet	\N	0912866856	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T11028	\N	t	f	female	\N	1964	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2024-08-16 00:00:00	\N	\N	\N	\N	2024-08-16 19:05:26.372874	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-16 19:05:26.372876	2024-08-19 12:20:53.239594	f	f	\N	\N	\N	\N	contact	\N	\N	11028	T	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	62	\N	\N	\N	\N	\N	\N	f	\N	\N
7f38b288-2f0f-4caa-81ac-b217003b3c31	[T042342] NGUYỄN THỊ NHƯ NGỌC	NGUYỄN THỊ NHƯ NGỌC	NGUYEN THI NHU NGOC	\N	0387606489	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T042342	Tư vấn răng sứ 	t	f	female	DungBtt	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-10-28 00:00:00	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2024-10-28 10:35:40.110442	816d038b-856e-4227-9b19-9cac831fe139	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	2024-10-28 10:35:40.110447	2024-10-28 19:44:09.662922	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	42342	T	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
c977958d-09c6-4067-8f4d-b24c00353bcf	[T043901] Nguyễn Lan Phương (Lucy Phương Nguyễn)	Nguyễn Lan Phương (Lucy Phương Nguyễn)	Nguyen Lan Phuong (Lucy Phuong Nguyen)	\N	0973035522	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T043901	\N	t	f	female	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-20 00:00:00	\N	\N	\N	\N	2024-12-20 10:13:49.062602	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-12-20 10:13:49.062606	2025-03-18 17:19:19.876534	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	43901	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
2da1bae8-d8e2-4a85-9da8-b25f0077382c	[T044356] LÊ HỒNG KHANH	LÊ HỒNG KHANH	LE HONG KHANH	\N	0902493006	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T044356	\N	t	f	male	\N	1997	12	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-01-08 00:00:00	\N	\N	\N	\N	2025-01-08 14:14:03.880661	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-08 14:14:03.880663	2025-01-13 15:53:35.117348	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	44356	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	29	\N	\N	\N	\N	\N	\N	f	\N	\N
498c13ed-3f68-4c4f-b461-b28b003c173e	[T045826] Trần Ngọc Kim Tỷ	Trần Ngọc Kim Tỷ	Tran Ngoc Kim Ty	\N	0938256419	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T045826	\N	t	f	female	TrangTL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-02-21 00:00:00	\N	\N	\N	\N	2025-02-21 10:38:47.033159	343de624-f1f6-467f-8bb7-3960d50f868a	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-02-21 10:38:47.033162	2025-12-27 19:19:36.599451	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	45826	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
0958759d-2985-4323-8807-b2e8007b4e9d	[T049475] Ngô Trí Nguyên 	Ngô Trí Nguyên 	Ngo Tri Nguyen 	\N	0933449696	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T049475	\N	t	f	male	\N	2018	12	22	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-05-25 00:00:00	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2025-05-25 14:28:56.840856	34faeb06-ee46-4277-bb29-544c49a99771	519b9e4b-9949-4422-bacc-6f17c1f4031e	2025-05-25 14:28:56.840859	2025-11-06 15:40:04.459328	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	49475	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	8	\N	\N	\N	\N	\N	\N	f	\N	\N
e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	[T050261] TRẦN NHẬT DUY - G	TRẦN NHẬT DUY - G	TRAN NHAT DUY - G	\N	0778998033	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T050261	YẾN YẾN GTH	t	f	male	\N	1991	\N	\N	\N	79	Thành phố Hồ Chí Minh	769	Thành phố Thủ Đức	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-06-16 00:00:00	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2025-06-16 16:15:49.934617	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-16 16:15:49.934619	2025-06-17 16:23:10.65679	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	50261	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	35	\N	\N	\N	\N	\N	\N	f	\N	\N
06364188-d7e1-421b-a409-b3030060b209	[T050466] NGUYỄN QUANG TOẢN (0979199660) - G1 	NGUYỄN QUANG TOẢN (0979199660) - G1 	NGUYEN QUANG TOAN (0979199660) - G1 	\N	0946128168	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T050466	KIÊN GIỚI THIỆU	t	f	male	CSKH : HUỲNH 	1990	9	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-06-21 00:00:00	\N	\N	\N	\N	2025-06-21 12:52:03.443613	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-21 12:52:03.443616	2025-08-16 14:57:56.926853	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	50466	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	36	\N	\N	\N	\N	\N	\N	f	\N	\N
fa3f3aa0-2bc9-4656-8029-b30a0064edf2	[T050774] HUỲNH THỊ HỒNG GẤM	HUỲNH THỊ HỒNG GẤM	HUYNH THI HONG GAM	BÌNH CHÁNH	0788851426	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T050774	Tư vấn răng sứ	t	f	female	AnhVL	2002	8	10	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-06-28 00:00:00	\N	\N	\N	\N	2025-06-28 13:07:28.377888	c0a08fa8-569c-4ac9-9f41-57089701b2f2	9f14688a-8e2d-40e7-850d-19f1abae8b63	2025-06-28 13:07:28.377889	2025-08-21 13:36:30.957494	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	50774	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	24	\N	\N	\N	\N	\N	\N	f	\N	\N
804e1102-7e0f-42b6-8158-b342003f49b5	[T053176] ĐẶNG NGỌC MINH THƯ	ĐẶNG NGỌC MINH THƯ	DANG NGOC MINH THU	\N	0909197570	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T053176	\N	t	f	female	\N	2013	1	1	\N	79	Thành phố Hồ Chí Minh	786	Huyện Nhà Bè	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-08-23 00:00:00	\N	\N	\N	\N	2025-08-23 10:50:25.456477	f879eaed-e8df-4b2f-91ae-e0409eabb639	9f14688a-8e2d-40e7-850d-19f1abae8b63	2025-08-23 10:50:25.456481	2025-08-23 12:00:17.791989	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	53176	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	13	\N	\N	\N	\N	\N	\N	f	\N	\N
4da68ebf-0e77-4f33-a5f3-b34d00423c10	[T053491] Nguyễn Thu Huyền	Nguyễn Thu Huyền	Nguyen Thu Huyen	\N	0394990097	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T053491	\N	t	f	female	TrangNTH	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-09-03 00:00:00	\N	\N	\N	\N	2025-09-03 11:01:09.173853	628be5fe-ecec-4919-829e-871dfb5006ef	34faeb06-ee46-4277-bb29-544c49a99771	2025-09-03 11:01:09.173856	2025-09-03 16:35:04.951148	f	f	\N	\N	\N	\N	contact	\N	\N	53491	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
10f79eec-0965-4397-aeeb-b35400ab5326	[T053824] NGUYỄN THANH HIỂN	NGUYỄN THANH HIỂN	NGUYEN THANH HIEN	401/54 NGUYỄN VĂN KHỐI , GÒ VẤP	0399638858	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T053824	Tư vấn niềng răng 	t	f	male	DungBtt	2004	6	13	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-09-10 00:00:00	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2025-09-10 17:23:46.471804	816d038b-856e-4227-9b19-9cac831fe139	07133b25-d559-419c-ae04-ddb4545df960	2025-09-10 17:23:46.471806	2026-02-11 13:48:20.442938	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	53824	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	22	\N	\N	\N	\N	\N	\N	f	\N	\N
281f07e9-1916-4f3f-95d7-b3660060ccaa	[T054452] ỨC NỮ KIM XOAN	ỨC NỮ KIM XOAN	UC NU KIM XOAN	\N	0586490330	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T054452	\N	t	f	female	\N	2005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-09-28 00:00:00	\N	\N	\N	\N	2025-09-28 12:52:26.167444	47f96103-8fad-4d6e-ba79-9eb01eaa5451	d67346f6-837e-499d-8e8f-0eea533fcd4c	2025-09-28 12:52:26.167446	2025-09-29 11:33:00.645918	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	54452	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	21	\N	\N	\N	\N	\N	\N	f	\N	\N
fd51b881-a221-4469-9c28-b37800215caa	[T055132] PHẠM THỊ KIỀU OANH	PHẠM THỊ KIỀU OANH	PHAM THI KIEU OANH	Đường Bình Hưng	0792538285	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T055132	\N	t	f	female	VanVC	2003	10	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-10-16 00:00:00	\N	\N	\N	\N	2025-10-16 09:01:28.034512	2b860551-c401-48a3-ac11-4286e01fca87	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-10-16 09:01:28.034516	2025-11-24 13:44:26.40147	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	2b860551-c401-48a3-ac11-4286e01fca87	\N	55132	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	\N	t	27619	Xã Bình Hưng	23	\N	\N	\N	\N	\N	\N	f	\N	\N
a7640271-7120-4917-904c-b388003ba146	[T055673] Nguyễn Hữu Thịnh	Nguyễn Hữu Thịnh	Nguyen Huu Thinh	\N	0846588595	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T055673	\N	t	f	male	TrangNTH	2006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-11-01 00:00:00	\N	\N	\N	\N	2025-11-01 10:37:06.366873	628be5fe-ecec-4919-829e-871dfb5006ef	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-11-01 10:37:06.366876	2025-12-07 17:55:34.105577	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	628be5fe-ecec-4919-829e-871dfb5006ef	\N	55673	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	20	\N	\N	\N	\N	\N	\N	f	\N	\N
a918ec28-0fdd-4671-8744-b38800685e88	[T055689] CAO HÀ TIÊN - G	CAO HÀ TIÊN - G	CAO HA TIEN - G	2/A BẠCH ĐẰNG, PHƯỜNG 2 TÂN BÌNH 	0765431477	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T055689	[T8692] ĐẶNG NGUYỄN KHÁNH AN\nGT	t	f	female	LYBAEE	2008	2	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-11-01 00:00:00	\N	\N	\N	\N	2025-11-01 13:19:59.811561	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-11-01 13:19:59.811563	2026-02-07 17:09:06.592042	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	55689	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	18	\N	\N	\N	\N	\N	\N	f	\N	\N
3dc647ea-698d-4038-94e6-b38a0022baa8	[T055760] NGUYỄN THỊ NGỌC TRANG (ACB)	NGUYỄN THỊ NGỌC TRANG (ACB)	NGUYEN THI NGOC TRANG (ACB)	\N	0364998608	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T055760	\N	t	f	female	\N	1991	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-11-03 00:00:00	\N	\N	\N	\N	2025-11-03 09:06:26.693141	47f96103-8fad-4d6e-ba79-9eb01eaa5451	d67346f6-837e-499d-8e8f-0eea533fcd4c	2025-11-03 09:06:26.693144	2025-11-03 17:26:26.063122	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	55760	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	35	\N	\N	\N	\N	\N	\N	f	\N	\N
a5a89433-420a-40dd-801c-b39000b34540	[T055990] NGÔ THỊ PHƯƠNG	NGÔ THỊ PHƯƠNG	NGO THI PHUONG	\N	0769587502	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T055990	\N	t	f	female	NganTK	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-11-09 00:00:00	\N	\N	\N	\N	2025-11-09 17:52:42.237355	f228b5c0-e26b-4825-bd80-08393b2a44e7	07133b25-d559-419c-ae04-ddb4545df960	2025-11-09 17:52:42.237357	2026-02-10 14:37:22.188893	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	f228b5c0-e26b-4825-bd80-08393b2a44e7	\N	55990	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
250c1ff6-8b5e-4bc6-9ac3-b3ad007ca9b0	[T056982] DƯƠNG NHẬT AN	DƯƠNG NHẬT AN	DUONG NHAT AN	\N	0936666321	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T056982	Tư vấn niềng răng	t	f	female	AnhVL	1987	\N	\N	\N	79	Thành phố Hồ Chí Minh	768	Quận Phú Nhuận	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-08 00:00:00	\N	\N	\N	\N	2025-12-08 14:33:53.011243	c0a08fa8-569c-4ac9-9f41-57089701b2f2	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-08 14:33:53.011245	2025-12-31 15:45:31.469992	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	56982	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	39	\N	\N	\N	\N	\N	\N	f	\N	\N
c928ee81-c3c1-4f56-9d0c-b3b20042e2db	[T057129] QUÁCH ĐẶNG QUỲNH ANH	QUÁCH ĐẶNG QUỲNH ANH	QUACH DANG QUYNH ANH	\N	0784958752	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T057129	Tư vấn niềng răng 	t	f	female	DungBtt	2011	10	19	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-13 04:01:47.16	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2025-12-13 11:03:31.504076	816d038b-856e-4227-9b19-9cac831fe139	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-13 11:03:31.504078	2025-12-17 10:18:58.802266	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	57129	T	\N	\N	\N	\N	none	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	15	\N	\N	\N	\N	\N	\N	f	\N	\N
79d56f7b-0572-424f-aa97-b3b30065fa75	[T057179] TRẦN PHƯƠNG ANH	TRẦN PHƯƠNG ANH	TRAN PHUONG ANH	\N	0786731755	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T057179	Tư vấn niềng răng	t	f	female	AnhVL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-14 06:10:49.068	\N	\N	\N	\N	2025-12-14 13:11:17.509004	c0a08fa8-569c-4ac9-9f41-57089701b2f2	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-14 13:11:17.509006	2025-12-15 14:57:30.136634	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	57179	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
b2262736-c7f4-4072-a67f-b3d00095dcf1	[T058384] Phạm Ngọc Huy 	Phạm Ngọc Huy 	Pham Ngoc Huy 	\N	0349762840	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T058384	Tư vấn niềng răng 	t	f	male	DungBtt	2002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-12 09:05:16.085	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2026-01-12 16:05:38.081719	816d038b-856e-4227-9b19-9cac831fe139	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-12 16:05:38.081721	2026-02-11 14:05:32.585669	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	58384	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	24	\N	\N	\N	\N	\N	\N	f	\N	\N
45fe0ac9-60cf-499a-81ed-b3d900a5e292	[T058892] NGUYỄN THỊ NHƯ Ý	NGUYỄN THỊ NHƯ Ý	NGUYEN THI NHU Y	579/70 QUANG TRUNG , P11 , GÒ VẤP	0353993861	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T058892	Tư  vấn niềng răng	t	f	female	AnhVL	2007	10	10	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-21 10:03:37.506	\N	\N	\N	\N	2026-01-21 17:03:58.138563	c0a08fa8-569c-4ac9-9f41-57089701b2f2	07133b25-d559-419c-ae04-ddb4545df960	2026-01-21 17:03:58.138565	2026-01-24 18:32:50.366252	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	58892	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	19	\N	\N	\N	\N	\N	\N	f	\N	\N
541bd083-7b08-4b7a-9517-b3db007928c7	[T058987] LƯU NGỌC THUÝ VY	LƯU NGỌC THUÝ VY	LUU NGOC THUY VY	QUẬN 8	0345935433	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T058987	Tư vấn niềng răng 	t	f	female	DungBtt	2007	8	11	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-23 07:20:45.391	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2026-01-23 14:21:07.648803	816d038b-856e-4227-9b19-9cac831fe139	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2026-01-23 14:21:07.648809	2026-01-27 17:24:22.301116	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	58987	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	19	\N	\N	\N	\N	\N	\N	f	\N	\N
34f9945d-a2b3-4a7b-bbc5-b3e70045e958	[T059530] NGUYỄN NGÔ QUỲNH TRÂM 	NGUYỄN NGÔ QUỲNH TRÂM 	NGUYEN NGO QUYNH TRAM 	\N	0334112346	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T059530	TV NIỀNG 	t	f	female	NganTK	2006	10	25	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-02-04 04:14:38.942	\N	\N	\N	\N	2026-02-04 11:14:32.399209	f228b5c0-e26b-4825-bd80-08393b2a44e7	14901ece-9fd9-4f5a-8921-423ca8c120dc	2026-02-04 11:14:32.399211	2026-02-05 16:25:20.448757	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	f228b5c0-e26b-4825-bd80-08393b2a44e7	\N	59530	T	\N	\N	\N	\N	none	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	\N	t	\N	\N	20	\N	\N	\N	\N	\N	\N	f	\N	\N
21734bc3-68ae-40f3-91a4-afc7006cf314	Tấm Dentist	Tấm Dentist	Tam Dentist	298 Nguyễn Thị Minh Khai	\N	trungkien150495@gmail.com	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	770	Quận 3	27151	Phường 05	\N	\N	\N	\N	\N	\N	\N	2023-03-16 00:00:00	\N	\N	\N	\N	2023-03-16 13:36:40.384564	\N	\N	2023-03-16 13:36:40.384567	2023-03-16 13:36:40.384567	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
359155c1-89a4-4edc-95db-b05b009a2149	Tấm Dentist Thủ Đức	Tấm Dentist Thủ Đức	Tam Dentist Thu Duc	557 Kha Vạn Cân	0902501001	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	769	Thành phố Thủ Đức	26821	Phường Linh Đông	\N	\N	\N	\N	\N	\N	\N	2023-08-11 00:00:00	\N	\N	\N	\N	2023-08-11 16:21:10.216362	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2023-08-11 16:21:10.216364	2023-08-11 16:21:10.216365	f	f	0902501001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
86d44007-e3a8-4f4d-a51d-b13f003eb759	Tấm Dentist Gò Vấp	Tấm Dentist Gò Vấp	Tam Dentist Go Vap	\N	0966 080 638	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	764	Quận Gò Vấp	26893	Phường 04	\N	\N	\N	\N	\N	\N	\N	2024-03-26 00:00:00	\N	\N	\N	\N	2024-03-26 10:48:20.562296	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-03-26 10:48:20.5623	2024-03-26 10:48:20.562301	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
d73c7cd6-7be4-4356-b2b6-b13f003ed8a4	Tấm Dentist Đống Đa	Tấm Dentist Đống Đa	Tam Dentist Dong Da	\N	0966 080 638	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	01	Thành phố Hà Nội	006	Quận Đống Đa	00196	Phường Hàng Bột	\N	\N	\N	\N	\N	\N	\N	2024-03-26 00:00:00	\N	\N	\N	\N	2024-03-26 10:48:48.974962	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-03-26 10:48:48.974965	2024-03-26 10:48:48.974965	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
cc59d7c8-3ec4-4a2c-90a3-b1f900a4cb11	Tấm Dentist Quận 7	Tấm Dentist Quận 7	Tam Dentist Quan 7	Nguyễn Thị Thập	0926563968	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	778	Quận 7	27490	Phường Tân Phong	\N	\N	\N	\N	\N	\N	\N	2024-09-28 00:00:00	\N	\N	\N	\N	2024-09-28 16:59:59.627465	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-09-28 16:59:59.627468	2024-09-28 16:59:59.627468	t	f	\N	https://tamdentist.vn/	\N	\N	contact	\N	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
542d9beb-ab18-4670-980e-b2c70050e717	Tấm Dentist Quận 10	Tấm Dentist Quận 10	Tam Dentist Quan 10	376 Đường 3/2 Quận 10	0977041698	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	771	Quận 10	27172	Phường 12	\N	\N	\N	\N	\N	\N	\N	2025-04-22 00:00:00	\N	\N	\N	\N	2025-04-22 11:54:33.463539	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2025-04-22 11:54:33.463543	2025-04-22 11:54:33.463544	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	none	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
499921f5-e290-42a3-8c2c-b37d008eaf2a	Nha khoa Tấm Dentist	Nha khoa Tấm Dentist	Nha khoa Tam Dentist	\N	\N	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-10-21 00:00:00	\N	\N	\N	\N	2025-10-21 15:39:29.846647	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2025-10-21 15:39:29.846651	2025-10-21 15:39:29.846651	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	none	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N
b41477e0-8eed-4520-a41a-b145008c51b0	BS. Trâm	BS. Trâm	BS. Tram	\N	0901000002	tram@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
0b8e06d1-d517-4207-a8c0-b1f7002d7476	BS. Ly	BS. Ly	BS. Ly	\N	0901000003	ly@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
9968161f-e735-448b-9adb-b14f0038c98e	BS. Khánh	BS. Khánh	BS. Khanh	\N	0901000004	khanh@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	male	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
cab2a199-ae6f-4746-8d8f-b3690092e93c	BS. Dương	BS. Dương	BS. Duong	\N	0901000005	duong@tamdentist.vn	f	f	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	t	t	male	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
494dd94b-0f5c-4037-a183-b2d5004495bc	BS. Uyên	BS. Uyên	BS. Uyen	\N	0901000006	uyen.q10@tamdentist.vn	f	f	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
21360b9b-8e24-46e1-83a3-b1ef009a1911	BS. Ý	BS. Ý	BS. Y	\N	0901000007	y@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
dbefd061-dbb0-44d7-8eed-afe3007a8017	BS. Duy	BS. Duy	BS. Duy	\N	0901000008	duy@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
90e19070-f750-415b-ba52-b05f002e9438	BS. Dũng	BS. Dũng	BS. Dung	\N	0901000009	dung@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
c48e8550-f68f-4be5-89bb-b2110032b4e1	BS. Thu Thảo	BS. Thu Thảo	BS. Thu Thao	\N	0901000010	thuthao@tamdentist.vn	f	f	f	f	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
7f9f1030-20ea-4c23-84e6-b16000c1e144	BS. Thảo	BS. Thảo	BS. Thao	\N	0901000011	thao@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
43190b77-570b-4557-b470-b33e00663454	BS. Nga	BS. Nga	BS. Nga	\N	0901000012	nga@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
6ac1a478-0568-4ec6-a3d6-b05b009de13d	BS. Quyên	BS. Quyên	BS. Quyen	\N	0901000013	quyen@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
ed346f4b-c27b-428f-8e46-b05b009de13d	BS. Quyên B	BS. Quyên B	BS. Quyen B	\N	0901000014	quyenb@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Phẫu thuật	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
f03fce3f-d90e-4194-a28f-b1d400752590	BS. Hà	BS. Hà	BS. Ha	\N	0901000015	ha@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
fd67fda4-42ea-4f85-b100-b14c0090e6e4	BS. Hải	BS. Hải	BS. Hai	\N	0901000016	hai@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
3c2a3bda-879f-48b7-8ee4-b266004978ea	BS. Minh	BS. Minh	BS. Minh	\N	0901000017	minh@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	male	Bác sĩ Phục hình	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
a3a0e8dc-6b40-468f-803b-b1cf0063ad84	BS. Phương	BS. Phương	BS. Phuong	\N	0901000018	phuong@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
f1abd11e-6309-4b5b-add9-b14c0090f199	BS. Linh	BS. Linh	BS. Linh	\N	0901000019	linh@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	\N
afde36ab-1eca-4281-b8e4-b1930033a9c6	BS. Trang	BS. Trang	BS. Trang	\N	0901000001	trang@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$x1YYk40zV8SDAlzk96.N5Op1IugF.pCSEjAaUDo08ZvR8TxS81qr.	2026-04-07 14:41:14.71967
28e2c9eb-d410-4881-9cf2-efb2494baad7	Admin	Admin	Admin	\N	0900000000	admin@tamdentist.vn	f	f	f	f	\N	\N	\N	t	t	male	Quản trị viên hệ thống	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 14:44:30.628431	2026-04-07 14:44:30.628431	f	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	$2b$10$zfkoNf/.2HTe5enmkdjU4eOC0kFsGCgbvkxc6QZpiYo5HU9ZDeV32	2026-04-07 14:47:43.1251
\.


--
-- Data for Name: permission_groups; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.permission_groups (id, name, color, description, is_system, datecreated, lastupdated) FROM stdin;
11111111-0000-0000-0000-000000000001	Admin	#EF4444	Full system access	t	2026-04-07 13:58:48.179094	2026-04-07 13:58:48.179094
11111111-0000-0000-0000-000000000003	Dentist	#0EA5E9	Dentist access	f	2026-04-07 13:58:48.179094	2026-04-07 13:58:48.179094
11111111-0000-0000-0000-000000000005	Dental Assistant	#F59E0B	Updated assistant access	f	2026-04-07 13:58:48.179094	2026-04-07 14:00:47.257947
11111111-0000-0000-0000-000000000002	Clinic Manager	#8B5CF6	Clinic management access	f	2026-04-07 13:58:48.179094	2026-04-07 15:02:42.890587
11111111-0000-0000-0000-000000000004	Receptionist	#10B981	Front desk access	f	2026-04-07 13:58:48.179094	2026-04-07 15:02:50.73199
\.


--
-- Data for Name: permission_overrides; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.permission_overrides (id, employee_id, permission, override_type, datecreated) FROM stdin;
\.


--
-- Data for Name: productcategories; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.productcategories (id, name, completename, parentid, active, datecreated, lastupdated) FROM stdin;
7ab70791-8567-4f11-9f67-cc93621b7fbe	Bọc sứ	Bọc sứ	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
40f1a1c0-f246-4767-b5d7-56920ee92a8a	Dán sứ	Dán sứ	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
f6668b73-7161-48f5-a1d0-76cf00f9367b	Điều trị tổng quát	Điều trị tổng quát	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
1d2c1143-54c3-4d17-9fca-41c631bb595c	Implant	Implant	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
40e7d669-4c91-43ce-934e-e26e443f3b0e	KHÍ CỤ TWINBLOCK	KHÍ CỤ TWINBLOCK	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
d09baedb-9fb9-4f4b-abb4-32ed3210054c	Máy tăm nước	Máy tăm nước	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	Nhổ răng	Nhổ răng	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
d33a28a7-b432-4c71-b3a4-45e089d9f03c	Niềng răng	Niềng răng	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
5af92657-0743-4e55-855c-e18b059abb15	Phẫu thuật và điều trị	Phẫu thuật và điều trị	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
75a1b6aa-3363-42bd-ba17-7d9333e0ade8	Phục hình	Phục hình	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
25c5dbc1-ef0f-42da-ade2-13b0eb8dd508	BỘC LỘ	BỘC LỘ	\N	t	2026-04-07 15:04:24.397361	2026-04-07 15:04:24.397361
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.products (id, name, namenosign, defaultcode, type, type2, listprice, saleprice, purchaseprice, laboprice, categid, uomid, uomname, companyid, active, canorderlab, datecreated, lastupdated) FROM stdin;
3ff661b5-98bf-4eea-8d67-cb9248fcd004	Cắm chốt	\N	SP0288	service	service	1	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
329e287f-0394-48b6-b766-63892115b48f	Chốt sợi	\N	DV0020	service	service	2000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
58e5f26a-d9a9-44be-8b75-32f360c946e1	Chốt sợi thủy tinh	\N	SP0244	service	service	800000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
361c04a8-ec53-4dd2-9cc8-f29497801f3f	Cùi giả kim loại	\N	SP0265	service	service	1000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c25c8d99-3805-4d56-911a-c755f0007032	Cùi giả sứ	\N	SP0243	service	service	1500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
2edb1be4-bbed-4653-a702-32c0c7af8f4e	Đặt chốt	\N	SP0247	service	service	800000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
9cc79779-c911-497b-af92-a73ad2f92c62	KHUNG NHỰA	\N	SP0248	service	service	5000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
10d3e897-dbb7-431a-906e-8859fe9ec8e8	Mão tạm	\N	SP0246	service	service	300000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d102644f-bae9-4ac7-97ce-8f8c0e026365	RS 3M Lava Plus	\N	DV0011	service	service	8000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
77d04792-9ead-407e-bf1f-d247f73fbb52	RS Ceramill	\N	DV0012	service	service	5500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5a307d27-5595-42f0-ba33-84090adfbffe	RS CERCON	\N	SP0245	service	service	6000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	CÁI	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
fedf5b4f-ef2b-49c0-a5bf-8e5c2f0649b5	RS Cercon HT	\N	DV0013	service	service	6000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d451bfbb-cd82-47c4-9c7f-68e61aeceaef	RS Emax	\N	DV0014	service	service	5500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
84467ce0-04c7-45b1-8fd6-8046046cc2fc	RS Ful Zirconia	\N	DV0015	service	service	3500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
3c7cb95c-f2ac-47bd-9b98-b676edd38d24	RS HT Smile	\N	DV0016	service	service	6000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e8f42a48-913d-4a8a-960a-6427cab4e5fd	RS Katana	\N	DV0017	service	service	2500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
62a2785a-d066-476c-aa77-8afeb6369823	RS Nacera Vita	\N	DV0018	service	service	6500000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
69b343fe-d5aa-4750-9946-5727e8667e9a	RS Titan	\N	SP0290	service	service	3000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b11cf8bc-11cf-43a5-8709-9208ed90b3b5	RS Venus 3D	\N	DV0019	service	service	3000000	0	0	0	7ab70791-8567-4f11-9f67-cc93621b7fbe	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0b594a11-042a-45e6-854d-bc5090f8e09f	BỘC LỘ	\N	SP0296	service	service	1	0	0	0	25c5dbc1-ef0f-42da-ade2-13b0eb8dd508	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
cf1e099a-d20b-4692-ad6a-25dcb22ff6dd	Dán sứ Veneer Caramay Ngọc Trai	\N	DV0021	service	service	9200000	0	0	0	40f1a1c0-f246-4767-b5d7-56920ee92a8a	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b1ec2830-e64c-4dac-8c2e-a9dd74ff54d2	Dán sứ Veneer Emax Press	\N	DV0022	service	service	7200000	0	0	0	40f1a1c0-f246-4767-b5d7-56920ee92a8a	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
1bbe0a45-96c5-408d-8a69-62930b524228	Dán sứ Veneer Lava	\N	DV0023	service	service	14200000	0	0	0	40f1a1c0-f246-4767-b5d7-56920ee92a8a	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
1d49e342-591e-489d-a1c7-128d8fbbb7d7	Đính đá	\N	SP0253	service	service	500000	0	0	0	40f1a1c0-f246-4767-b5d7-56920ee92a8a	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
cb9922e3-ee45-40b0-8d19-6fd45ea84d47	GẮN LẠI RĂNG SỨ	\N	SP0216	service	service	500000	0	0	0	40f1a1c0-f246-4767-b5d7-56920ee92a8a	\N	CÁI	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5eafc39e-a61b-443c-961d-e55a61dab0ec	Cắt cầu răng	\N	SP0237	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c184b96e-bdd9-443e-87c8-8dc788ab28b2	CẮT CHỈ	\N	SP0201	service	service	200000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d1b18d07-d858-4c2b-ae42-056eee18dbbf	CẮT LỢI TRÙM (THƯỜNG)	\N	SP0218	service	service	300000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b8d7f344-1143-41d9-8298-33c2aaa1efc7	Cắt lợi+ Hạ xương ổ răng	\N	DV0051	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
1eb1d181-0b43-4e4e-9152-0b429a112378	CẮT NƯỚU	\N	SP0303	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
023380a5-fb62-4342-9893-e1a393e53a26	chữa áp xe chân răng số 46	\N	SP0261	service	service	500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
ed0ad2d9-bdbc-4231-b0e6-05513a84a613	Chụp phim	\N	SP0269	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	lần	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b7c821bc-8b8a-41fb-a9eb-ec74301a939b	Đánh bóng làm sạch	\N	SP0252	service	service	100000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
f6f5a273-2cd8-4638-8558-f726ab05860b	ĐIỀU TRỊ NHA CHU	\N	SP0306	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0d926ee7-4c3d-40ee-a80d-8b73feef8825	Điều trị sâu ngà răng phục hồi bằng composite	\N	SP0286	service	service	300000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
09cef79f-29b5-44fe-b83a-9617f8932ef3	Điều trị tủy	\N	DV0047	service	service	2000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5314bb1a-4a67-4c2f-b728-55cd39c9c4ef	Điều trị tủy lại	\N	DV0048	service	service	3000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
482519a4-cb2d-4574-995b-ef2531e76879	Điều trị viêm lợi	\N	SP0274	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	gói	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0573920c-941e-4a7a-8000-92e5dd170a24	Điều trị viêm quanh răng	\N	DV0056	service	service	750000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
87e3f57c-6c27-491d-9238-72dcf222401c	GẮN HỘT	\N	SP0202	service	service	500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Hột	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
00fd330a-3b43-422c-9a31-9e9452141546	Gắn lại răng sứ bị rớt	\N	SP0238	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
32bf760f-8395-4fd0-91b5-3699afe5013a	KHÍ CỤ NÂNG KHỚP	\N	SP0004	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a0313d88-ebd4-417d-9141-1adbc1a290d6	Làm sạch chuyên sâu Clean Teeth	\N	DV0058	service	service	380000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
ff7e958d-c966-473f-b1c1-b32241242975	Laser Cắt lợi trùm (răng khôn)	\N	DV0052	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c1efe8fb-529c-44f7-a6ab-108fe87b4088	Laser Cắt Phanh môi (điều trị răng hô)	\N	DV0053	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
de9869d4-197f-40f2-9a72-e6edcac35afe	Lấy cao răng	\N	DV0057	service	service	300000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b5242df8-3a57-4d9e-a05a-a75858593d26	MÀI CHỈNH	\N	SP0302	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c56561d3-f136-47d7-a4c2-c3557a75dd9f	MÀI RĂNG	\N	SP0234	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	CÁI	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7b51757d-a711-4132-b8e3-3a3850cf61a9	Máng chống nghiến	\N	SP0242	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
6ff88f34-fe56-4ab2-8557-cd9481529d25	Nạo Nha Chu	\N	SP0005	service	service	1000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
76a3c2ca-eb69-4d08-a165-6bcc65791e26	NHỔ RĂNG SỮA BÔI TÊ	\N	SP0235	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	0	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
28688ea0-1685-41cf-8ee9-bc4b84e1d2b8	NÚT GỠ	\N	SP0011	service	service	3000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
cd28de44-17c5-4039-93b8-d771a50d36ad	Phá composite răng khểnh	\N	SP0285	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
3cc3441a-3f05-4d97-9296-b2aff1b6517b	Phẫu thuật cưỡi hở lợi	\N	DV0050	service	service	1200000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
240b8fb9-e935-4ef6-8e97-250ea070a367	Phí quẹt thẻ	\N	SP0254	service	service	150000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
3bb2b7c9-773f-4e17-91ac-3a4a9d72a839	Phí quẹt thẻ	\N	SP0255	service	service	150000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
339b3ca8-fe3e-4537-9737-7985c738b310	Răng tạm	\N	SP0266	service	service	500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d8c0c709-31ba-4a1d-a8d5-34a52ecf49f3	Tẩy trắng răng tại nhà	\N	DV0055	service	service	800000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
ace5ec55-13cb-4fa1-a2dd-dc08e0be3eea	Tẩy trắng răng tại Phòng khám	\N	DV0054	service	service	1500000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
458bc9df-818c-4ef8-91fb-eeb552b35b23	THÁO SỨ	\N	SP0236	service	service	300000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a0fc7f0c-cf58-40db-be78-5ac01efb34f2	Tiểu phẫu bộc lộ răng ngầm	\N	SP0298	service	service	1000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a03e258b-8532-4cf1-b6f4-e8f4ed8e8356	Trám cổ răng	\N	SP0287	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d986b51c-f70d-4f79-a7c0-c301d5f46d53	Trám răng	\N	DV0049	service	service	1000000	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
07e030d9-2a2d-4163-b308-70ffd34dc3f5	Trám răng sữa	\N	SP0239	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c42f7fe5-be25-401a-969c-e0754051fa65	Trám thẩm mỹ	\N	SP0279	service	service	1	0	0	0	f6668b73-7161-48f5-a1d0-76cf00f9367b	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
571dab82-eee4-456c-bdd9-eabfcae3f03c	Abutment	\N	DV0034	service	service	3000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
2f9bf133-d7e1-4857-aad9-bc82708173fe	Full Implant Hàn Quốc	\N	DV0028	service	service	22000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e90e4e3b-0038-492b-a288-548a1928de50	Full Implant Mỹ	\N	DV0024	service	service	24000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
444cef42-fe32-4dc6-92a1-d891d8f34e66	Full Implant Pháp	\N	DV0025	service	service	27000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
ff396c6d-0151-442d-9b41-4a0bffefb4f7	Full Implant Thụy Điển	\N	DV0027	service	service	39000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
bbe63d7e-06a4-45b2-8ca9-a1ce76e105ce	Full Implant Thụy Sĩ	\N	DV0026	service	service	36000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
58c0c646-34a5-4a55-a54d-24d8781ea06a	KHUNG TITAN	\N	SP0240	service	service	35000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	CÁI	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
cafa7c91-c344-466b-b794-7993f9e90f1b	Mão sứ	\N	DV0035	service	service	8000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b924e7c4-9204-4032-9d56-107db0df1404	Phẫu thuật ghép xương bột	\N	DV0036	service	service	8000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Đơn vị	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d7ec513e-6881-4fa3-91ef-f2de2c069ca0	Phẫu thuật lấy trụ Implant cũ	\N	DV0037	service	service	3000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
839dd507-dfea-40dd-b9c9-4742f29a6203	Phẫu thuật nâng xoang hở	\N	DV0038	service	service	15000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Đơn vị	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
f5307782-aacb-4787-954a-0cdcc6e4aff6	Phẫu thuật nâng xoang kín	\N	DV0039	service	service	6000000	0	0	0	1d2c1143-54c3-4d17-9fca-41c631bb595c	\N	Đơn vị	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
80846ae5-ea38-47dc-bbb7-623b80cf1b0c	KHÍ CỤ TWINBLOCK	\N	SP0297	service	service	1	0	0	0	40e7d669-4c91-43ce-934e-e26e443f3b0e	\N	KHÍ CỤ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
8c746b4e-1fca-4a7c-888e-65e3eb990dea	MÁY TĂM NƯỚC PROCARE A3	\N	PROCARE A3	service	service	1200000	0	0	0	d09baedb-9fb9-4f4b-abb4-32ed3210054c	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
798f19ff-6f14-44af-8277-c142eaaeba59	Máy tăm nước Prosencor	\N	SP0270	service	service	1300000	0	0	0	d09baedb-9fb9-4f4b-abb4-32ed3210054c	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
ab88511c-fd8c-417a-adc7-1567f95079e6	Chấm thuốc	\N	SP0272	service	service	1	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	lần	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
6a1d1887-713f-47a6-8a14-3bda3aa3519a	Nhổ chân R26	\N	SP0267	service	service	700000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
dfeb45f2-1a62-40f9-8410-80a2fb00be7d	Nhổ chân răng số 6	\N	SP0257	service	service	500000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
13fd450d-4cca-4b86-b2d6-f45522509ccc	Nhổ chân răng Vĩnh viễn	\N	DV0042	service	service	1000000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
32c6e929-59b4-4e4c-ba4d-dc9da42ce8c3	nhổ răng dư	\N	SP0214	service	service	1	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	đồng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
758d922d-c353-4516-89be-ab74d3dc2170	Nhổ răng kẹ	\N	SP0284	service	service	1	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
6c06e3a5-9b7f-45b6-8e0a-bcabb48e40f4	Nhổ răng khôn hàm dưới	\N	DV0045	service	service	4000000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
40b0cc31-4024-41b4-b236-aa028c9b9055	Nhổ răng khôn hàm trên	\N	DV0044	service	service	3500000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5b472eca-5306-42ac-8bb2-7a280badea3d	Nhổ răng ngầm	\N	DV0046	service	service	7000000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
58d42702-0300-49b7-a8e5-5c34f0f2885b	Nhổ răng sữa	\N	SP0276	service	service	1	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
008f1118-5113-4a0c-a9d1-3b137bab443f	Nhổ răng sữa chích tê	\N	SP0215	service	service	100000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	1	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7343ea92-8357-4e3c-a992-c8f6a5a68d93	Nhổ răng thừa, lạc chỗ	\N	DV0043	service	service	2200000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0c5c11d0-0bb7-4faa-ac0f-39acf7ef3946	Nhổ răng Vĩnh viễn	\N	DV0041	service	service	2200000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a749579c-1eaa-4f2b-8d49-2de0300dc159	Răng sữa	\N	DV0040	service	service	0	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5df23c54-6709-420e-b24b-55b2eb264621	Tiểu phẫu răng	\N	SP0262	service	service	1200000	0	0	0	5e1d60ec-69a2-4e73-bcc9-d3b40cb6f8ca	\N	đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
cfb7fe4e-bc5a-40dd-af5c-b506a4468b77	CHỈNH DÂY FIX	\N	SP0299	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
f65827ae-4a7d-4f6b-8edb-1a641456ba01	Band	\N	SP0305	service	service	300000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
4bb60912-c3af-4be2-8887-b63805152ce1	Bộ Mắc Cài Kim Loại Tiêu Chuẩn	\N	SP0292	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Bộ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
46972887-cbc9-41a4-b94a-8fccceccd56e	Bộ mắc cài kim loại tự đóng	\N	SP0293	service	service	2500000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Bộ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7a091b70-b2a2-441c-8cd6-aa5ffc57d6e2	Bộ mắc cài sứ tiêu chuẩn	\N	SP0294	service	service	3500000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Bộ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7ab8369c-0f15-4d74-8af2-bbd1f9b2fe05	Bộ mắc cài sứ tự đóng	\N	SP0295	service	service	4500000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Bộ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
8e5fe5b0-645f-435f-94bf-8167f0e72b20	Cắm 4 vít	\N	SP0258	service	service	2000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
67d5dd94-5e48-4409-a619-3186048bbfef	Cắt dây cung	\N	SP0282	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	lần	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
583d3d47-da61-40e8-9815-5b5f33374038	CẮT THẮNG MÔI	\N	SP0278	service	service	1000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	ĐỒNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
9a616bc5-5aab-4a96-9dee-19015920d76f	CHỈNH DÂY FIX 2	\N	SP0300	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	RĂNG	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
6aeab6c2-5dfd-4f36-afc0-3910636c35a2	Chun chỉnh nha	\N	SP0264	service	service	50000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	túi	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
18ab3b02-e2c2-461c-8f88-04e36bbab1cd	Cục cắn	\N	DV0010	service	service	50000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c2093849-cd2c-4ec8-a750-fbadd3be3733	Gắn Lại Dây Cung	\N	SP0251	service	service	100000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e6daa982-22d1-4e03-b7b8-e3597fad452a	GẮN LẠI MẮC CÀI	\N	SP0249	service	service	100000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	VND	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a4359b5d-a8c6-485d-bb0a-8e2c1bf9109b	Gói niềng tiền chỉnh nha	\N	SP0271	service	service	15000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
4a6c2c57-9384-4697-85df-3fe51a61b49c	Hàm cung khẩu cái	\N	SP0280	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e3ed1924-9986-4143-ad79-25be5a4774c3	Hàm cung lưỡi	\N	SP0275	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0829a82a-24e5-40cb-be78-bba3e842eacb	Hàm duy trì	\N	DV0009	service	service	4000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7b216146-dc95-41d0-9e9f-22d614da7abc	Hàm giữ khoảng	\N	SP0301	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5a68e951-d755-45e6-becf-bcfeacc5955c	KHAY TRONG SUỐT	\N	SP0012	service	service	60000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	1	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
4785f4b9-9655-4fa0-93cd-139b396e4e3e	KHÍ CỤ ĐỊNH VỊ HÀM	\N	SP0006	service	service	2000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7a50f31a-5656-4eb4-9f8f-373332f3c2f4	KHÍ CỤ NONG HÀM NHANH	\N	SP0007	service	service	4000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
d1ba9218-1074-4fa0-b615-c3c05625baa4	KHÍ CỤ NONG HÀM THƯỜNG	\N	SP0003	service	service	2500000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
99f3b8cb-0d64-4db1-b15d-5b62b2b01919	Khí Cụ Tật Lưỡi	\N	SP0256	service	service	5000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
65b53e8b-08c2-40c3-9c14-cba2312a1b4b	Mắc cài kim loại lẻ	\N	DV0006	service	service	100000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
db76feed-5b6a-414d-af0f-b750a0039c73	MẮC CÀI KIM LOẠI TIÊU CHUẨN	\N	SP0291	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	19000000	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
14391e59-7d3d-4ad1-9f72-88b4feee7c45	Mắc cài sứ lẻ	\N	DV0005	service	service	200000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b1263775-f2f2-4289-86a4-4492cfff62dd	MẶT PHẲNG NGHIÊNG - CHỈNH NHA	\N	SP0008	service	service	2000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
929ccbef-39e4-4a3c-b8d0-b18dcdf3185b	MẶT PHẲNG NGHIÊNG - TRẺ EM	\N	SP0009	service	service	4000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a2fde1ed-b730-413c-ad80-57f1e038698f	MCKL số 37	\N	SP0260	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0d2f2066-9fce-40d0-9a7f-94608bd575e6	Mini vis	\N	DV0007	service	service	2000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
a6070451-c238-4ca9-8c2d-81931eeb75ca	Niềng Mắc Cài Cánh Cam	\N	SP0277	service	service	40000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e9758b89-0d35-4aee-ad71-2577b3d54325	Niềng mắc cài kim loại mặt lưỡi	\N	SP0263	service	service	30000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b47c68a0-9c32-4672-8ec8-dc8fb8dd26a4	Niềng Mắc Cài Kim Loại Tiêu Chuẩn	\N	DV0001	service	service	28000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
8c77a54c-39e7-44bf-bef1-08326dba3ab0	Niềng Mắc Cài Kim Loại Tự Buộc 3M	\N	DV0002	service	service	32000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
b05fa014-b178-4ac3-84ac-c5814228422f	Niềng Mắc Cài Sứ Loại Tự Buộc 3M	\N	DV0004	service	service	45000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0f63f272-a5fd-45f4-88ae-5bbf60f519f0	Niềng Mắc Cài Sứ Tiêu Chuẩn	\N	DV0003	service	service	39000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
86ea4abf-0c00-4370-b34c-3604fa3816a7	Niềng răng phân đoạn	\N	SP0268	service	service	30000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
bf767521-cebd-4531-86cc-5c50b167eb6b	Niềng răng trong suốt	\N	SP0217	service	service	80000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
4e538bc9-f375-407b-87e9-6da1ce994f42	Niềng trong suốt Invisalign	\N	DV0008	service	service	140000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	t	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
3e0dabf4-6cfe-49c8-8bf0-b23ce8a70722	Phí chênh lệch cấp độ	\N	SP0304	service	service	5000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Ca	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
2f5ffea1-395f-45ad-b24a-f0562ebc93a7	Phí trễ hẹn	\N	SP0250	service	service	112000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
76ee81c9-d64b-4d5e-8038-e0e8c0a85cf9	Sáp chỉnh nha	\N	SP0002	service	service	20000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	hộp	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
3a6ea16d-ed96-4f04-a71b-478626ed03af	Tạo Khoảng Phục Hình	\N	SP0281	service	service	4000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	1	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
114c544a-dd91-45ee-b005-96a24a43dcc1	Tháo mắc cài	\N	SP0289	service	service	1	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7e6135a8-dca8-4405-bf06-1fb2942be9c7	THÁO MẮC CÀI CŨ	\N	SP0010	service	service	1500000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
dffbf038-023b-42eb-905d-b8798be06217	THAY THUN	\N	SP0219	service	service	100000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Hàm	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
0d44f1ab-4ff0-4bf8-882a-cade36c46406	TINH CHỈNH RĂNG TIẾP TỤC	\N	SP0241	service	service	3000000	0	0	0	d33a28a7-b432-4c71-b3a4-45e089d9f03c	\N	Đ	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
45176fbd-c27a-4be3-a8b3-9f3add0235a9	cắt lợi	\N	SP0283	service	service	1	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
49da4621-363f-47fe-8c5f-838b230665e0	Chích áp xe lợi	\N	DV0059	service	service	450000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
7d820b6e-1159-457d-a666-256f4255be0d	Điều trị áp xe quanh răng mạn	\N	DV0060	service	service	750000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
92062c0f-040c-4ad6-97fa-e57d715cc24f	Điều trị nhạy cảm ngà bằng máng với thuốc chống ê buốt	\N	DV0061	service	service	300000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
8110b6d9-2baf-4605-aeee-e3b077cdbc08	Phẫu thuật cắt cuống răng	\N	DV0062	service	service	5800000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
f4785009-90d8-49af-a8f6-980009688aa5	Phẫu thuật cắt nạo ổ xương	\N	DV0063	service	service	6000000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
4d9e1a55-ba42-4509-bcc7-a596b555d1e6	Phẫu thuật nạo quanh cuống răng	\N	DV0064	service	service	4300000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
5f42d6de-67d7-4e79-ba63-dcf53ef313f8	Phẫu thuật nhổ răng có tạo hình xương ổ răng	\N	DV0065	service	service	1800000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e3e15adf-54c8-482c-bca3-4a0a4c7a4505	Phẫu thuật tạo hình xương ổ răng	\N	DV0066	service	service	2900000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
c2996ab0-2c64-4bbe-a2af-05bfde22bd98	Phục hồi thân răng có sử dụng pin ngà	\N	DV0067	service	service	600000	0	0	0	5af92657-0743-4e55-855c-e18b059abb15	\N	Răng	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
e4c46b87-6bd9-4b03-8a50-8d7cd50dccf9	Răng nhựa	\N	SP0273	service	service	1	0	0	0	75a1b6aa-3363-42bd-ba17-7d9333e0ade8	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
aebff68e-5f30-4d0f-adb9-f68c74dd8f36	Răng tháo lắp	\N	SP0001	service	service	2000000	0	0	0	75a1b6aa-3363-42bd-ba17-7d9333e0ade8	\N	cái	\N	t	f	2026-04-07 15:04:24.398729	2026-04-07 15:04:24.398729
\.


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: employee_location_scope employee_location_scope_employee_id_location_id_key; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_location_scope
    ADD CONSTRAINT employee_location_scope_employee_id_location_id_key UNIQUE (employee_id, location_id);


--
-- Name: employee_location_scope employee_location_scope_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_location_scope
    ADD CONSTRAINT employee_location_scope_pkey PRIMARY KEY (id);


--
-- Name: employee_permissions employee_permissions_employee_id_key; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_permissions
    ADD CONSTRAINT employee_permissions_employee_id_key UNIQUE (employee_id);


--
-- Name: employee_permissions employee_permissions_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_permissions
    ADD CONSTRAINT employee_permissions_pkey PRIMARY KEY (id);


--
-- Name: group_permissions group_permissions_group_id_permission_key; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.group_permissions
    ADD CONSTRAINT group_permissions_group_id_permission_key UNIQUE (group_id, permission);


--
-- Name: group_permissions group_permissions_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.group_permissions
    ADD CONSTRAINT group_permissions_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: permission_groups permission_groups_name_key; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.permission_groups
    ADD CONSTRAINT permission_groups_name_key UNIQUE (name);


--
-- Name: permission_groups permission_groups_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.permission_groups
    ADD CONSTRAINT permission_groups_pkey PRIMARY KEY (id);


--
-- Name: permission_overrides permission_overrides_employee_id_permission_key; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.permission_overrides
    ADD CONSTRAINT permission_overrides_employee_id_permission_key UNIQUE (employee_id, permission);


--
-- Name: permission_overrides permission_overrides_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.permission_overrides
    ADD CONSTRAINT permission_overrides_pkey PRIMARY KEY (id);


--
-- Name: productcategories productcategories_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.productcategories
    ADD CONSTRAINT productcategories_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_companyid; Type: INDEX; Schema: dbo; Owner: -
--

CREATE INDEX idx_appointments_companyid ON dbo.appointments USING btree (companyid);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: dbo; Owner: -
--

CREATE INDEX idx_appointments_date ON dbo.appointments USING btree (date);


--
-- Name: idx_appointments_partnerid; Type: INDEX; Schema: dbo; Owner: -
--

CREATE INDEX idx_appointments_partnerid ON dbo.appointments USING btree (partnerid);


--
-- Name: idx_partners_companyid; Type: INDEX; Schema: dbo; Owner: -
--

CREATE INDEX idx_partners_companyid ON dbo.partners USING btree (companyid);


--
-- Name: employee_location_scope employee_location_scope_employee_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_location_scope
    ADD CONSTRAINT employee_location_scope_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES dbo.partners(id) ON DELETE CASCADE;


--
-- Name: employee_location_scope employee_location_scope_location_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_location_scope
    ADD CONSTRAINT employee_location_scope_location_id_fkey FOREIGN KEY (location_id) REFERENCES dbo.companies(id) ON DELETE CASCADE;


--
-- Name: employee_permissions employee_permissions_employee_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_permissions
    ADD CONSTRAINT employee_permissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES dbo.partners(id) ON DELETE CASCADE;


--
-- Name: employee_permissions employee_permissions_group_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.employee_permissions
    ADD CONSTRAINT employee_permissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES dbo.permission_groups(id);


--
-- Name: appointments fk_appointments_company; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.appointments
    ADD CONSTRAINT fk_appointments_company FOREIGN KEY (companyid) REFERENCES dbo.companies(id) ON DELETE CASCADE;


--
-- Name: appointments fk_appointments_partner; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.appointments
    ADD CONSTRAINT fk_appointments_partner FOREIGN KEY (partnerid) REFERENCES dbo.partners(id) ON DELETE CASCADE;


--
-- Name: partners fk_partners_company; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.partners
    ADD CONSTRAINT fk_partners_company FOREIGN KEY (companyid) REFERENCES dbo.companies(id) ON DELETE SET NULL;


--
-- Name: group_permissions group_permissions_group_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.group_permissions
    ADD CONSTRAINT group_permissions_group_id_fkey FOREIGN KEY (group_id) REFERENCES dbo.permission_groups(id) ON DELETE CASCADE;


--
-- Name: permission_overrides permission_overrides_employee_id_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.permission_overrides
    ADD CONSTRAINT permission_overrides_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES dbo.partners(id) ON DELETE CASCADE;


--
-- Name: productcategories productcategories_parentid_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.productcategories
    ADD CONSTRAINT productcategories_parentid_fkey FOREIGN KEY (parentid) REFERENCES dbo.productcategories(id);


--
-- Name: products products_categid_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.products
    ADD CONSTRAINT products_categid_fkey FOREIGN KEY (categid) REFERENCES dbo.productcategories(id);


--
-- Name: products products_companyid_fkey; Type: FK CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.products
    ADD CONSTRAINT products_companyid_fkey FOREIGN KEY (companyid) REFERENCES dbo.companies(id);


--
-- PostgreSQL database dump complete
--

\unrestrict U73ECB3P8EJJLyhpJTIX6qtL6W4mYmSXUHLNMInNzYmrdQ2iOUiHtIq24SP6mGK

