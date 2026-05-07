'use strict';

const { query } = require('../../db');

const PARTNER_BY_ID_SQL = `SELECT
  p.id,
  p.ref AS code,
  p.displayname,
  p.name,
  p.phone,
  p.email,
  p.street,
  p.citycode,
  p.cityname AS city,
  p.districtcode,
  p.districtname AS district,
  p.wardcode,
  p.wardname AS ward,
  p.citycodev2,
  p.citynamev2,
  p.wardcodev2,
  p.wardnamev2,
  p.usedaddressv2,
  p.gender,
  p.birthyear,
  p.birthmonth,
  p.birthday,
  p.medicalhistory,
  p.comment,
  p.note,
  p.active AS status,
  p.treatmentstatus,
  p.sourceid,
  cs.name AS sourcename,
  p.referraluserid,
  p.agentid,
  a.name AS agentname,
  p.companyid,
  c.name AS companyname,
  p.datecreated,
  p.lastupdated,
  p.createdbyid,
  au1.name AS createdbyname,
  p.writebyid,
  au2.name AS updatedbyname,
  p.avatar,
  p.zaloid,
  p.taxcode,
  p.identitynumber,
  p.healthinsurancecardnumber,
  p.emergencyphone,
  p.weight,
  p.barcode,
  p.fax,
  p.hotline,
  p.website,
  p.jobtitle,
  p.iscompany,
  p.ishead,
  p.isbusinessinvoice,
  p.unitname,
  p.unitaddress,
  p.customername,
  p.invoicereceivingmethod,
  p.receiveremail,
  p.receiverzalonumber,
  p.personalidentitycard,
  p.personaltaxcode,
  p.personaladdress,
  p.personalname,
  p.stageid,
  p.lasttreatmentcompletedate,
  p.sequencenumber,
  p.sequenceprefix,
  p.supplier,
  p.customer,
  p.isagent,
  p.isinsurance,
  p.employee,
  p.cskhid,
  cskh_staff.name AS cskhname,
  p.salestaffid,
  sales_staff.name AS salestaffname,
  (SELECT COUNT(*) FROM appointments apt WHERE apt.partnerid = p.id) AS appointmentcount,
  (SELECT COUNT(*) FROM saleorders so WHERE so.partnerid = p.id AND so.isdeleted = false) AS ordercount,
  (SELECT COUNT(*) FROM dotkhams dk WHERE dk.partnerid = p.id AND dk.isdeleted = false) AS dotkhamcount
FROM partners p
LEFT JOIN customersources cs ON cs.id = p.sourceid
LEFT JOIN companies c ON c.id = p.companyid
LEFT JOIN agents a ON a.id = p.agentid
LEFT JOIN aspnetusers au1 ON au1.id = p.createdbyid
LEFT JOIN aspnetusers au2 ON au2.id = p.writebyid
LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid
LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid
WHERE p.id = $1 AND p.isdeleted = false`;

async function fetchPartnerProfileById(id, runQuery = query) {
  return runQuery(PARTNER_BY_ID_SQL, [id]);
}

async function getPartnerById(req, res) {
  try {
    const { id } = req.params;
    const rows = await fetchPartnerProfileById(id);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partner = rows[0];

    // ── Location scope enforcement ──────────────────────────
    const { effectivePermissions = [], locations = [] } = req.userPermissions || {};
    const isAdmin = effectivePermissions.includes('*');
    if (!isAdmin) {
      const allowedLocationIds = locations.map((l) => l.id).filter(Boolean);
      if (!allowedLocationIds.includes(partner.companyid)) {
        return res.status(403).json({ error: 'Partner not accessible from your location' });
      }
    }

    return res.json(partner);
  } catch (err) {
    console.error('Error fetching partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = {
  PARTNER_BY_ID_SQL,
  fetchPartnerProfileById,
  getPartnerById,
};
