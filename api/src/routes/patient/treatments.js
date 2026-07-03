'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/treatments]
 * @crossref:uses[dbo.saleorders, dbo.saleorderlines, dbo.dotkhams, dbo.dotkhamsteps, dbo.products]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/treatments
 * Returns treatment plans (saleorders) for this patient
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT s.id, s.name, s.code, s.state, s.amounttotal, s.residual, s.totalpaid,
              s.datestart, s.dateend, s.notes, s.datecreated,
              c.name as company_name, c.taxunitaddress as company_address, c.phone as company_phone,
              p.name as doctor_name,
              (SELECT string_agg(DISTINCT COALESCE(NULLIF(pr.name, ''), NULLIF(sl.productname, ''), NULLIF(sl.name, '')), ', ')
               FROM dbo.saleorderlines sl
               LEFT JOIN dbo.products pr ON pr.id = sl.productid
               WHERE sl.orderid = s.id) as service_names
       FROM dbo.saleorders s
       LEFT JOIN dbo.companies c ON c.id = s.companyid
       LEFT JOIN dbo.partners p ON p.id = s.doctorid
       WHERE s.partnerid = $1 AND COALESCE(s.isdeleted, false) = false
       ORDER BY s.datecreated DESC`,
      [partnerId]
    );

    return res.json({ success: true, treatments: rows });
  } catch (err) {
    console.error('[patientTreatments] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/patient/treatments/:id
 * Returns treatment plan + service lines + visits (dotkhams)
 */
router.get('/:id', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const treatmentId = req.params.id;

    // Treatment plan
    const treatment = await db(
      `SELECT s.id, s.name, s.code, s.state, s.amounttotal, s.residual, s.totalpaid,
              s.datestart, s.dateend, s.notes, s.datecreated,
              c.name as company_name, c.taxunitaddress as company_address, c.phone as company_phone,
              p.name as doctor_name
       FROM dbo.saleorders s
       LEFT JOIN dbo.companies c ON c.id = s.companyid
       LEFT JOIN dbo.partners p ON p.id = s.doctorid
       WHERE s.id = $1 AND s.partnerid = $2 AND COALESCE(s.isdeleted, false) = false`,
      [treatmentId, partnerId]
    );

    if (!treatment || treatment.length === 0) {
      return res.status(404).json({ error: 'Treatment not found', code: 'NOT_FOUND' });
    }

    // Service lines: prefer product.name, then saleorderline.productname, then line.name
    const lines = await db(
      `SELECT sl.id,
              COALESCE(NULLIF(pr.name, ''), NULLIF(sl.productname, ''), NULLIF(sl.name, ''), 'Dịch vụ') as product_name,
              sl.priceunit AS price_unit, sl.productuomqty AS quantity, sl.pricetotal AS price_total
       FROM dbo.saleorderlines sl
       LEFT JOIN dbo.products pr ON pr.id = sl.productid
       WHERE sl.orderid = $1`,
      [treatmentId]
    );

    // Visits (dotkhams)
    const visits = await db(
      `SELECT d.id, d.name, d.date, d.reason, d.state, d.note, d.totalamount, d.amountresidual,
              p.name as doctor_name
       FROM dbo.dotkhams d
       LEFT JOIN dbo.partners p ON p.id = d.doctorid
       WHERE d.saleorderid = $1 OR d.partnerid = $2
       ORDER BY d.date DESC`,
      [treatmentId, partnerId]
    );

    // Visit steps
    const visitIds = visits.map(v => v.id);
    let steps = [];
    if (visitIds.length > 0) {
      const placeholders = visitIds.map((_, i) => `$${i + 3}`).join(',');
      steps = await db(
        `SELECT ds.id, ds.saleorderid as dotkham_id, ds.isdone, ds.order,
                COALESCE(NULLIF(pr.name, ''), NULLIF(ds.name, ''), 'Bước') as product_name
         FROM dbo.dotkhamsteps ds
         LEFT JOIN dbo.products pr ON pr.id = ds.productid
         WHERE ds.saleorderid IN (${placeholders})`,
        [treatmentId, partnerId, ...visitIds]
      );
    }

    return res.json({
      success: true,
      treatment: {
        ...treatment[0],
        lines: lines || [],
        visits: visits.map(v => ({
          ...v,
          steps: steps.filter(s => s.dotkham_id === v.id) || []
        }))
      }
    });
  } catch (err) {
    console.error('[patientTreatments] detail error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
