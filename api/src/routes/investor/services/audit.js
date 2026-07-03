'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/* routes]
 * @crossref:uses[dbo.investor_view_audit]
 */
const { getQuery } = require('../../../db');

async function logInvestorView(investor, action, req, { resourceId = null, rowCount = null } = {}) {
  try {
    const db = getQuery(investor.lob);
    await db(
      `INSERT INTO dbo.investor_view_audit
         (investor_id, action, resource_id, row_count, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        investor.id,
        action,
        resourceId,
        rowCount,
        req.ip || req.socket?.remoteAddress || null,
        req.get('user-agent') || null,
      ]
    );
  } catch (err) {
    console.error('[investorAudit] non-blocking write failed:', err.message);
  }
}

module.exports = { logInvestorView };