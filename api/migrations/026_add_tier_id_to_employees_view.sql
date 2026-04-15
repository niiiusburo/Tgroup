-- Recreate the employees view to include tier_id
BEGIN;

DROP VIEW IF EXISTS dbo.employees;

CREATE VIEW dbo.employees AS
SELECT
    p.id,
    p.name,
    p.namenosign,
    p.ref,
    p.phone,
    p.email,
    p.avatar,
    p.isdoctor,
    p.isassistant,
    p.isreceptionist,
    p.active,
    p.jobtitle,
    p.companyid,
    p.hrjobid,
    p.wage,
    p.allowance,
    p.startworkdate,
    p.tier_id,
    p.street AS address,
    NULL::text AS identitycard,
    CASE
        WHEN p.birthyear IS NOT NULL AND p.birthmonth IS NOT NULL AND p.birthday IS NOT NULL
        THEN make_date(p.birthyear, p.birthmonth, p.birthday)::timestamp without time zone
        ELSE NULL::timestamp without time zone
    END AS birthday,
    NULL::numeric AS hourlywage,
    NULL::numeric AS leavepermonth,
    NULL::numeric AS regularhour,
    NULL::numeric AS overtimerate,
    NULL::numeric AS restdayrate,
    NULL::text AS enrollnumber,
    NULL::text AS medicalprescriptioncode,
    p.datecreated,
    p.lastupdated
FROM dbo.partners p
WHERE p.employee = true;

COMMIT;
