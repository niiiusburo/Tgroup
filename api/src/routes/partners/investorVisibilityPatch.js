'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[PATCH /api/Partners/:id/investor-visibility]
 * @crossref:uses[dbo.investor_clients, dbo.investor_accounts, dbo.partners]
 */
const { InvestorVisibilityPatchSchema } = require('@tgroup/contracts');
const { getQuery } = require('../../db');
const { resolveLocationScope, sendLocationScopeError } = require('../../services/locationScope');

async function patchInvestorVisibility(req, res) {
  try {
    const parsed = InvestorVisibilityPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
    }

    const { investorId, isVisible } = parsed.data;
    const partnerId = req.params.id;
    const lob = (req.lob === 'cosmetic' || req.lob === 'dental') ? req.lob : 'dental';
    const db = getQuery(lob);
    const markedBy = req.user.employeeId;

    if (!markedBy) {
      return res.status(403).json({ error: 'Staff identity required', code: 'S_FORBIDDEN' });
    }

    const partners = await db(
      `SELECT id, companyid FROM dbo.partners
       WHERE id = $1 AND customer = true AND isdeleted = false
       LIMIT 1`,
      [partnerId]
    );
    if (!partners || partners.length === 0) {
      return res.status(404).json({ error: 'Client not found', code: 'U_PARTNER_NOT_FOUND' });
    }
    const locationScope = await resolveLocationScope(req, partners[0].companyid);
    if (sendLocationScopeError(res, locationScope)) return;

    const investors = await db(
      `SELECT id, lob, is_active, COALESCE(investor_name, email) AS name
       FROM dbo.investor_accounts
       WHERE id = $1
       LIMIT 1`,
      [investorId]
    );
    if (!investors || investors.length === 0) {
      return res.status(400).json({ error: 'Investor not found', code: 'U_INVESTOR_NOT_FOUND' });
    }

    const investor = investors[0];
    if (investor.lob !== lob) {
      return res.status(400).json({ error: 'Investor LOB mismatch', code: 'U_LOB_MISMATCH' });
    }
    if (!investor.is_active) {
      return res.status(400).json({ error: 'Investor is deactivated', code: 'S_INVESTOR_DEACTIVATED' });
    }

    await db(
      `INSERT INTO dbo.investor_clients
         (investor_id, partner_id, lob, is_visible, marked_by_partner_id, marked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (investor_id, partner_id, lob)
       DO UPDATE SET
         is_visible = EXCLUDED.is_visible,
         marked_by_partner_id = EXCLUDED.marked_by_partner_id,
         marked_at = NOW()`,
      [investorId, partnerId, lob, isVisible, markedBy]
    );

    return res.json({
      success: true,
      investorId,
      partnerId,
      isVisible,
      investorName: investor.name,
    });
  } catch (err) {
    console.error('[investorVisibility] PATCH error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_UPDATE_FAILED' });
  }
}

module.exports = { patchInvestorVisibility };
