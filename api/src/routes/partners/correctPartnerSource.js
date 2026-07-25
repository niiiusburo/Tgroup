'use strict';

const { withTransaction } = require('../../db');
const {
  normalizeSourceId,
  sourceIdsEqual,
} = require('../../lib/sourceChangeLock');
const {
  recordSourceChange,
  resolveActorId,
  resolveRequestId,
  resolveTransactionId,
} = require('../../services/sourceChangeAudit');

const PARTNER_SOURCE_CORRECTION_INVALID = 'PARTNER_SOURCE_CORRECTION_INVALID';
const PARTNER_SOURCE_CORRECTION_CONFLICT = 'PARTNER_SOURCE_CORRECTION_CONFLICT';

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
 * Only approved partner.sourceid mutation path (INV-025 / INV-027).
 * Normal Partner POST/PUT remain read-only for sourceid.
 */
async function correctPartnerSource(req, res) {
  try {
    const { id } = req.params;
    const {
      new_sourceid,
      expected_old_sourceid,
      reason,
      correction_manifest_ref,
    } = req.body || {};

    const reasonErr = trimRequired(reason, 'reason', 10);
    const manifestErr = trimRequired(correction_manifest_ref, 'correction_manifest_ref', 3);
    if (reasonErr || manifestErr) {
      return res.status(400).json({
        error: reasonErr || manifestErr,
        code: PARTNER_SOURCE_CORRECTION_INVALID,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'new_sourceid')) {
      return res.status(400).json({
        error: 'new_sourceid is required (use null to clear)',
        code: PARTNER_SOURCE_CORRECTION_INVALID,
      });
    }
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'expected_old_sourceid')) {
      return res.status(400).json({
        error: 'expected_old_sourceid is required for concurrency control',
        code: PARTNER_SOURCE_CORRECTION_INVALID,
      });
    }

    const actorId = resolveActorId(req);
    if (!actorId) {
      return res.status(401).json({ error: 'No actor on session' });
    }

    const requestId = resolveRequestId(req);
    const transactionId = resolveTransactionId();

    const outcome = await withTransaction(async (tx) => {
      const existing = await tx(
        `SELECT id, sourceid
         FROM dbo.partners
         WHERE id = $1 AND COALESCE(isdeleted, false) = false
         FOR UPDATE`,
        [id],
      );
      if (!existing?.length) {
        return { status: 404, body: { error: 'Partner not found' } };
      }

      const current = existing[0].sourceid ?? null;
      if (!sourceIdsEqual(current, expected_old_sourceid)) {
        return {
          status: 409,
          body: {
            error: 'expected_old_sourceid does not match current partner source',
            code: PARTNER_SOURCE_CORRECTION_CONFLICT,
            sourceid: current,
          },
        };
      }

      const nextSourceId = normalizeSourceId(new_sourceid) === null ? null : new_sourceid;
      if (sourceIdsEqual(current, nextSourceId)) {
        return {
          status: 400,
          body: {
            error: 'new_sourceid must differ from the current partner source',
            code: PARTNER_SOURCE_CORRECTION_INVALID,
          },
        };
      }

      if (nextSourceId !== null) {
        const sourceRows = await tx(
          `SELECT id, is_active FROM dbo.customersources WHERE id = $1 FOR SHARE`,
          [nextSourceId],
        );
        if (!sourceRows?.length || sourceRows[0].is_active !== true) {
          return {
            status: 400,
            body: {
              error: 'Customer source is inactive or does not exist',
              code: 'CUSTOMER_SOURCE_NOT_SELECTABLE',
            },
          };
        }
      }

      const updated = await tx(
        `UPDATE dbo.partners
         SET sourceid = $1,
             lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         WHERE id = $2 AND COALESCE(isdeleted, false) = false
         RETURNING *`,
        [nextSourceId, id],
      );
      if (!updated?.length) {
        return { status: 404, body: { error: 'Partner not found' } };
      }

      const audit = await recordSourceChange(tx, {
        entityType: 'partner',
        entityId: id,
        oldSourceId: current,
        newSourceId: nextSourceId,
        actorEmployeeId: actorId,
        requestId,
        transactionId,
        changeChannel: 'partner_source_correction',
        lockState: { locked: false, reasons: [] },
        correctionManifestRef: String(correction_manifest_ref).trim(),
        reason: String(reason).trim(),
      });

      return {
        status: 200,
        body: {
          partner: updated[0],
          audit,
        },
      };
    });

    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    console.error('Error correcting partner source:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = {
  PARTNER_SOURCE_CORRECTION_CONFLICT,
  PARTNER_SOURCE_CORRECTION_INVALID,
  correctPartnerSource,
};
