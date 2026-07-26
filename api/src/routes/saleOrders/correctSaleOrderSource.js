'use strict';

const crypto = require('crypto');
const { withTransaction } = require('../../db');
const {
  SOURCE_CORRECTION_CONFLICT,
  SOURCE_CORRECTION_INVALID,
  loadSaleOrderSourceLockState,
  normalizeSourceId,
  sourceIdsEqual,
} = require('../../lib/saleOrderSourceLock');
const {
  recordSourceChange,
  resolveActorId,
  resolveRequestId,
  resolveTransactionId,
} = require('../../services/sourceChangeAudit');
const { resolveInvestorScope } = require('../../services/permissionService');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');
const { getCustomerSourceSelectionError } = require('./customerSourceSelection');

function trimRequired(value, field, minLen) {
  if (value === undefined || value === null) {
    return `${field} is required`;
  }
  const text = String(value).trim();
  if (text.length < minLen) {
    return `${field} must be at least ${minLen} characters`;
  }
  return null;
}

/**
 * Authorized sale-order source correction path.
 * Writes both the correction record and append-only source-change audit in the
 * same transaction as the source update.
 */
async function correctSaleOrderSource(req, res) {
  try {
    const { id } = req.params;

    const actorId = resolveActorId(req);
    if (!actorId) {
      return res.status(401).json({ error: 'No actor on session' });
    }

    // D21 / INV-021: investor writes are forbidden until a decision names the exact write
    // permission and scope, and none authorizes source correction. So EVERY investor is
    // denied -- before body validation, before the transaction, before any row lock, and
    // before any write or audit row. Being allowlisted for a customer grants read scope,
    // never write capability. 404 rather than 403 matches routes/saleOrders.js: a 403 would
    // confirm the order exists.
    //
    // On the mounted route requireNonInvestorPermission already proved this and set the
    // flag, so skip the duplicate scope query; this branch is the defence for direct
    // invocation (tests, internal callers) where no middleware ran.
    if (!req.nonInvestorVerified) {
      const investorScope = await resolveInvestorScope(actorId);
      if (investorScope.isInvestor) {
        return res.status(404).json({ error: 'Sale order not found' });
      }
    }

    const {
      new_sourceid,
      expected_old_sourceid,
      reason,
      evidence,
      rollback_reference,
      correction_manifest_ref,
    } = req.body || {};

    const reasonErr = trimRequired(reason, 'reason', 10);
    const evidenceErr = trimRequired(evidence, 'evidence', 5);
    const rollbackErr = trimRequired(rollback_reference, 'rollback_reference', 3);
    if (reasonErr || evidenceErr || rollbackErr) {
      return res.status(400).json({
        error: reasonErr || evidenceErr || rollbackErr,
        code: SOURCE_CORRECTION_INVALID,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'new_sourceid')) {
      return res.status(400).json({
        error: 'new_sourceid is required (use null to clear)',
        code: SOURCE_CORRECTION_INVALID,
      });
    }
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'expected_old_sourceid')) {
      return res.status(400).json({
        error: 'expected_old_sourceid is required for concurrency control',
        code: SOURCE_CORRECTION_INVALID,
      });
    }

    const requestId = resolveRequestId(req);
    const transactionId = resolveTransactionId();
    const manifestRef = correction_manifest_ref
      ? String(correction_manifest_ref).trim()
      : String(rollback_reference).trim();

    const outcome = await withTransaction(async (tx) => {
      const lockState = await loadSaleOrderSourceLockState(id, tx);
      if (!lockState) {
        return { status: 404, body: { error: 'Sale order not found' } };
      }

      if (!sourceIdsEqual(lockState.order_sourceid, expected_old_sourceid)) {
        return {
          status: 409,
          body: {
            error: 'expected_old_sourceid does not match current order source',
            code: SOURCE_CORRECTION_CONFLICT,
            order_sourceid: lockState.order_sourceid,
          },
        };
      }

      const nextSourceId = normalizeSourceId(new_sourceid) === null ? null : new_sourceid;
      if (sourceIdsEqual(lockState.order_sourceid, nextSourceId)) {
        return {
          status: 400,
          body: {
            error: 'new_sourceid must differ from the current order source',
            code: SOURCE_CORRECTION_INVALID,
          },
        };
      }

      const sourceError = await getCustomerSourceSelectionError(nextSourceId, id, tx);
      if (sourceError) {
        return { status: 400, body: sourceError };
      }

      const updated = await tx(
        `UPDATE dbo.saleorders
         SET sourceid = $1
         WHERE id = $2 AND COALESCE(isdeleted, false) = false
         RETURNING id, sourceid`,
        [nextSourceId, id],
      );
      if (!updated?.length) {
        return { status: 404, body: { error: 'Sale order not found' } };
      }

      const correctionId = crypto.randomUUID();
      const correctionRows = await tx(
        `INSERT INTO dbo.saleorder_source_corrections (
           id, saleorder_id, old_sourceid, new_sourceid,
           reason, evidence, rollback_reference,
           actor_employee_id, request_id, created_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7,
           $8, $9, NOW()
         )
         RETURNING id, saleorder_id, old_sourceid, new_sourceid,
                   reason, evidence, rollback_reference,
                   actor_employee_id, request_id, created_at`,
        [
          correctionId,
          id,
          lockState.order_sourceid,
          nextSourceId,
          String(reason).trim(),
          String(evidence).trim(),
          String(rollback_reference).trim(),
          actorId,
          requestId,
        ],
      );

      const audit = await recordSourceChange(tx, {
        entityType: 'saleorder',
        entityId: id,
        oldSourceId: lockState.order_sourceid,
        newSourceId: nextSourceId,
        actorEmployeeId: actorId,
        requestId,
        transactionId,
        changeChannel: 'source_correction',
        lockState,
        correctionManifestRef: manifestRef,
        reason: [
          String(reason).trim(),
          `evidence=${String(evidence).trim()}`,
          `rollback=${String(rollback_reference).trim()}`,
        ].join(' | '),
      });

      const orderRows = await fetchSaleOrderById(id, tx);
      return {
        status: 200,
        body: {
          order: orderRows[0],
          correction: correctionRows[0],
          audit,
        },
      };
    });

    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Error correcting sale order source:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = {
  SOURCE_CORRECTION_CONFLICT,
  SOURCE_CORRECTION_INVALID,
  correctSaleOrderSource,
};
