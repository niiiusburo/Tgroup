const express = require('express');
const multer = require('multer');
const { requireAuth, requirePermission } = require('../middleware/auth');
const hosoClient = require('../services/hosoonlineClient');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
const {
  HOSOONLINE_API_KEY,
  HOSOONLINE_BASE_URL,
  HosoAuthError,
  HosoUploadImageError,
  authFailureCheckups,
  createHosoPatientForLocalCustomer,
  emptyCheckups,
  fetchCurrentHosoCheckups,
  getHosoRequestHeaders,
  getHosoUploadHeaders,
  getLocalPartner,
  hasHosoLoginCredentials,
  isHosoAuthFailure,
  normalizeHosoCheckups,
  prepareHosoUploadFile,
  resolveHosoPatientCode,
} = hosoClient;

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
        patientExists: currentData.patientExists,
        suggestedPatientCode: currentData.suggestedPatientCode,
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
      if (hosoRes.status === 404) {
        return res.json(emptyCheckups(hosoCode, customerName, 'hosoonline', {
          status: hosoRes.status,
          patientExists: false,
          suggestedPatientCode: hosoCode,
        }));
      }
      return res.json(emptyCheckups(hosoCode, customerName, 'hosoonline-unavailable', {
        status: hosoRes.status,
        message: 'Hosoonline is unavailable right now. Images could not be checked.',
        suggestedPatientCode: hosoCode,
      }));
    }

    const hosoData = await hosoRes.json();
    return res.json({
      patientCode: hosoData.patientCode || customerCode,
      patientName: hosoData.patientName || customerName,
      patientExists: true,
      suggestedPatientCode: hosoCode,
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
 * POST /api/ExternalCheckups/:customerCode/patient
 * Create a Hosoonline patient using the local TDental code plus phone suffix.
 */
router.post('/:customerCode/patient', requireAuth, requirePermission('external_checkups.upload'), async (req, res) => {
  try {
    const result = await createHosoPatientForLocalCustomer(req.params.customerCode);
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    if (error instanceof HosoAuthError) {
      return res.status(error.status).json({
        error: 'hosoonline authentication failed',
        status: error.status,
        detail: 'Check the configured Hosoonline API key before creating patients.',
      });
    }
    const status = Number(error.status) || 500;
    return res.status(status).json({
      error: status === 500 ? 'Failed to create Hosoonline patient' : error.message,
      detail: error.message,
    });
  }
});

/**
 * POST /api/ExternalCheckups/:customerCode/health-checkups
 * Create a new checkup + upload images to hosoonline.com.
 * Expects multipart/form-data.
 */
router.post('/:customerCode/health-checkups', requireAuth, requirePermission('external_checkups.upload'), upload.array('photos'), async (req, res) => {
  try {
    const { customerCode } = req.params;

    if (!HOSOONLINE_API_KEY && !hasHosoLoginCredentials()) {
      return res.status(503).json({ error: 'Hosoonline credentials not configured' });
    }

    const hosoCode = await resolveHosoPatientCode(customerCode);
    const body = req.body || {};

    if (!(body.title || body.service) || !body.doctor || !body.date) {
      return res.status(400).json({ error: 'service, doctor, and date are required' });
    }

    const form = new FormData();
    // Map frontend field names to hosoonline API field names
    const fieldMap = {
      service: body.title || body.service,
      doctor: body.doctor,
      date: body.date,
      description: body.notes || body.description,
      nextAppointmentDate: body.nextAppointmentDate,
      nextDescription: body.nextDescription,
    };

    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    });

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const preparedFile = await prepareHosoUploadFile(file);
        const photo = new Blob([preparedFile.buffer], { type: preparedFile.mimetype || 'application/octet-stream' });
        form.append('photos', photo, preparedFile.originalname);
      }
    }

    const hosoRes = await fetch(
      `${HOSOONLINE_BASE_URL}/api/patients/${encodeURIComponent(hosoCode)}/health-checkups`,
      {
        method: 'POST',
        headers: await getHosoUploadHeaders(),
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
    if (error instanceof HosoUploadImageError) {
      return res.status(error.status).json({
        error: 'unsupported image file',
        detail: error.message,
      });
    }
    console.error('ExternalCheckups upload error:', error);
    res.status(500).json({ error: 'Failed to upload external checkup' });
  }
});

module.exports = router;
module.exports._test = hosoClient;
