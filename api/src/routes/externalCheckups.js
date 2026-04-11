const express = require('express');
const { query } = require('../db');
const multer = require('multer');
const FormData = require('form-data');
const { requireAuth, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Environment/config for hosoonline integration
const HOSOONLINE_BASE_URL = process.env.HOSOONLINE_BASE_URL || 'https://hosoonline.com';
const HOSOONLINE_API_KEY = process.env.HOSOONLINE_API_KEY || null;

const upload = multer({ storage: multer.memoryStorage() });

async function getLocalPartner(customerCode) {
  let partner = null;
  try {
    const byCode = await query('SELECT id, name, phone FROM partners WHERE code = $1 LIMIT 1', [customerCode]);
    if (byCode[0]) partner = byCode[0];
  } catch (dbErr) {
    if (!String(dbErr.message || '').includes('column "code" does not exist')) {
      console.error('ExternalCheckups DB error (code lookup):', dbErr.message || dbErr);
    }
  }

  if (!partner) {
    try {
      const byPhone = await query('SELECT id, name, phone FROM partners WHERE phone = $1 LIMIT 1', [customerCode]);
      if (byPhone[0]) partner = byPhone[0];
    } catch (dbErr) {
      console.error('ExternalCheckups DB error (phone lookup):', dbErr.message || dbErr);
    }
  }
  return partner;
}

async function searchHosoPatientByCode(code) {
  try {
    const searchRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients?code=${encodeURIComponent(code)}`,
      { headers: { 'X-API-Key': HOSOONLINE_API_KEY } }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    return searchData.data?.[0] || null;
  } catch (err) {
    console.error('ExternalCheckups hosoonline search error:', err);
    return null;
  }
}

async function resolveHosoPatientCode(customerCode) {
  // Try direct first
  let testRes = await fetch(
    `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(customerCode)}/health-checkups`,
    { method: 'HEAD', headers: { 'X-API-Key': HOSOONLINE_API_KEY } }
  );
  // Since HEAD might not be supported, just try a lightweight GET
  testRes = await fetch(
    `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(customerCode)}/health-checkups`,
    { headers: { 'X-API-Key': HOSOONLINE_API_KEY } }
  );
  if (testRes.status !== 404) return customerCode;

  const matched = await searchHosoPatientByCode(customerCode);
  if (matched?.code) return matched.code;

  const partner = await getLocalPartner(customerCode);
  if (partner?.phone && partner.phone !== customerCode) {
    const phoneTest = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(partner.phone)}/health-checkups`,
      { headers: { 'X-API-Key': HOSOONLINE_API_KEY } }
    );
    if (phoneTest.status !== 404) return partner.phone;
  }
  return customerCode;
}

/**
 * GET /api/ExternalCheckups/:customerCode
 * Proxy health-checkup images from hosoonline.com for a given patient.
 */
router.get('/:customerCode', requireAuth, requirePermission('external_checkups.view'), async (req, res) => {
  try {
    const { customerCode } = req.params;
    const partner = await getLocalPartner(customerCode);
    const customerName = partner?.name || 'Unknown';

    if (!HOSOONLINE_API_KEY) {
      return res.status(503).json({
        error: 'Hosoonline API key not configured',
        patientCode: customerCode,
        patientName: customerName,
        checkups: [],
      });
    }

    const hosoCode = await resolveHosoPatientCode(customerCode);
    const hosoRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(hosoCode)}/health-checkups`,
      { headers: { 'X-API-Key': HOSOONLINE_API_KEY } }
    );

    if (!hosoRes.ok) {
      const text = await hosoRes.text().catch(() => 'Unknown error');
      return res.status(hosoRes.status).json({
        error: 'hosoonline request failed',
        status: hosoRes.status,
        detail: text,
      });
    }

    const hosoData = await hosoRes.json();
    return res.json({
      patientCode: hosoData.patientCode || customerCode,
      patientName: hosoData.patientName || customerName,
      source: 'hosoonline',
      checkups: hosoData.checkups || [],
    });
  } catch (error) {
    console.error('ExternalCheckups error:', error);
    res.status(500).json({ error: 'Failed to fetch external checkups' });
  }
});

/**
 * POST /api/ExternalCheckups/:customerCode/health-checkups
 * Create a new checkup + upload images to hosoonline.com.
 * Expects multipart/form-data.
 */
router.post('/:customerCode/health-checkups', requireAuth, requirePermission('external_checkups.view'), upload.array('files'), async (req, res) => {
  try {
    const { customerCode } = req.params;

    if (!HOSOONLINE_API_KEY) {
      return res.status(503).json({ error: 'Hosoonline API key not configured' });
    }

    const hosoCode = await resolveHosoPatientCode(customerCode);

    const body = req.body || {};

    if (!body.title || !body.doctor || !body.date) {
      return res.status(400).json({ error: 'title, doctor, and date are required' });
    }

    const form = new FormData();
    // Map fields expected by hosoonline
    const fieldMap = {
      title: body.title || body.service,
      doctor: body.doctor,
      date: body.date,
      notes: body.notes,
      nextAppointmentDate: body.nextAppointmentDate,
      nextDescription: body.nextDescription,
    };

    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    });

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        form.append('files', file.buffer, file.originalname);
      });
    }

    const hosoRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(hosoCode)}/health-checkups`,
      {
        method: 'POST',
        headers: { 'X-API-Key': HOSOONLINE_API_KEY, ...form.getHeaders() },
        body: form,
      }
    );

    if (!hosoRes.ok) {
      const text = await hosoRes.text().catch(() => 'Unknown error');
      return res.status(hosoRes.status).json({
        error: 'hosoonline upload failed',
        status: hosoRes.status,
        detail: text,
      });
    }

    const hosoData = await hosoRes.json();
    return res.status(201).json(hosoData);
  } catch (error) {
    console.error('ExternalCheckups upload error:', error);
    res.status(500).json({ error: 'Failed to upload external checkup' });
  }
});

module.exports = router;
