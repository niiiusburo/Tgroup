/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/routes/ctv.js GET /commission-summary]
 * @crossref:uses[dbo.earnings.level, dbo.partners.referred_by_ctv_id, product-map/domains/earnings-commissions.yaml]
 *
 * Classifies each earnings row for the CTV portal. Level-0 commission is always service-card
 * attach (saleorders.ctv_id); customer profile referred_by_ctv_id does not grant commission.
 */

/** @typedef {'own_referral' | 'service_attached' | 'downline_override'} AttributionKind */

/**
 * @param {object} row
 * @param {string} viewerCtvId
 * @returns {{ attribution_kind: AttributionKind, override_level: number, attributed_ctv_id: string|null }}
 */
function classifyAttributionRow(row, viewerCtvId) {
  const level = Number(row.level ?? 0);
  const attributedCtvId = row.attributed_ctv_id || (level === 0 ? row.recipient_partner_id : null) || null;
  if (level > 0) {
    return {
      attribution_kind: 'downline_override',
      override_level: level,
      attributed_ctv_id: attributedCtvId,
    };
  }

  return {
    attribution_kind: 'service_attached',
    override_level: 0,
    attributed_ctv_id: attributedCtvId || viewerCtvId,
  };
}

function lineKey(serviceLineId, paymentId) {
  return `${serviceLineId || ''}::${paymentId || ''}`;
}

/**
 * Resolve level-0 (service-attached) CTV for override rows.
 * @param {import('../db.js').Queryable} db
 * @param {Array<{ service_line_id: string, payment_id: string|null }>} keys
 * @returns {Promise<Map<string, string>>}
 */
async function fetchLevel0Recipients(db, keys, safeQueryRows) {
  const map = new Map();
  if (!keys.length) return map;

  const lineIds = [...new Set(keys.map((k) => k.service_line_id).filter(Boolean))];
  if (!lineIds.length) return map;

  const rows = await safeQueryRows(
    db,
    `SELECT service_line_id, payment_id, recipient_partner_id
       FROM dbo.earnings
      WHERE level = 0
        AND amount > 0
        AND service_line_id = ANY($1)`,
    [lineIds]
  );

  for (const row of rows) {
    const key = lineKey(row.service_line_id, row.payment_id);
    if (!map.has(key)) map.set(key, row.recipient_partner_id);
  }
  return map;
}

/**
 * @param {import('../db.js').Queryable} db
 * @param {string[]} partnerIds
 * @param {(db: unknown, sql: string, params: unknown[]) => Promise<Array<{ id: string, name: string }>>} safeQueryRows
 */
async function fetchPartnerNames(db, partnerIds, safeQueryRows) {
  const names = new Map();
  if (!partnerIds.length) return names;
  const rows = await safeQueryRows(
    db,
    `SELECT id, name FROM dbo.partners WHERE id = ANY($1)`,
    [partnerIds]
  );
  for (const row of rows) names.set(row.id, row.name || null);
  return names;
}

/**
 * @param {Array<object>} rows earnings merged with lob
 * @param {string} viewerCtvId
 * @param {{ dentalDb: unknown, cosmeticDb: unknown, safeQueryRows: Function }} deps
 */
async function enrichCommissionAttribution(rows, viewerCtvId, { dentalDb, cosmeticDb, safeQueryRows }) {
  const overrideKeysByLob = { dental: [], cosmetic: [] };
  for (const row of rows) {
    const level = Number(row.level ?? 0);
    if (level > 0 && row.service_line_id) {
      overrideKeysByLob[row.lob].push({
        service_line_id: row.service_line_id,
        payment_id: row.payment_id || null,
      });
    }
  }

  const level0ByLob = {
    dental: await fetchLevel0Recipients(dentalDb, overrideKeysByLob.dental, safeQueryRows),
    cosmetic: await fetchLevel0Recipients(cosmeticDb, overrideKeysByLob.cosmetic, safeQueryRows),
  };

  const attributedIds = new Set();
  const enriched = rows.map((row) => {
    const level = Number(row.level ?? 0);
    let attributedCtvId = level === 0 ? row.recipient_partner_id : null;
    if (level > 0 && row.service_line_id) {
      const key = lineKey(row.service_line_id, row.payment_id);
      attributedCtvId = level0ByLob[row.lob]?.get(key) || null;
    }
    if (attributedCtvId) attributedIds.add(attributedCtvId);

    const withAttributed = { ...row, attributed_ctv_id: attributedCtvId };
    const classified = classifyAttributionRow(withAttributed, viewerCtvId);
    if (classified.attributed_ctv_id) attributedIds.add(classified.attributed_ctv_id);
    return { ...withAttributed, ...classified };
  });

  const [dentalNames, cosmeticNames] = await Promise.all([
    fetchPartnerNames(dentalDb, [...attributedIds], safeQueryRows),
    fetchPartnerNames(cosmeticDb, [...attributedIds], safeQueryRows),
  ]);
  const nameMap = new Map([...dentalNames, ...cosmeticNames]);

  return enriched.map((row) => ({
    ...row,
    attributed_ctv_name: row.attributed_ctv_id ? nameMap.get(row.attributed_ctv_id) || null : null,
    client_referred_by_me: !!(row.client_referred_by_ctv_id && row.client_referred_by_ctv_id === viewerCtvId),
  }));
}

/**
 * @param {object} e enriched row
 */
function mapCommissionApiRow(e) {
  return {
    id: e.id,
    client_id: e.client_id || null,
    client_name: e.client_name || null,
    service_line_id: e.service_line_id || null,
    service_name: e.service_name || null,
    payment_id: e.payment_id || null,
    amount: parseFloat(e.amount || 0),
    source: e.source || 'ctv',
    lob: e.lob,
    earned_at: e.earned_at || e.created_at,
    status: e.status,
    payout_id: e.payout_id || null,
    level: Number(e.level ?? 0),
    attribution_kind: e.attribution_kind,
    override_level: e.override_level ?? 0,
    attributed_ctv_id: e.attributed_ctv_id || null,
    attributed_ctv_name: e.attributed_ctv_name || null,
    client_referred_by_me: !!e.client_referred_by_me,
  };
}

module.exports = {
  classifyAttributionRow,
  enrichCommissionAttribution,
  mapCommissionApiRow,
  lineKey,
};