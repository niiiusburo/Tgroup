const express = require('express');
const multer = require('multer');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { recognize, createSubject, addExample } = require('../services/comprefaceClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const CONFIDENCE_THRESHOLD = 0.9;

/**
 * POST /api/face/recognize
 * Body: multipart/form-data with field `image`
 * Returns: { match: { partnerId, name, confidence } | null }
 */
router.post('/recognize', requirePermission('customers.view'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing image file' });
    }

    const results = await recognize(req.file.buffer, req.file.mimetype);
    const top = results[0];

    if (!top || top.similarity < CONFIDENCE_THRESHOLD) {
      return res.json({ match: null });
    }

    const partnerRows = await query(
      'SELECT id, name FROM dbo.partners WHERE face_subject_id = $1 AND isdeleted = false LIMIT 1',
      [top.subject]
    );

    if (!partnerRows || partnerRows.length === 0) {
      return res.json({ match: null });
    }

    return res.json({
      match: {
        partnerId: partnerRows[0].id,
        name: partnerRows[0].name,
        confidence: top.similarity,
      },
    });
  } catch (err) {
    console.error('Face recognize error:', err);
    return res.status(500).json({ error: err.message || 'Recognition failed' });
  }
});

/**
 * POST /api/face/register
 * Body: multipart/form-data with fields `partnerId` and `image`
 * Returns: { success: true, faceSubjectId }
 */
router.post('/register', requirePermission('customers.edit'), upload.single('image'), async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) {
      return res.status(400).json({ error: 'Missing partnerId' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Missing image file' });
    }

    const existing = await query(
      'SELECT face_subject_id FROM dbo.partners WHERE id = $1 AND isdeleted = false',
      [partnerId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    let faceSubjectId = existing[0].face_subject_id;
    if (!faceSubjectId) {
      faceSubjectId = partnerId; // use partner id as stable subject id
      await createSubject(faceSubjectId);
    }

    await addExample(faceSubjectId, req.file.buffer, req.file.mimetype);

    await query(
      `UPDATE dbo.partners SET face_subject_id = $1, face_registered_at = NOW() WHERE id = $2`,
      [faceSubjectId, partnerId]
    );

    return res.json({ success: true, faceSubjectId });
  } catch (err) {
    console.error('Face register error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

module.exports = router;
