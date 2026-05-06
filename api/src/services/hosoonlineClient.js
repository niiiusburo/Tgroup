'use strict';

const { query } = require('../db');

const HOSOONLINE_BASE_URL = process.env.HOSOONLINE_BASE_URL || 'https://hosoonline.com';
const HOSOONLINE_API_KEY = process.env.HOSOONLINE_API_KEY || null;
const HOSOONLINE_USERNAME = process.env.HOSOONLINE_USERNAME || null;
const HOSOONLINE_PASSWORD = process.env.HOSOONLINE_PASSWORD || null;
const HOSOONLINE_SESSION_TTL_MS = 25 * 60 * 1000;

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

async function getHosoUploadHeaders(extraHeaders = {}) {
  if (HOSOONLINE_API_KEY) return getHosoHeaders(extraHeaders);
  return getHosoRequestHeaders(extraHeaders);
}

async function getHosoPatientHeaders(extraHeaders = {}) {
  if (HOSOONLINE_API_KEY) return getHosoHeaders(extraHeaders);
  return getHosoRequestHeaders(extraHeaders);
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
  if (details.patientExists !== undefined) response.patientExists = details.patientExists;
  if (details.suggestedPatientCode) response.suggestedPatientCode = details.suggestedPatientCode;
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

function lastFourPhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '';
}

function buildHosoPatientCode(localCode, phone) {
  const code = String(localCode || '').trim();
  if (!code) return '';
  if (/^\d{4}[A-Za-z]/.test(code)) return code;
  const suffix = lastFourPhoneDigits(phone);
  return suffix ? `${suffix}${code}` : code;
}

function getHosoPatientCandidates(customerCode, partner) {
  const localCode = partner?.ref || customerCode;
  return [
    buildHosoPatientCode(localCode, partner?.phone),
    localCode,
    customerCode,
    partner?.phone,
  ].filter(Boolean);
}

async function searchHosoPatients(params = {}, options = {}) {
  const url = new URL('/api/patients/_search', HOSOONLINE_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  if (!url.searchParams.has('page')) url.searchParams.set('page', '1');

  try {
    const searchRes = await fetch(url.toString(), { headers: await getHosoPatientHeaders() });
    if (isHosoAuthFailure(searchRes.status)) {
      if (options.allowAuthFailure) return null;
      throw new HosoAuthError(searchRes.status);
    }
    if (!searchRes.ok) return null;
    return searchRes.json();
  } catch (err) {
    if (err instanceof HosoAuthError) throw err;
    console.error('ExternalCheckups hosoonline search error:', err);
    return null;
  }
}

async function searchHosoPatientByCode(code, options = {}) {
  const searchData = await searchHosoPatients({ code }, options);
  const rows = Array.isArray(searchData?.data) ? searchData.data : [];
  const normalizedCode = String(code || '').trim().toLowerCase();
  return rows.find((row) => String(row.code || '').trim().toLowerCase() === normalizedCode) || rows[0] || null;
}

async function findHosoPatientForLocalPartner(customerCode, partner, options = {}) {
  const candidates = [...new Set(getHosoPatientCandidates(customerCode, partner).map((candidate) => String(candidate).trim()).filter(Boolean))];
  for (const candidate of candidates) {
    const matched = await searchHosoPatientByCode(candidate, options);
    if (matched?.code) return matched;
  }
  return null;
}

async function resolveHosoPatientCode(customerCode) {
  if (hasHosoLoginCredentials()) {
    const partner = await getLocalPartner(customerCode);
    const matched = await findHosoPatientForLocalPartner(customerCode, partner, { allowAuthFailure: true });
    if (matched?.code) return matched.code;
    const appointmentMatch = await fetchHosoAppointments(customerCode);
    const appointmentCode = appointmentMatch.appointments.find((appointment) => appointment.customerCode)?.customerCode;
    if (appointmentCode) return appointmentCode;
    if (partner?.phone && partner.phone !== customerCode) {
      const phoneAppointmentMatch = await fetchHosoAppointments(partner.phone);
      const phoneAppointmentCode = phoneAppointmentMatch.appointments.find((appointment) => appointment.customerCode)?.customerCode;
      if (phoneAppointmentCode) return phoneAppointmentCode;
    }
    return buildHosoPatientCode(partner?.ref || customerCode, partner?.phone) || customerCode;
  }

  const testRes = await fetch(
    `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(customerCode)}/health-checkups`,
    { headers: await getHosoRequestHeaders() }
  );
  if (isHosoAuthFailure(testRes.status)) throw new HosoAuthError(testRes.status);
  if (testRes.status !== 404) return customerCode;

  const partner = await getLocalPartner(customerCode);
  const matched = await findHosoPatientForLocalPartner(customerCode, partner, { allowAuthFailure: true });
  if (matched?.code) return matched.code;

  if (partner?.phone && partner.phone !== customerCode) {
    const phoneTest = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(partner.phone)}/health-checkups`,
      { headers: await getHosoRequestHeaders() }
    );
    if (isHosoAuthFailure(phoneTest.status)) throw new HosoAuthError(phoneTest.status);
    if (phoneTest.status !== 404) return partner.phone;
  }
  return buildHosoPatientCode(partner?.ref || customerCode, partner?.phone) || customerCode;
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
  const suggestedPatientCode = buildHosoPatientCode(partner?.ref || customerCode, partner?.phone) || customerCode;
  const matched = await findHosoPatientForLocalPartner(customerCode, partner, { allowAuthFailure: true });
  const candidates = [matched?.code, ...getHosoPatientCandidates(customerCode, partner)];
  const uniqueCandidates = [...new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean))];

  for (const candidate of uniqueCandidates) {
    const result = await fetchHosoAppointments(candidate);
    if (result.appointments.length > 0 || result.total > 0) {
      const appointmentCode = result.appointments.find((appointment) => appointment.customerCode)?.customerCode;
      return {
        patientCode: matched?.code || appointmentCode || candidate,
        suggestedPatientCode,
        patientName: matched?.fullName || partner?.name || 'Unknown',
        patientExists: Boolean(matched?.code || appointmentCode),
        checkups: mapHosoAppointmentsToCheckups(result.appointments),
      };
    }
  }

  return {
    patientCode: matched?.code || suggestedPatientCode,
    suggestedPatientCode,
    patientName: matched?.fullName || partner?.name || 'Unknown',
    patientExists: Boolean(matched?.code),
    checkups: [],
  };
}

async function createHosoPatientForLocalCustomer(customerCode) {
  if (!HOSOONLINE_API_KEY) {
    const error = new Error('Hosoonline API key is required to create patients');
    error.status = 503;
    throw error;
  }

  const partner = await getLocalPartner(customerCode);
  const fullName = String(partner?.name || '').trim();
  const code = buildHosoPatientCode(partner?.ref || customerCode, partner?.phone);
  if (!code || !fullName) {
    const error = new Error('Local customer code and full name are required before creating a Hosoonline patient');
    error.status = 400;
    throw error;
  }

  const existing = await findHosoPatientForLocalPartner(customerCode, partner, { allowAuthFailure: true });
  if (existing?.code) {
    return { patient: existing, created: false, patientCode: existing.code, suggestedPatientCode: code };
  }

  const createRes = await fetch(`${HOSOONLINE_BASE_URL}/api/patients/_create`, {
    method: 'POST',
    headers: getHosoHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({ code, fullName }),
  });

  if (createRes.status === 409) {
    const conflicted = await searchHosoPatientByCode(code, { allowAuthFailure: true });
    return {
      patient: conflicted || { code, fullName },
      created: false,
      patientCode: conflicted?.code || code,
      suggestedPatientCode: code,
      conflict: true,
    };
  }

  if (isHosoAuthFailure(createRes.status)) throw new HosoAuthError(createRes.status);
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => 'Unknown error');
    const error = new Error(text);
    error.status = createRes.status;
    throw error;
  }

  const patient = await createRes.json();
  return {
    patient,
    created: true,
    patientCode: patient.code || code,
    suggestedPatientCode: code,
  };
}

module.exports = {
  HOSOONLINE_API_KEY,
  HOSOONLINE_BASE_URL,
  HosoAuthError,
  authFailureCheckups,
  buildHosoPatientCode,
  createHosoPatientForLocalCustomer,
  emptyCheckups,
  extractAccessTokenCookie,
  fetchCurrentHosoCheckups,
  getHosoHeaders,
  getHosoRequestHeaders,
  getHosoUploadHeaders,
  getLocalPartner,
  hasHosoLoginCredentials,
  imageProxyUrl,
  isHosoAuthFailure,
  mapHosoAppointmentsToCheckups,
  normalizeHosoCheckups,
  normalizeHosoImageUrl,
  resolveHosoPatientCode,
  searchHosoPatientByCode,
  searchHosoPatients,
};
