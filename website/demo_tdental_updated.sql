--
-- PostgreSQL database dump
--

\restrict gmciNvyL1xnbP0pWC56svdac2imMPGFhuuh1sgbgfHrF0AoFzKPdH3k0ns5o1r4

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
    isdeleted boolean NOT NULL
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
-- Data for Name: partners; Type: TABLE DATA; Schema: dbo; Owner: -
--

COPY dbo.partners (id, displayname, name, namenosign, street, phone, email, supplier, customer, isagent, isinsurance, companyid, ref, comment, active, employee, gender, jobtitle, birthyear, birthmonth, birthday, medicalhistory, citycode, cityname, districtcode, districtname, wardcode, wardname, barcode, fax, sourceid, referraluserid, note, avatar, zaloid, date, titleid, agentid, weight, healthinsurancecardnumber, calendarlastnotifack, createdbyid, writebyid, datecreated, lastupdated, iscompany, ishead, hotline, website, countryid, stateid, type, userid, stageid, sequencenumber, sequenceprefix, birthdaycustomerstate, customerthankstate, emergencyphone, lasttreatmentcompletedate, treatmentstatus, taxcode, unitaddress, unitname, customername, invoicereceivingmethod, isbusinessinvoice, personaladdress, personalname, receiveremail, receiverzalonumber, personalidentitycard, personaltaxcode, citycodev2, citynamev2, identitynumber, usedaddressv2, wardcodev2, wardnamev2, age, contactstatusid, customerstatus, marketingstaffid, potentiallevel, marketingteamid, saleteamid, isdeleted) FROM stdin;
1e9d5389-810b-436c-8dbb-b0310021f217	[T0963] PHẠM NGUYỄN MINH HIẾU 	PHẠM NGUYỄN MINH HIẾU 	PHAM NGUYEN MINH HIEU 	\N	0563757416	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T0963	\N	t	f	male	\N	1998	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2023-06-30 09:03:35.545583	b0eb3d9c-40f9-4840-aeae-87b63c24e64f	661769c7-fe5d-4de0-97b3-12d129198ccc	2023-06-30 09:03:35.545585	2023-07-10 16:18:27.264405	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	28	\N	\N	\N	\N	\N	\N	f
e9fd09c2-e3be-4c59-88e0-b1030040130f	[T4944] Nguyễn Thị Thanh	Nguyễn Thị Thanh	Nguyen Thi Thanh	\N	0908177761	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T4944	\N	t	f	female	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2024-01-26 00:00:00	\N	\N	\N	\N	2024-01-26 10:53:17.275413	8a553679-4de6-496c-8cf3-a25b09f124b4	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-01-26 10:53:17.275415	2024-10-01 17:53:52.536776	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	4944	T	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
a62414fe-b577-41a2-84d1-b14d008dc0c5	[T6771] NGUYỄN THỊ UYÊN	NGUYỄN THỊ UYÊN	NGUYEN THI UYEN	\N	0843656412	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T6771	Tư vấn niềng răng 	t	f	female	DungBtt	2002	5	24	\N	74	Tỉnh Bình Dương	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-04-09 00:00:00	096ad7ef-bbf1-4a2e-ae77-afe30052abca	\N	\N	\N	2024-04-09 15:36:06.413583	816d038b-856e-4227-9b19-9cac831fe139	aedc7e28-b6c1-44e0-a895-8524012c03e4	2024-04-09 15:36:06.413585	2024-04-10 20:36:30.672043	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	24	\N	\N	\N	\N	\N	\N	f
140d4c43-227b-4a1f-93e7-b17400aa26b1	[T8126] Vũ Hữu Đạt	Vũ Hữu Đạt	Vu Huu Dat	\N	0388682636	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T8126	Tư vấn niềng răng 	t	f	male	nhunght	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-05-18 00:00:00	\N	\N	\N	\N	2024-05-18 17:19:30.082489	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	a5e29ed2-853c-4e2b-9fb6-0506732dbf1f	2024-05-18 17:19:30.082492	2024-05-18 17:19:30.082493	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
e2972973-56ed-4b6e-a411-b1760022319c	[T8160] Đặng Thị Hồng Thúy	Đặng Thị Hồng Thúy	Dang Thi Hong Thuy	\N	0977407980	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T8160	Sdt khác: 0376097208	t	f	female	\N	1964	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2024-05-20 00:00:00	\N	\N	\N	\N	2024-05-20 09:04:29.747179	2eb12148-bf3f-4694-8f3e-0a7db0815502	2eb12148-bf3f-4694-8f3e-0a7db0815502	2024-05-20 09:04:29.747182	2024-05-25 09:32:22.812513	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	62	\N	\N	\N	\N	\N	\N	f
80953c05-6320-4feb-b31e-b1ce00c73f79	[T11028] Nguyễn Thị Nguyệt	Nguyễn Thị Nguyệt	Nguyen Thi Nguyet	\N	0912866856	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T11028	\N	t	f	female	\N	1964	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2024-08-16 00:00:00	\N	\N	\N	\N	2024-08-16 19:05:26.372874	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-08-16 19:05:26.372876	2024-08-19 12:20:53.239594	f	f	\N	\N	\N	\N	contact	\N	\N	11028	T	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	62	\N	\N	\N	\N	\N	\N	f
7f38b288-2f0f-4caa-81ac-b217003b3c31	[T042342] NGUYỄN THỊ NHƯ NGỌC	NGUYỄN THỊ NHƯ NGỌC	NGUYEN THI NHU NGOC	\N	0387606489	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T042342	Tư vấn răng sứ 	t	f	female	DungBtt	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2024-10-28 00:00:00	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2024-10-28 10:35:40.110442	816d038b-856e-4227-9b19-9cac831fe139	45119c4a-ee11-4b5d-9df6-8d0fd9d7a25d	2024-10-28 10:35:40.110447	2024-10-28 19:44:09.662922	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	42342	T	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
c977958d-09c6-4067-8f4d-b24c00353bcf	[T043901] Nguyễn Lan Phương (Lucy Phương Nguyễn)	Nguyễn Lan Phương (Lucy Phương Nguyễn)	Nguyen Lan Phuong (Lucy Phuong Nguyen)	\N	0973035522	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T043901	\N	t	f	female	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2024-12-20 00:00:00	\N	\N	\N	\N	2024-12-20 10:13:49.062602	34faeb06-ee46-4277-bb29-544c49a99771	34faeb06-ee46-4277-bb29-544c49a99771	2024-12-20 10:13:49.062606	2025-03-18 17:19:19.876534	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	43901	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
2da1bae8-d8e2-4a85-9da8-b25f0077382c	[T044356] LÊ HỒNG KHANH	LÊ HỒNG KHANH	LE HONG KHANH	\N	0902493006	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T044356	\N	t	f	male	\N	1997	12	5	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-01-08 00:00:00	\N	\N	\N	\N	2025-01-08 14:14:03.880661	c727fe8c-bce6-4296-8836-647d6dd3fc6f	c727fe8c-bce6-4296-8836-647d6dd3fc6f	2025-01-08 14:14:03.880663	2025-01-13 15:53:35.117348	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	44356	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	29	\N	\N	\N	\N	\N	\N	f
498c13ed-3f68-4c4f-b461-b28b003c173e	[T045826] Trần Ngọc Kim Tỷ	Trần Ngọc Kim Tỷ	Tran Ngoc Kim Ty	\N	0938256419	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T045826	\N	t	f	female	TrangTL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-02-21 00:00:00	\N	\N	\N	\N	2025-02-21 10:38:47.033159	343de624-f1f6-467f-8bb7-3960d50f868a	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-02-21 10:38:47.033162	2025-12-27 19:19:36.599451	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	45826	T	\N	1	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
0958759d-2985-4323-8807-b2e8007b4e9d	[T049475] Ngô Trí Nguyên 	Ngô Trí Nguyên 	Ngo Tri Nguyen 	\N	0933449696	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T049475	\N	t	f	male	\N	2018	12	22	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-05-25 00:00:00	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2025-05-25 14:28:56.840856	34faeb06-ee46-4277-bb29-544c49a99771	519b9e4b-9949-4422-bacc-6f17c1f4031e	2025-05-25 14:28:56.840859	2025-11-06 15:40:04.459328	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	49475	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	8	\N	\N	\N	\N	\N	\N	f
e669a2b7-9733-4ef6-9feb-b2fe0098a9f5	[T050261] TRẦN NHẬT DUY - G	TRẦN NHẬT DUY - G	TRAN NHAT DUY - G	\N	0778998033	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T050261	YẾN YẾN GTH	t	f	male	\N	1991	\N	\N	\N	79	Thành phố Hồ Chí Minh	769	Thành phố Thủ Đức	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-06-16 00:00:00	962b8c06-820b-430d-b392-afe30052abca	\N	\N	\N	2025-06-16 16:15:49.934617	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-16 16:15:49.934619	2025-06-17 16:23:10.65679	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	50261	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	35	\N	\N	\N	\N	\N	\N	f
06364188-d7e1-421b-a409-b3030060b209	[T050466] NGUYỄN QUANG TOẢN (0979199660) - G1 	NGUYỄN QUANG TOẢN (0979199660) - G1 	NGUYEN QUANG TOAN (0979199660) - G1 	\N	0946128168	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T050466	KIÊN GIỚI THIỆU	t	f	male	CSKH : HUỲNH 	1990	9	2	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-06-21 00:00:00	\N	\N	\N	\N	2025-06-21 12:52:03.443613	b4ce78f5-c73f-4f36-888a-914287165026	b4ce78f5-c73f-4f36-888a-914287165026	2025-06-21 12:52:03.443616	2025-08-16 14:57:56.926853	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	50466	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	36	\N	\N	\N	\N	\N	\N	f
fa3f3aa0-2bc9-4656-8029-b30a0064edf2	[T050774] HUỲNH THỊ HỒNG GẤM	HUỲNH THỊ HỒNG GẤM	HUYNH THI HONG GAM	BÌNH CHÁNH	0788851426	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T050774	Tư vấn răng sứ	t	f	female	AnhVL	2002	8	10	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-06-28 00:00:00	\N	\N	\N	\N	2025-06-28 13:07:28.377888	c0a08fa8-569c-4ac9-9f41-57089701b2f2	9f14688a-8e2d-40e7-850d-19f1abae8b63	2025-06-28 13:07:28.377889	2025-08-21 13:36:30.957494	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	50774	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	24	\N	\N	\N	\N	\N	\N	f
804e1102-7e0f-42b6-8158-b342003f49b5	[T053176] ĐẶNG NGỌC MINH THƯ	ĐẶNG NGỌC MINH THƯ	DANG NGOC MINH THU	\N	0909197570	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T053176	\N	t	f	female	\N	2013	1	1	\N	79	Thành phố Hồ Chí Minh	786	Huyện Nhà Bè	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-08-23 00:00:00	\N	\N	\N	\N	2025-08-23 10:50:25.456477	f879eaed-e8df-4b2f-91ae-e0409eabb639	9f14688a-8e2d-40e7-850d-19f1abae8b63	2025-08-23 10:50:25.456481	2025-08-23 12:00:17.791989	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	53176	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	13	\N	\N	\N	\N	\N	\N	f
4da68ebf-0e77-4f33-a5f3-b34d00423c10	[T053491] Nguyễn Thu Huyền	Nguyễn Thu Huyền	Nguyen Thu Huyen	\N	0394990097	\N	f	t	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	T053491	\N	t	f	female	TrangNTH	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-09-03 00:00:00	\N	\N	\N	\N	2025-09-03 11:01:09.173853	628be5fe-ecec-4919-829e-871dfb5006ef	34faeb06-ee46-4277-bb29-544c49a99771	2025-09-03 11:01:09.173856	2025-09-03 16:35:04.951148	f	f	\N	\N	\N	\N	contact	\N	\N	53491	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
10f79eec-0965-4397-aeeb-b35400ab5326	[T053824] NGUYỄN THANH HIỂN	NGUYỄN THANH HIỂN	NGUYEN THANH HIEN	401/54 NGUYỄN VĂN KHỐI , GÒ VẤP	0399638858	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T053824	Tư vấn niềng răng 	t	f	male	DungBtt	2004	6	13	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-09-10 00:00:00	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2025-09-10 17:23:46.471804	816d038b-856e-4227-9b19-9cac831fe139	07133b25-d559-419c-ae04-ddb4545df960	2025-09-10 17:23:46.471806	2026-02-11 13:48:20.442938	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	53824	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	22	\N	\N	\N	\N	\N	\N	f
281f07e9-1916-4f3f-95d7-b3660060ccaa	[T054452] ỨC NỮ KIM XOAN	ỨC NỮ KIM XOAN	UC NU KIM XOAN	\N	0586490330	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T054452	\N	t	f	female	\N	2005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-09-28 00:00:00	\N	\N	\N	\N	2025-09-28 12:52:26.167444	47f96103-8fad-4d6e-ba79-9eb01eaa5451	d67346f6-837e-499d-8e8f-0eea533fcd4c	2025-09-28 12:52:26.167446	2025-09-29 11:33:00.645918	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	54452	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	21	\N	\N	\N	\N	\N	\N	f
fd51b881-a221-4469-9c28-b37800215caa	[T055132] PHẠM THỊ KIỀU OANH	PHẠM THỊ KIỀU OANH	PHAM THI KIEU OANH	Đường Bình Hưng	0792538285	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T055132	\N	t	f	female	VanVC	2003	10	14	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-10-16 00:00:00	\N	\N	\N	\N	2025-10-16 09:01:28.034512	2b860551-c401-48a3-ac11-4286e01fca87	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-10-16 09:01:28.034516	2025-11-24 13:44:26.40147	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	2b860551-c401-48a3-ac11-4286e01fca87	\N	55132	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	\N	t	27619	Xã Bình Hưng	23	\N	\N	\N	\N	\N	\N	f
a7640271-7120-4917-904c-b388003ba146	[T055673] Nguyễn Hữu Thịnh	Nguyễn Hữu Thịnh	Nguyen Huu Thinh	\N	0846588595	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T055673	\N	t	f	male	TrangNTH	2006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-11-01 00:00:00	\N	\N	\N	\N	2025-11-01 10:37:06.366873	628be5fe-ecec-4919-829e-871dfb5006ef	de5ceb25-27e1-44cd-8529-19cacbbdec40	2025-11-01 10:37:06.366876	2025-12-07 17:55:34.105577	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	628be5fe-ecec-4919-829e-871dfb5006ef	\N	55673	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	20	\N	\N	\N	\N	\N	\N	f
a918ec28-0fdd-4671-8744-b38800685e88	[T055689] CAO HÀ TIÊN - G	CAO HÀ TIÊN - G	CAO HA TIEN - G	2/A BẠCH ĐẰNG, PHƯỜNG 2 TÂN BÌNH 	0765431477	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T055689	[T8692] ĐẶNG NGUYỄN KHÁNH AN\nGT	t	f	female	LYBAEE	2008	2	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	c7b3d31a-6325-4cf7-abae-afe3007cf6f8	\N	\N	\N	\N	2025-11-01 00:00:00	\N	\N	\N	\N	2025-11-01 13:19:59.811561	07133b25-d559-419c-ae04-ddb4545df960	07133b25-d559-419c-ae04-ddb4545df960	2025-11-01 13:19:59.811563	2026-02-07 17:09:06.592042	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	55689	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	18	\N	\N	\N	\N	\N	\N	f
3dc647ea-698d-4038-94e6-b38a0022baa8	[T055760] NGUYỄN THỊ NGỌC TRANG (ACB)	NGUYỄN THỊ NGỌC TRANG (ACB)	NGUYEN THI NGOC TRANG (ACB)	\N	0364998608	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T055760	\N	t	f	female	\N	1991	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	82fc6269-37a3-4702-8889-afe3007cf044	\N	\N	\N	\N	2025-11-03 00:00:00	\N	\N	\N	\N	2025-11-03 09:06:26.693141	47f96103-8fad-4d6e-ba79-9eb01eaa5451	d67346f6-837e-499d-8e8f-0eea533fcd4c	2025-11-03 09:06:26.693144	2025-11-03 17:26:26.063122	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	\N	\N	55760	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	35	\N	\N	\N	\N	\N	\N	f
a5a89433-420a-40dd-801c-b39000b34540	[T055990] NGÔ THỊ PHƯƠNG	NGÔ THỊ PHƯƠNG	NGO THI PHUONG	\N	0769587502	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T055990	\N	t	f	female	NganTK	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-11-09 00:00:00	\N	\N	\N	\N	2025-11-09 17:52:42.237355	f228b5c0-e26b-4825-bd80-08393b2a44e7	07133b25-d559-419c-ae04-ddb4545df960	2025-11-09 17:52:42.237357	2026-02-10 14:37:22.188893	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	f228b5c0-e26b-4825-bd80-08393b2a44e7	\N	55990	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
250c1ff6-8b5e-4bc6-9ac3-b3ad007ca9b0	[T056982] DƯƠNG NHẬT AN	DƯƠNG NHẬT AN	DUONG NHAT AN	\N	0936666321	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T056982	Tư vấn niềng răng	t	f	female	AnhVL	1987	\N	\N	\N	79	Thành phố Hồ Chí Minh	768	Quận Phú Nhuận	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-08 00:00:00	\N	\N	\N	\N	2025-12-08 14:33:53.011243	c0a08fa8-569c-4ac9-9f41-57089701b2f2	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-08 14:33:53.011245	2025-12-31 15:45:31.469992	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	56982	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	39	\N	\N	\N	\N	\N	\N	f
c928ee81-c3c1-4f56-9d0c-b3b20042e2db	[T057129] QUÁCH ĐẶNG QUỲNH ANH	QUÁCH ĐẶNG QUỲNH ANH	QUACH DANG QUYNH ANH	\N	0784958752	\N	f	t	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	T057129	Tư vấn niềng răng 	t	f	female	DungBtt	2011	10	19	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-13 04:01:47.16	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2025-12-13 11:03:31.504076	816d038b-856e-4227-9b19-9cac831fe139	b4ce78f5-c73f-4f36-888a-914287165026	2025-12-13 11:03:31.504078	2025-12-17 10:18:58.802266	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	57129	T	\N	\N	\N	\N	none	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	15	\N	\N	\N	\N	\N	\N	f
79d56f7b-0572-424f-aa97-b3b30065fa75	[T057179] TRẦN PHƯƠNG ANH	TRẦN PHƯƠNG ANH	TRAN PHUONG ANH	\N	0786731755	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T057179	Tư vấn niềng răng	t	f	female	AnhVL	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2025-12-14 06:10:49.068	\N	\N	\N	\N	2025-12-14 13:11:17.509004	c0a08fa8-569c-4ac9-9f41-57089701b2f2	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2025-12-14 13:11:17.509006	2025-12-15 14:57:30.136634	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	57179	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
b2262736-c7f4-4072-a67f-b3d00095dcf1	[T058384] Phạm Ngọc Huy 	Phạm Ngọc Huy 	Pham Ngoc Huy 	\N	0349762840	\N	f	t	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	T058384	Tư vấn niềng răng 	t	f	male	DungBtt	2002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-12 09:05:16.085	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2026-01-12 16:05:38.081719	816d038b-856e-4227-9b19-9cac831fe139	de5ceb25-27e1-44cd-8529-19cacbbdec40	2026-01-12 16:05:38.081721	2026-02-11 14:05:32.585669	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	58384	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	24	\N	\N	\N	\N	\N	\N	f
45fe0ac9-60cf-499a-81ed-b3d900a5e292	[T058892] NGUYỄN THỊ NHƯ Ý	NGUYỄN THỊ NHƯ Ý	NGUYEN THI NHU Y	579/70 QUANG TRUNG , P11 , GÒ VẤP	0353993861	\N	f	t	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	T058892	Tư  vấn niềng răng	t	f	female	AnhVL	2007	10	10	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-21 10:03:37.506	\N	\N	\N	\N	2026-01-21 17:03:58.138563	c0a08fa8-569c-4ac9-9f41-57089701b2f2	07133b25-d559-419c-ae04-ddb4545df960	2026-01-21 17:03:58.138565	2026-01-24 18:32:50.366252	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	c0a08fa8-569c-4ac9-9f41-57089701b2f2	\N	58892	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	19	\N	\N	\N	\N	\N	\N	f
541bd083-7b08-4b7a-9517-b3db007928c7	[T058987] LƯU NGỌC THUÝ VY	LƯU NGỌC THUÝ VY	LUU NGOC THUY VY	QUẬN 8	0345935433	\N	f	t	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	T058987	Tư vấn niềng răng 	t	f	female	DungBtt	2007	8	11	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-01-23 07:20:45.391	e8db49c0-2290-47cb-9f09-afe30052abca	\N	\N	\N	2026-01-23 14:21:07.648803	816d038b-856e-4227-9b19-9cac831fe139	47f96103-8fad-4d6e-ba79-9eb01eaa5451	2026-01-23 14:21:07.648809	2026-01-27 17:24:22.301116	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	816d038b-856e-4227-9b19-9cac831fe139	\N	58987	T	\N	\N	\N	\N	sale	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	19	\N	\N	\N	\N	\N	\N	f
34f9945d-a2b3-4a7b-bbc5-b3e70045e958	[T059530] NGUYỄN NGÔ QUỲNH TRÂM 	NGUYỄN NGÔ QUỲNH TRÂM 	NGUYEN NGO QUYNH TRAM 	\N	0334112346	\N	f	t	f	f	6861c928-0e13-4664-c781-08dcdfa45074	T059530	TV NIỀNG 	t	f	female	NganTK	2006	10	25	\N	\N	\N	\N	\N	\N	\N	\N	\N	f3efa245-838e-4b5a-b8f6-afe3007ce234	\N	\N	\N	\N	2026-02-04 04:14:38.942	\N	\N	\N	\N	2026-02-04 11:14:32.399209	f228b5c0-e26b-4825-bd80-08393b2a44e7	14901ece-9fd9-4f5a-8921-423ca8c120dc	2026-02-04 11:14:32.399211	2026-02-05 16:25:20.448757	f	f	\N	\N	1ab9c25c-c6ca-4c05-9042-b0670114aee9	\N	contact	f228b5c0-e26b-4825-bd80-08393b2a44e7	\N	59530	T	\N	\N	\N	\N	none	\N	\N	\N	\N	none	f	\N	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	\N	t	\N	\N	20	\N	\N	\N	\N	\N	\N	f
21734bc3-68ae-40f3-91a4-afc7006cf314	Tấm Dentist	Tấm Dentist	Tam Dentist	298 Nguyễn Thị Minh Khai	\N	trungkien150495@gmail.com	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	770	Quận 3	27151	Phường 05	\N	\N	\N	\N	\N	\N	\N	2023-03-16 00:00:00	\N	\N	\N	\N	2023-03-16 13:36:40.384564	\N	\N	2023-03-16 13:36:40.384567	2023-03-16 13:36:40.384567	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
359155c1-89a4-4edc-95db-b05b009a2149	Tấm Dentist Thủ Đức	Tấm Dentist Thủ Đức	Tam Dentist Thu Duc	557 Kha Vạn Cân	0902501001	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	769	Thành phố Thủ Đức	26821	Phường Linh Đông	\N	\N	\N	\N	\N	\N	\N	2023-08-11 00:00:00	\N	\N	\N	\N	2023-08-11 16:21:10.216362	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2023-08-11 16:21:10.216364	2023-08-11 16:21:10.216365	f	f	0902501001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
86d44007-e3a8-4f4d-a51d-b13f003eb759	Tấm Dentist Gò Vấp	Tấm Dentist Gò Vấp	Tam Dentist Go Vap	\N	0966 080 638	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	764	Quận Gò Vấp	26893	Phường 04	\N	\N	\N	\N	\N	\N	\N	2024-03-26 00:00:00	\N	\N	\N	\N	2024-03-26 10:48:20.562296	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-03-26 10:48:20.5623	2024-03-26 10:48:20.562301	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
d73c7cd6-7be4-4356-b2b6-b13f003ed8a4	Tấm Dentist Đống Đa	Tấm Dentist Đống Đa	Tam Dentist Dong Da	\N	0966 080 638	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	01	Thành phố Hà Nội	006	Quận Đống Đa	00196	Phường Hàng Bột	\N	\N	\N	\N	\N	\N	\N	2024-03-26 00:00:00	\N	\N	\N	\N	2024-03-26 10:48:48.974962	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-03-26 10:48:48.974965	2024-03-26 10:48:48.974965	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
cc59d7c8-3ec4-4a2c-90a3-b1f900a4cb11	Tấm Dentist Quận 7	Tấm Dentist Quận 7	Tam Dentist Quan 7	Nguyễn Thị Thập	0926563968	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	778	Quận 7	27490	Phường Tân Phong	\N	\N	\N	\N	\N	\N	\N	2024-09-28 00:00:00	\N	\N	\N	\N	2024-09-28 16:59:59.627465	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2024-09-28 16:59:59.627468	2024-09-28 16:59:59.627468	t	f	\N	https://tamdentist.vn/	\N	\N	contact	\N	\N	\N	\N	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
542d9beb-ab18-4670-980e-b2c70050e717	Tấm Dentist Quận 10	Tấm Dentist Quận 10	Tam Dentist Quan 10	376 Đường 3/2 Quận 10	0977041698	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	79	Thành phố Hồ Chí Minh	771	Quận 10	27172	Phường 12	\N	\N	\N	\N	\N	\N	\N	2025-04-22 00:00:00	\N	\N	\N	\N	2025-04-22 11:54:33.463539	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2025-04-22 11:54:33.463543	2025-04-22 11:54:33.463544	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	none	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
499921f5-e290-42a3-8c2c-b37d008eaf2a	Nha khoa Tấm Dentist	Nha khoa Tấm Dentist	Nha khoa Tam Dentist	\N	\N	\N	f	f	f	f	\N	\N	\N	t	f	male	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-10-21 00:00:00	\N	\N	\N	\N	2025-10-21 15:39:29.846647	b19424da-e016-41c8-b992-17181969c924	b19424da-e016-41c8-b992-17181969c924	2025-10-21 15:39:29.846651	2025-10-21 15:39:29.846651	t	f	\N	\N	\N	\N	contact	\N	\N	\N	\N	\N	\N	\N	\N	none	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
afde36ab-1eca-4281-b8e4-b1930033a9c6	BS. Trang	BS. Trang	BS. Trang	\N	0901000001	trang@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
b41477e0-8eed-4520-a41a-b145008c51b0	BS. Trâm	BS. Trâm	BS. Tram	\N	0901000002	tram@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
0b8e06d1-d517-4207-a8c0-b1f7002d7476	BS. Ly	BS. Ly	BS. Ly	\N	0901000003	ly@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	female	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
9968161f-e735-448b-9adb-b14f0038c98e	BS. Khánh	BS. Khánh	BS. Khanh	\N	0901000004	khanh@tamdentist.vn	f	f	f	f	765f6593-2b19-4d06-cc8c-08dc4d479451	\N	\N	t	t	male	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
cab2a199-ae6f-4746-8d8f-b3690092e93c	BS. Dương	BS. Dương	BS. Duong	\N	0901000005	duong@tamdentist.vn	f	f	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	t	t	male	Bác sĩ Chỉnh nha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
494dd94b-0f5c-4037-a183-b2d5004495bc	BS. Uyên	BS. Uyên	BS. Uyen	\N	0901000006	uyen.q10@tamdentist.vn	f	f	f	f	f0f6361e-b99d-4ac7-4108-08dd8159c64a	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
21360b9b-8e24-46e1-83a3-b1ef009a1911	BS. Ý	BS. Ý	BS. Y	\N	0901000007	y@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
dbefd061-dbb0-44d7-8eed-afe3007a8017	BS. Duy	BS. Duy	BS. Duy	\N	0901000008	duy@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
90e19070-f750-415b-ba52-b05f002e9438	BS. Dũng	BS. Dũng	BS. Dung	\N	0901000009	dung@tamdentist.vn	f	f	f	f	c6b4b453-d260-46d4-4fd9-08db24f7ae8e	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
c48e8550-f68f-4be5-89bb-b2110032b4e1	BS. Thu Thảo	BS. Thu Thảo	BS. Thu Thao	\N	0901000010	thuthao@tamdentist.vn	f	f	f	f	6861c928-0e13-4664-c781-08dcdfa45074	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
7f9f1030-20ea-4c23-84e6-b16000c1e144	BS. Thảo	BS. Thảo	BS. Thao	\N	0901000011	thao@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
43190b77-570b-4557-b470-b33e00663454	BS. Nga	BS. Nga	BS. Nga	\N	0901000012	nga@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
6ac1a478-0568-4ec6-a3d6-b05b009de13d	BS. Quyên	BS. Quyên	BS. Quyen	\N	0901000013	quyen@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
ed346f4b-c27b-428f-8e46-b05b009de13d	BS. Quyên B	BS. Quyên B	BS. Quyen B	\N	0901000014	quyenb@tamdentist.vn	f	f	f	f	b178d5ee-d9ac-477e-088e-08db9a4c4cf4	\N	\N	t	t	female	Bác sĩ Phẫu thuật	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
f03fce3f-d90e-4194-a28f-b1d400752590	BS. Hà	BS. Hà	BS. Ha	\N	0901000015	ha@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
fd67fda4-42ea-4f85-b100-b14c0090e6e4	BS. Hải	BS. Hải	BS. Hai	\N	0901000016	hai@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	male	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
3c2a3bda-879f-48b7-8ee4-b266004978ea	BS. Minh	BS. Minh	BS. Minh	\N	0901000017	minh@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	male	Bác sĩ Phục hình	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
a3a0e8dc-6b40-468f-803b-b1cf0063ad84	BS. Phương	BS. Phương	BS. Phuong	\N	0901000018	phuong@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
f1abd11e-6309-4b5b-add9-b14c0090f199	BS. Linh	BS. Linh	BS. Linh	\N	0901000019	linh@tamdentist.vn	f	f	f	f	cad65000-6ff3-47c7-cc8d-08dc4d479451	\N	\N	t	t	female	Bác sĩ Nha khoa	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 11:15:24.7804	2026-04-07 11:15:24.7804	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
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
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: dbo; Owner: -
--

ALTER TABLE ONLY dbo.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


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
-- PostgreSQL database dump complete
--

\unrestrict gmciNvyL1xnbP0pWC56svdac2imMPGFhuuh1sgbgfHrF0AoFzKPdH3k0ns5o1r4

