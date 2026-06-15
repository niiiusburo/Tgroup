'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[currently UNMOUNTED — getClientJourneys has no live consumer (former /api/ctv/client-journeys handler); keep in sync with ctv.js if re-wired]
 * @crossref:uses[api/src/db.js (getDb dental+cosmetic), api/src/services/ctvCardTrackingReferrals.js (buildCardTrackingReferrals), api/src/routes/ctvHelpers.js (safeQueryRows), product-map/domains/ctv.yaml]
 */

const { getDb } = require('../db');
const { safeQueryRows } = require('./ctvHelpers');
const { buildCardTrackingReferrals } = require('../services/ctvCardTrackingReferrals');

/**
 * Map card-based referral rows to legacy client-journeys contract shape.
 * @param {object[]} referrals
 */
function mapCardReferralsToClientJourneys(referrals) {
  return referrals.map((referral) => {
    const primaryService = referral.services?.[0];
    const client = {
      id: referral.id,
      name: referral.name,
      phone: referral.phone || '',
      lobs: referral.lobs || [],
      referred_at: referral.referred_at,
      referred_via: referral.tracking_source === 'card' ? 'card' : (primaryService?.source || 'direct'),
      stage: referral.stage,
      stage_progress: referral.stage_progress,
      total_earned: referral.total_earned ?? 0,
      estimated_commission: referral.total_earned ?? 0,
    };

    if (referral.last_visit_at || referral.stage_progress >= 2) {
      client.visit = { date: referral.last_visit_at || referral.referred_at };
    }
    if (primaryService) {
      client.service = {
        name: primaryService.serviceName || null,
        amount: primaryService.amount ?? 0,
        date: primaryService.earnedAt || undefined,
      };
    }
    if (referral.last_payment_at || referral.stage === 'paid') {
      client.payment = {
        amount: primaryService?.amount ?? 0,
        date: referral.last_payment_at || primaryService?.earnedAt || referral.referred_at,
        commission_earned: referral.total_earned ?? 0,
      };
    }

    return client;
  });
}

async function getClientJourneys(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const ctvId = employeeId;
  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    const referrals = await buildCardTrackingReferrals(ctvId, {
      dentalDb,
      cosmeticDb,
      safeQueryRows,
    });
    return res.json({ clients: mapCardReferralsToClientJourneys(referrals) });
  } catch (err) {
    console.error('[ctv GET /client-journeys] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getClientJourneys, mapCardReferralsToClientJourneys };