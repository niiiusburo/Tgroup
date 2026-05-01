'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getExportType, sanitizeFilters } = require('../services/exports/exportRegistry');
const { buildFilename } = require('../services/exports/exportWorkbook');
const { resolveEffectivePermissions } = require('../services/permissionService');

const router = express.Router();

function requireExportPermission(req, res, next) {
  const type = req.params.type;
  let permission;
  try {
    const entry = getExportType(type);
    permission = entry.permission;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  resolveEffectivePermissions(req.user.employeeId)
    .then(({ effectivePermissions }) => {
      if (!effectivePermissions.includes('*') && !effectivePermissions.includes(permission)) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }
      next();
    })
    .catch((err) => {
      console.error('Export permission check error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    });
}

/**
 * POST /api/Exports/:type/preview
 * Returns row count, summary, and filter info without generating the workbook.
 */
router.post('/:type/preview', requireAuth, requireExportPermission, async (req, res) => {
  try {
    const { type } = req.params;
    const entry = getExportType(type);
    const filters = sanitizeFilters(type, req.body.filters || {});
    const result = await entry.builder.preview(filters, req.user);

    return res.json({
      type,
      label: entry.label,
      rowCount: result.rowCount,
      filename: entry.filename(),
      filters: req.body.filters || {},
      summary: result.summary,
      exceedsMax: result.exceedsMax || false,
    });
  } catch (err) {
    console.error('Export preview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Exports/:type/download
 * Generates and streams the XLSX workbook.
 */
router.post('/:type/download', requireAuth, requireExportPermission, async (req, res) => {
  try {
    const { type } = req.params;
    const entry = getExportType(type);
    const filters = sanitizeFilters(type, req.body.filters || {});
    const { workbook } = await entry.builder.build(filters, req.user);

    const filename = entry.filename();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export download error:', err);
    if (err.code === 'EXPORT_ROW_LIMIT_EXCEEDED') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Exports/types
 * Lists available export types for UI configuration.
 */
router.get('/types', requireAuth, async (req, res) => {
  try {
    const { listExportTypes } = require('../services/exports/exportRegistry');
    const { effectivePermissions } = await resolveEffectivePermissions(req.user.employeeId);

    const allTypes = listExportTypes();
    const visibleTypes = allTypes.filter((t) =>
      effectivePermissions.includes('*') || effectivePermissions.includes(t.permission)
    );

    return res.json(visibleTypes);
  } catch (err) {
    console.error('Export types error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
