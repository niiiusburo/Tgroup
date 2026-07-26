'use strict';

const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { buildSourceChangeReconciliation } = require('../../services/sourceChangeAudit');
const { resolveInvestorScope } = require('../../services/permissionService');
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
      // DEC-20260704-01 / INV-021: every investor-reachable customer-derived read, report
      // and export must restrict rows to that investor's dbo.investor_clients allowlist, or
      // fail closed. This operator ledger spans both partner and saleorder entities and
      // carries entity ids, actor ids, reasons, request ids and manifest refs with no
      // per-entity customer join available, so it cannot be row-scoped without a wider
      // change. Deny investors before the ledger is queried rather than serve an unscoped
      // extract. 403 not 404 here: the path is static and carries no record id, so there is
      // no existence to leak -- unlike the source-correction endpoints.
      const investorScope = await resolveInvestorScope(req.user?.employeeId);
      if (investorScope.isInvestor) {
        return err(res, 403, 'Source-change reconciliation is not available for investor accounts');
      }

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
