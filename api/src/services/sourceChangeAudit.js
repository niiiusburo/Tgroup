'use strict';

const crypto = require('crypto');
const {
  classifyUnexpectedChange,
  normalizeSourceId,
  sourceIdsEqual,
} = require('../lib/sourceChangeLock');
const { notifyUnexpectedSourceChange } = require('./sourceChangeAlert');

const ENTITY_TYPES = new Set(['partner', 'saleorder']);
const RECONCILE_MAX_LIMIT = 500;
const RECONCILE_DEFAULT_LIMIT = 100;

function resolveRequestId(reqOrId) {
  if (!reqOrId) return crypto.randomUUID().slice(0, 128);
  if (typeof reqOrId === 'string') return String(reqOrId).slice(0, 128);
  const header =
    reqOrId.headers?.['x-request-id']
    || reqOrId.headers?.['x-correlation-id']
    || null;
  return String(header || crypto.randomUUID()).slice(0, 128);
}

function resolveActorId(reqOrActor) {
  if (!reqOrActor) return null;
  if (typeof reqOrActor === 'string') return reqOrActor;
  return reqOrActor.user?.employeeId || reqOrActor.user?.id || null;
}

function resolveTransactionId(explicitId) {
  if (explicitId) return String(explicitId);
  return crypto.randomUUID();
}

/**
 * Insert one durable audit row for a successful source mutation.
 * Must run inside the same DB transaction as the entity UPDATE/INSERT.
 * Does nothing when old === new (callers should skip no-ops before calling).
 */
async function recordSourceChange(queryFn, input = {}) {
  const entityType = String(input.entityType || '').trim();
  if (!ENTITY_TYPES.has(entityType)) {
    throw new Error(`Invalid source-change entityType: ${entityType}`);
  }

  const entityId = input.entityId;
  if (!entityId) {
    throw new Error('entityId is required for source-change audit');
  }

  const oldSourceId = normalizeSourceId(input.oldSourceId) === null
    ? null
    : input.oldSourceId;
  const newSourceId = normalizeSourceId(input.newSourceId) === null
    ? null
    : input.newSourceId;

  if (sourceIdsEqual(oldSourceId, newSourceId)) {
    return null;
  }

  const changeChannel = String(input.changeChannel || '').trim();
  if (!changeChannel) {
    throw new Error('changeChannel is required for source-change audit');
  }

  const reason = String(input.reason || '').trim()
    || defaultReasonForChannel(changeChannel);
  if (!reason) {
    throw new Error('reason is required for source-change audit');
  }

  const unexpected = classifyUnexpectedChange({
    entityType,
    changeChannel,
    lockState: input.lockState || { locked: false, reasons: [] },
  });

  const id = input.id || crypto.randomUUID();
  const requestId = resolveRequestId(input.requestId);
  const transactionId = resolveTransactionId(input.transactionId);
  const actorEmployeeId = input.actorEmployeeId ?? null;
  const correctionManifestRef = input.correctionManifestRef
    ? String(input.correctionManifestRef).trim()
    : null;

  const rows = await queryFn(
    `INSERT INTO dbo.source_change_audit (
       id, entity_type, entity_id, old_sourceid, new_sourceid,
       actor_employee_id, reason, request_id, transaction_id,
       correction_manifest_ref, change_channel,
       is_unexpected, unexpected_reasons, alerted_at, created_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9,
       $10, $11,
       $12, $13::text[], NULL, NOW()
     )
     RETURNING *`,
    [
      id,
      entityType,
      entityId,
      oldSourceId,
      newSourceId,
      actorEmployeeId,
      reason,
      requestId,
      transactionId,
      correctionManifestRef,
      changeChannel,
      unexpected.isUnexpected,
      unexpected.reasons,
    ],
  );

  const auditRow = rows[0];

  if (unexpected.isUnexpected && input.alert !== false) {
    queueUnexpectedAlert(queryFn, auditRow, input.alertOptions);
  }

  return auditRow;
}

function defaultReasonForChannel(channel) {
  switch (channel) {
    case 'api_create':
      return 'Initial order source attribution on create';
    case 'api_patch':
      return 'Order source changed via ordinary API update';
    case 'source_correction':
      return 'Authorized source correction';
    case 'repair_manifest':
      return 'Record-scoped repair from approved correction manifest';
    case 'import_manifest':
      return 'Source applied from reviewed import manifest';
    case 'partner_source_correction':
      return 'Authorized partner source correction';
    default:
      return '';
  }
}

function queueUnexpectedAlert(queryFn, auditRow, alertOptions = {}) {
  setImmediate(() => {
    Promise.resolve()
      .then(async () => {
        const result = await notifyUnexpectedSourceChange(auditRow, alertOptions);
        if (result?.ok && !result.skipped && queryFn) {
          // Best-effort stamp; trigger blocks UPDATE so use a dedicated
          // alert-marker path only when the migration allows it.
          // alerted_at is set via INSERT-time NULL and stamped only if a
          // later migration opens a narrow allowlist. For now log success.
          console.info(
            '[SourceAudit] unexpected source change alerted',
            auditRow.id,
            auditRow.entity_id,
          );
        }
      })
      .catch((err) => {
        console.error('[SourceAudit] unexpected alert failed:', err?.message || err);
      });
  });
}

/**
 * Bounded reconciliation report over the append-only ledger.
 * Never mutates rows. Caps result size for operator safety.
 */
async function buildSourceChangeReconciliation(queryFn, options = {}) {
  const limit = Math.min(
    Math.max(parseInt(options.limit, 10) || RECONCILE_DEFAULT_LIMIT, 1),
    RECONCILE_MAX_LIMIT,
  );
  const offset = Math.max(parseInt(options.offset, 10) || 0, 0);
  const params = [];
  const conditions = [];
  let idx = 1;

  if (options.dateFrom) {
    conditions.push(`created_at >= $${idx}::timestamptz`);
    params.push(options.dateFrom);
    idx += 1;
  }
  if (options.dateTo) {
    conditions.push(`created_at <= $${idx}::timestamptz`);
    params.push(options.dateTo);
    idx += 1;
  }
  if (options.entityType) {
    conditions.push(`entity_type = $${idx}`);
    params.push(options.entityType);
    idx += 1;
  }
  if (options.unexpectedOnly === true) {
    conditions.push('is_unexpected = true');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const summaryRows = await queryFn(
    `SELECT
       COUNT(*)::int AS total_changes,
       COUNT(*) FILTER (WHERE is_unexpected)::int AS unexpected_changes,
       COUNT(*) FILTER (WHERE entity_type = 'saleorder')::int AS saleorder_changes,
       COUNT(*) FILTER (WHERE entity_type = 'partner')::int AS partner_changes,
       COUNT(*) FILTER (WHERE change_channel = 'api_patch')::int AS api_patch_changes,
       COUNT(*) FILTER (WHERE change_channel = 'source_correction')::int AS correction_changes
     FROM dbo.source_change_audit
     ${where}`,
    params,
  );

  const listParams = [...params, limit, offset];
  const listRows = await queryFn(
    `SELECT
       id, entity_type, entity_id, old_sourceid, new_sourceid,
       actor_employee_id, reason, request_id, transaction_id,
       correction_manifest_ref, change_channel,
       is_unexpected, unexpected_reasons, alerted_at, created_at
     FROM dbo.source_change_audit
     ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    listParams,
  );

  return {
    summary: summaryRows[0] || {
      total_changes: 0,
      unexpected_changes: 0,
      saleorder_changes: 0,
      partner_changes: 0,
      api_patch_changes: 0,
      correction_changes: 0,
    },
    rows: listRows,
    limit,
    offset,
    bounded: true,
  };
}

module.exports = {
  RECONCILE_MAX_LIMIT,
  RECONCILE_DEFAULT_LIMIT,
  ENTITY_TYPES,
  resolveRequestId,
  resolveActorId,
  resolveTransactionId,
  recordSourceChange,
  buildSourceChangeReconciliation,
  defaultReasonForChannel,
};
