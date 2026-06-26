'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/clients routes]
 * @crossref:uses[@tgroup/contracts InvestorClientResponseSchema, dbo.investor_clients, dbo.partners]
 */
const { InvestorClientResponseSchema } = require('@tgroup/contracts');

const CLIENT_SELECT = `
  p.id,
  p.name,
  p.gender,
  p.birthyear AS birth_year,
  (SELECT COUNT(*)::int FROM dbo.appointments a
    WHERE a.partnerid = p.id) AS appointment_count,
  (SELECT COUNT(*)::int FROM dbo.saleorders so
    WHERE so.partnerid = p.id AND COALESCE(so.isdeleted, false) = false AND so.state != 'cancelled') AS order_count,
  COALESCE((
    SELECT GREATEST(0,
      COALESCE(SUM(CASE
        WHEN pay.payment_category = 'deposit'
          AND COALESCE(pay.deposit_type, 'deposit') = 'deposit'
          AND pay.amount > 0
        THEN pay.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE
        WHEN pay.deposit_type = 'usage' OR pay.method = 'deposit'
        THEN ABS(pay.amount) ELSE COALESCE(pay.deposit_used, 0) END), 0)
      - COALESCE(SUM(CASE
        WHEN pay.payment_category = 'deposit'
          AND (pay.deposit_type = 'refund' OR pay.amount < 0)
        THEN ABS(pay.amount) ELSE 0 END), 0)
    )
    FROM dbo.payments pay
    WHERE pay.customer_id = p.id AND pay.status != 'voided'
  ), 0)::float AS deposit_balance,
  COALESCE((
    SELECT COALESCE(SUM(so.residual), 0)::float
    FROM dbo.saleorders so
    WHERE so.partnerid = p.id
      AND so.state != 'cancelled'
      AND COALESCE(so.isdeleted, false) = false
  ), 0)::float AS outstanding_balance,
  CASE WHEN COALESCE(p.active, true) THEN 'active' ELSE 'inactive' END AS status
`;

const VISIBILITY_JOIN = `
  FROM dbo.investor_clients ic
  INNER JOIN dbo.partners p ON p.id = ic.partner_id
  WHERE ic.investor_id = $1
    AND ic.lob = $2
    AND ic.is_visible = true
    AND p.customer = true
    AND COALESCE(p.isdeleted, false) = false
`;

function parseSafeClient(row) {
  return InvestorClientResponseSchema.parse(row);
}

async function assertClientVisible(db, investorId, lob, partnerId) {
  const rows = await db(
    `SELECT 1 ${VISIBILITY_JOIN} AND ic.partner_id = $3 LIMIT 1`,
    [investorId, lob, partnerId]
  );
  return rows && rows.length > 0;
}

async function listVisibleClients(db, investorId, lob, { limit = 50, offset = 0 } = {}) {
  const countRows = await db(
    `SELECT COUNT(*)::int AS total ${VISIBILITY_JOIN}`,
    [investorId, lob]
  );
  const totalItems = countRows[0]?.total || 0;

  const rows = await db(
    `SELECT ${CLIENT_SELECT} ${VISIBILITY_JOIN}
     ORDER BY p.name ASC
     LIMIT $3 OFFSET $4`,
    [investorId, lob, limit, offset]
  );

  return {
    totalItems,
    items: rows.map(parseSafeClient),
  };
}

async function getVisibleClient(db, investorId, lob, partnerId) {
  const visible = await assertClientVisible(db, investorId, lob, partnerId);
  if (!visible) return null;

  const rows = await db(
    `SELECT ${CLIENT_SELECT} ${VISIBILITY_JOIN} AND ic.partner_id = $3 LIMIT 1`,
    [investorId, lob, partnerId]
  );
  if (!rows || rows.length === 0) return null;
  return parseSafeClient(rows[0]);
}

module.exports = {
  parseSafeClient,
  assertClientVisible,
  listVisibleClients,
  getVisibleClient,
};