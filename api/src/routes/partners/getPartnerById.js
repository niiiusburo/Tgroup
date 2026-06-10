'use strict';

/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[GET /api/Partners/:id handler: api/src/routes/partners.js; called by website/src/lib/api/partners.ts]
 * @crossref:uses[api/src/db.js, api/src/services/referralClaim.js (getCtvLinkStatus), product-map/domains/customers-partners.yaml]
 */
const { query, getQuery } = require('../../db');

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
  p.face_subject_id,
  p.face_registered_at,
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
    const q = getQuery(req);
    const rows = await fetchPartnerProfileById(id, q);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partner = rows[0];

    // Attach CTV link status (6-month eligibility window). Keeps legacy ownerCtvId/ownerName/
    // active/expiresAt and adds anchorAt + eligible for the countdown bar.
    let referralClaim = null;
    if (partner && partner.id) {
      const { getCtvLinkStatus } = require('../../services/referralClaim');
      const lob = req.lob || 'dental';
      const s = await getCtvLinkStatus(partner.id, lob, {});
      referralClaim = {
        ownerCtvId: s.linkedCtvId,
        ownerName: s.linkedCtvName,
        active: s.active,
        expiresAt: s.expiresAt,
        anchorAt: s.anchorAt,
        eligible: s.eligible,
      };
    }

    return res.json({ ...partner, referralClaim });
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
