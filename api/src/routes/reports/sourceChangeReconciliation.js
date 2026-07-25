'use strict';

const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { buildSourceChangeReconciliation } = require('../../services/sourceChangeAudit');
const { err, validDate } = require('./helpers');

const router = express.Router();

/**
 * POST /api/Reports/source-change-reconciliation
 * Bounded append-only ledger report for operators.
 * Body: { dateFrom?, dateTo?, entityType?, unexpectedOnly?, limit?, offset? }
 */
router.post(
  '/source-change-reconciliation',
  requirePermission('reports.view'),
  async (req, res) => {
    try {
      const {
        dateFrom,
        dateTo,
        entityType,
        unexpectedOnly,
        limit,
        offset,
      } = req.body || {};

      if (dateFrom && !validDate(dateFrom)) return err(res, 400, 'Invalid dateFrom');
      if (dateTo && !validDate(dateTo)) return err(res, 400, 'Invalid dateTo');
      if (entityType && entityType !== 'partner' && entityType !== 'saleorder') {
        return err(res, 400, 'entityType must be partner or saleorder');
      }

      const report = await buildSourceChangeReconciliation(query, {
        dateFrom: dateFrom || null,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : null,
        entityType: entityType || null,
        unexpectedOnly: unexpectedOnly === true,
        limit,
        offset,
      });

      return res.json(report);
    } catch (error) {
      console.error('Error building source-change reconciliation:', error);
      return err(res, 500, error instanceof Error ? error.message : 'Unknown error');
    }
  },
);

module.exports = router;
