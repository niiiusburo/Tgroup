const express = require('express');
const { query } = require('../db');
const multer = require('multer');
const FormData = require('form-data');
const { requireAuth, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Environment/config for hosoonline integration
const HOSOONLINE_BASE_URL = process.env.HOSOONLINE_BASE_URL || 'https://hosoonline.com';
const HOSOONLINE_API_KEY = process.env.HOSOONLINE_API_KEY || null;
const HOSOONLINE_USERNAME = process.env.HOSOONLINE_USERNAME || null;
const HOSOONLINE_PASSWORD = process.env.HOSOONLINE_PASSWORD || null;
const HOSOONLINE_SESSION_TTL_MS = 25 * 60 * 1000;

const upload = multer({ storage: multer.memoryStorage() });
let hosoSession = null;

class HosoAuthError extends Error {
  constructor(status) {
    super('Hosoonline authentication failed');
    this.status = status;
  }
}

function isHosoAuthFailure(status) {
  return status === 401 || status === 403;
}

function getHosoHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (!HOSOONLINE_API_KEY) return headers;
  headers['X-API-Key'] = HOSOONLINE_API_KEY;
  return headers;
}

function hasHosoLoginCredentials() {
  return Boolean(HOSOONLINE_USERNAME && HOSOONLINE_PASSWORD);
}

function extractAccessTokenCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/(?:^|,\s*)(access_token=[^;]+)/);
  return match?.[1] || null;
}

async function getHosoSession() {
  if (!hasHosoLoginCredentials()) return null;
  if (hosoSession && hosoSession.expiresAt > Date.now()) return hosoSession;

  const loginRes = await fetch(`${HOSOONLINE_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      username: HOSOONLINE_USERNAME,
      password: HOSOONLINE_PASSWORD,
    }),
  });

  if (isHosoAuthFailure(loginRes.status)) throw new HosoAuthError(loginRes.status);
  if (!loginRes.ok) {
    console.warn('ExternalCheckups hosoonline login unavailable:', { status: loginRes.status });
    return null;
  }

  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginData.token) {
    console.warn('ExternalCheckups hosoonline login did not return a token');
    return null;
  }

  hosoSession = {
    token: loginData.token,
    cookie: extractAccessTokenCookie(loginRes.headers.get('set-cookie')),
    expiresAt: Date.now() + HOSOONLINE_SESSION_TTL_MS,
  };
  return hosoSession;
}

async function getHosoRequestHeaders(extraHeaders = {}) {
  const session = await getHosoSession();
  if (!session) return getHosoHeaders(extraHeaders);

  const headers = {
    ...extraHeaders,
    Authorization: `Bearer ${session.token}`,
  };
  if (session.cookie) headers.Cookie = session.cookie;
  return headers;
}

function emptyCheckups(customerCode, patientName, source = 'hosoonline-unavailable', details = {}) {
  const response = {
    patientCode: customerCode,
    patientName,
    source,
    checkups: [],
  };

  if (details.status) response.status = details.status;
  if (details.message) response.message = details.message;
  return response;
}

function authFailureCheckups(customerCode, patientName, status) {
  return emptyCheckups(customerCode, patientName, 'hosoonline-auth-failed', {
    status,
    message: 'Hosoonline authentication failed. Check the configured Hosoonline API key before images can load.',
  });
}

async function getLocalPartner(customerCode) {
  let partner = null;
  try {
    const byCode = await query('SELECT id, name, phone, ref FROM partners WHERE TRIM(ref) = TRIM($1) LIMIT 1', [customerCode]);
    if (byCode[0]) partner = byCode[0];
  } catch (dbErr) {
    console.error('ExternalCheckups DB error (ref lookup):', dbErr.message || dbErr);
  }

  if (!partner) {
    try {
      const byPhone = await query('SELECT id, name, phone, ref FROM partners WHERE phone = $1 LIMIT 1', [customerCode]);
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
      { headers: await getHosoRequestHeaders() }
    );
    if (isHosoAuthFailure(searchRes.status)) throw new HosoAuthError(searchRes.status);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    return searchData.data?.[0] || null;
  } catch (err) {
    if (err instanceof HosoAuthError) throw err;
    console.error('ExternalCheckups hosoonline search error:', err);
    return null;
  }
}

async function resolveHosoPatientCode(customerCode) {
  if (hasHosoLoginCredentials()) {
    const matched = await searchHosoPatientByCode(customerCode);
    if (matched?.code) return matched.code;

    const partner = await getLocalPartner(customerCode);
    if (partner?.phone && partner.phone !== customerCode) {
      const phoneMatched = await searchHosoPatientByCode(partner.phone);
      if (phoneMatched?.code) return phoneMatched.code;
    }
    return customerCode;
  }

  const testRes = await fetch(
    `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(customerCode)}/health-checkups`,
    { headers: await getHosoRequestHeaders() }
  );
  if (isHosoAuthFailure(testRes.status)) throw new HosoAuthError(testRes.status);
  if (testRes.status !== 404) return customerCode;

  const matched = await searchHosoPatientByCode(customerCode);
  if (matched?.code) return matched.code;

  const partner = await getLocalPartner(customerCode);
  if (partner?.phone && partner.phone !== customerCode) {
    const phoneTest = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(partner.phone)}/health-checkups`,
      { headers: await getHosoRequestHeaders() }
    );
    if (isHosoAuthFailure(phoneTest.status)) throw new HosoAuthError(phoneTest.status);
    if (phoneTest.status !== 404) return partner.phone;
  }
  return customerCode;
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return null;
}

function imageProxyUrl(imageLink) {
  return `/api/ExternalCheckups/images/${encodeURIComponent(imageLink)}`;
}

function normalizeHosoImageUrl(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/^http:\/\//i, 'https://');
}

function normalizeHosoCheckups(checkups) {
  if (!Array.isArray(checkups)) return [];
  return checkups.map((checkup) => ({
    ...checkup,
    images: (checkup.images || []).map((img) => ({
      ...img,
      url: normalizeHosoImageUrl(img.url),
      thumbnailUrl: normalizeHosoImageUrl(img.thumbnailUrl),
    })),
  }));
}

function mapHosoAppointmentsToCheckups(appointments) {
  return appointments.map((appointment) => ({
    id: appointment._id,
    date: toDateOnly(appointment.date) || '',
    title: appointment.service || 'Health checkup',
    notes: appointment.description || '',
    doctor: appointment.doctor || '',
    nextAppointmentDate: toDateOnly(appointment.nextAppointmentDate),
    nextDescription: appointment.nextDescription || '',
    images: (appointment.media || []).map((media) => ({
      url: imageProxyUrl(media.imageLink),
      thumbnailUrl: imageProxyUrl(media.imageLink),
      label: media.imageLink,
      uploadedAt: appointment.createdAt || appointment.date || undefined,
    })),
  }));
}

async function fetchHosoAppointments(queryText) {
  const allAppointments = [];
  let total = 0;

  for (let page = 0; page < 50; page += 1) {
    const searchRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/appointments/search?q=${encodeURIComponent(queryText)}&page=${page}`,
      { headers: await getHosoRequestHeaders() }
    );

    if (isHosoAuthFailure(searchRes.status)) throw new HosoAuthError(searchRes.status);
    if (!searchRes.ok) {
      const text = await searchRes.text().catch(() => 'Unknown error');
      console.warn('ExternalCheckups hosoonline appointment search unavailable:', {
        status: searchRes.status,
        detail: text.slice(0, 200),
      });
      return { appointments: [], total: 0, status: searchRes.status };
    }

    const searchData = await searchRes.json();
    const pageAppointments = Array.isArray(searchData.data) ? searchData.data : [];
    total = Number(searchData.total || pageAppointments.length || total);
    allAppointments.push(...pageAppointments);

    if (pageAppointments.length === 0 || allAppointments.length >= total) break;
  }

  return { appointments: allAppointments, total };
}

async function fetchCurrentHosoCheckups(customerCode, partner) {
  const candidates = [customerCode, partner?.ref, partner?.phone].filter(Boolean);
  const matched = await searchHosoPatientByCode(customerCode);
  if (matched?.code) candidates.push(matched.code);

  const uniqueCandidates = [...new Set(candidates.map((candidate) => String(candidate).trim()).filter(Boolean))];
  for (const candidate of uniqueCandidates) {
    const result = await fetchHosoAppointments(candidate);
    if (result.appointments.length > 0 || result.total > 0) {
      return {
        patientCode: matched?.code || customerCode,
        patientName: matched?.fullName || partner?.name || 'Unknown',
        checkups: mapHosoAppointmentsToCheckups(result.appointments),
      };
    }
  }

  return {
    patientCode: matched?.code || customerCode,
    patientName: matched?.fullName || partner?.name || 'Unknown',
    checkups: [],
  };
}

router.get('/images/:imageName', requireAuth, requirePermission('external_checkups.view'), async (req, res) => {
  try {
    if (!HOSOONLINE_API_KEY && !hasHosoLoginCredentials()) {
      return res.status(503).json({ error: 'Hosoonline credentials not configured' });
    }

    const imageName = req.params.imageName;
    const hosoRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/appointments/image/${encodeURIComponent(imageName)}`,
      { headers: await getHosoRequestHeaders() }
    );

    if (isHosoAuthFailure(hosoRes.status)) {
      return res.status(hosoRes.status).json({
        error: 'hosoonline authentication failed',
        status: hosoRes.status,
        detail: 'Check the configured Hosoonline login credentials before images can load.',
      });
    }

    if (!hosoRes.ok) {
      return res.status(hosoRes.status).json({ error: 'hosoonline image fetch failed', status: hosoRes.status });
    }

    const buffer = Buffer.from(await hosoRes.arrayBuffer());
    res.setHeader('Content-Type', hosoRes.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(buffer);
  } catch (error) {
    if (error instanceof HosoAuthError) {
      return res.status(error.status).json({
        error: 'hosoonline authentication failed',
        status: error.status,
        detail: 'Check the configured Hosoonline login credentials before images can load.',
      });
    }
    console.error('ExternalCheckups image proxy error:', error);
    return res.status(500).json({ error: 'Failed to proxy external checkup image' });
  }
});

/**
 * GET /api/ExternalCheckups/:customerCode
 * Proxy health-checkup images from hosoonline.com for a given patient.
 */
router.get('/:customerCode', requireAuth, requirePermission('external_checkups.view'), async (req, res) => {
  try {
    const { customerCode } = req.params;
    const partner = await getLocalPartner(customerCode);
    const customerName = partner?.name || 'Unknown';

    if (!HOSOONLINE_API_KEY && !hasHosoLoginCredentials()) {
      return res.json(emptyCheckups(customerCode, customerName, 'hosoonline-not-configured'));
    }

    if (hasHosoLoginCredentials()) {
      const currentData = await fetchCurrentHosoCheckups(customerCode, partner);
      return res.json({
        patientCode: currentData.patientCode,
        patientName: currentData.patientName,
        source: 'hosoonline',
        checkups: currentData.checkups,
      });
    }

    const hosoCode = await resolveHosoPatientCode(customerCode);
    const hosoRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(hosoCode)}/health-checkups`,
      { headers: await getHosoRequestHeaders() }
    );

    if (isHosoAuthFailure(hosoRes.status)) {
      return res.json(authFailureCheckups(hosoCode, customerName, hosoRes.status));
    }

    if (!hosoRes.ok) {
      const text = await hosoRes.text().catch(() => 'Unknown error');
      console.warn('ExternalCheckups hosoonline unavailable:', {
        status: hosoRes.status,
        detail: text.slice(0, 200),
      });
      return res.json(emptyCheckups(hosoCode, customerName, 'hosoonline-unavailable', {
        status: hosoRes.status,
        message: 'Hosoonline is unavailable right now. Images could not be checked.',
      }));
    }

    const hosoData = await hosoRes.json();
    return res.json({
      patientCode: hosoData.patientCode || customerCode,
      patientName: hosoData.patientName || customerName,
      source: 'hosoonline',
      checkups: normalizeHosoCheckups(hosoData.checkups),
    });
  } catch (error) {
    if (error instanceof HosoAuthError) {
      const customerCode = req.params.customerCode;
      const partner = await getLocalPartner(customerCode);
      const customerName = partner?.name || 'Unknown';
      return res.json(authFailureCheckups(customerCode, customerName, error.status));
    }
    console.error('ExternalCheckups error:', error);
    const customerCode = req.params.customerCode;
    res.json(emptyCheckups(customerCode, 'Unknown'));
  }
});

/**
 * POST /api/ExternalCheckups/:customerCode/health-checkups
 * Create a new checkup + upload images to hosoonline.com.
 * Expects multipart/form-data.
 */
router.post('/:customerCode/health-checkups', requireAuth, requirePermission('external_checkups.create'), upload.array('files'), async (req, res) => {
  try {
    const { customerCode } = req.params;

    if (!HOSOONLINE_API_KEY && !hasHosoLoginCredentials()) {
      return res.status(503).json({ error: 'Hosoonline credentials not configured' });
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
        headers: await getHosoRequestHeaders(form.getHeaders()),
        body: form,
      }
    );

    if (!hosoRes.ok) {
      const text = await hosoRes.text().catch(() => 'Unknown error');
      if (isHosoAuthFailure(hosoRes.status)) {
        return res.status(hosoRes.status).json({
          error: 'hosoonline authentication failed',
          status: hosoRes.status,
          detail: 'Check the configured Hosoonline API key before uploading health checkup images.',
        });
      }
      return res.status(hosoRes.status).json({
        error: 'hosoonline upload failed',
        status: hosoRes.status,
        detail: text,
      });
    }

    const hosoData = await hosoRes.json();
    return res.status(201).json(hosoData);
  } catch (error) {
    if (error instanceof HosoAuthError) {
      return res.status(error.status).json({
        error: 'hosoonline authentication failed',
        status: error.status,
        detail: 'Check the configured Hosoonline API key before uploading health checkup images.',
      });
    }
    console.error('ExternalCheckups upload error:', error);
    res.status(500).json({ error: 'Failed to upload external checkup' });
  }
});

module.exports = router;
module.exports._test = {
  extractAccessTokenCookie,
  getHosoHeaders,
  getLocalPartner,
  imageProxyUrl,
  isHosoAuthFailure,
  mapHosoAppointmentsToCheckups,
  normalizeHosoImageUrl,
  normalizeHosoCheckups,
};
