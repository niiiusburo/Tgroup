'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/ctvNetwork]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[buildCtvNetwork, buildCtvHierarchy, getCtvHierarchy]
 * @crossref:uses[api/src/routes/ctv.js, website/src/pages/CTV/tabs/CtvNetworkTab.tsx, product-map/domains/earnings-commissions.yaml]
 */
// Fallback override shares (%) an upline earns from a downline member that many levels
// below them — used only when dbo.commission_level_config is unavailable. Mirrors the
// migration-049 seed (L1 14.5 / L2 7.3 / L3 3.6 / L4 1.8). Level 0 (self) is excluded
// because the member keeps their own direct commission; uplines earn the override above.
const STANDARD_OVERRIDE_SHARES = { 1: 14.5, 2: 7.3, 3: 3.6, 4: 1.8 };

function mergeById(dCtvs, cCtvs, clientCounts, earnRows) {
  const byId = new Map();
  for (const [lob, rows] of [['dental', dCtvs], ['cosmetic', cCtvs]]) {
    for (const row of rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, {
          id: row.id,
          name: row.name,
          phone: row.phone || '',
          email: row.email || '',
          active: row.active !== false,
          referred_by_ctv_id: row.referred_by_ctv_id || null,
          datecreated: row.datecreated,
          lobs: [],
          client_count: 0,
          active_earnings_sum: 0,
        });
      }
      byId.get(row.id).lobs.push(lob);
    }
  }
  for (const r of clientCounts) {
    const node = byId.get(r.ctv_id);
    if (node) node.client_count += parseInt(r.count || '0', 10);
  }
  for (const r of earnRows) {
    const node = byId.get(r.ctv_id);
    if (node) node.active_earnings_sum += parseFloat(r.amount || '0');
  }
  return byId;
}

function buildCtvNetwork({ ctvId, dentalCtvs = [], cosmeticCtvs = [], dentalClientCounts = [], cosmeticClientCounts = [], dentalEarnings = [], cosmeticEarnings = [] }) {
  const byId = mergeById(dentalCtvs, cosmeticCtvs, [...dentalClientCounts, ...cosmeticClientCounts], [...dentalEarnings, ...cosmeticEarnings]);
  const root = byId.get(ctvId) || { id: ctvId, children: [] };
  // Cycle guard: pre-mark this CTV's direct upline as visited so a corrupt back-edge
  // (upline.referred_by_ctv_id === ctvId) can't surface the upline as a descendant.
  const visited = new Set(root.referred_by_ctv_id ? [root.referred_by_ctv_id] : []);
  function children(parentId, depth) {
    if (depth >= 5 || visited.has(parentId)) return [];
    visited.add(parentId);
    return Array.from(byId.values())
      .filter((n) => n.referred_by_ctv_id === parentId && !visited.has(n.id))
      .map((n) => ({ ...n, level: depth + 1, children: children(n.id, depth + 1) }));
  }
  const direct = Array.from(byId.values()).filter((n) => n.referred_by_ctv_id === ctvId && n.id !== root.referred_by_ctv_id);
  const upline = root.referred_by_ctv_id && byId.has(root.referred_by_ctv_id) ? byId.get(root.referred_by_ctv_id) : null;
  return {
    self: { ...root, level: 0, children: undefined },
    upline: upline ? { ...upline, children: undefined } : null,
    direct: direct.map((n) => ({ ...n, children: undefined })),
    downline: children(ctvId, 0),
  };
}

/**
 * buildCtvHierarchy — shape the CTV network for the NEW portal's Network tab
 * (CtvNetworkTab → CtvHierarchyPanel, which expects `CtvHierarchyResponse`):
 *   { current, upline: Node[], downline: Node[] (flat), totals }
 * Node = { id, name, email, phone, joinedAt, referredByCtvId, level, directDownlineCount, lobs }.
 * Distinct from buildCtvNetwork (legacy {self,upline,direct,downline-tree}) which the old FE used.
 */
function buildCtvHierarchy(args) {
  const byId = mergeById(
    args.dentalCtvs || [],
    args.cosmeticCtvs || [],
    [...(args.dentalClientCounts || []), ...(args.cosmeticClientCounts || [])],
    [...(args.dentalEarnings || []), ...(args.cosmeticEarnings || [])]
  );
  const ctvId = args.ctvId;
  const all = Array.from(byId.values());
  const directCountOf = (id) => all.filter((n) => n.referred_by_ctv_id === id).length;
  const nodeOf = (n, level) => ({
    id: n.id,
    name: n.name || null,
    email: n.email || '',
    phone: n.phone || '',
    joinedAt: n.datecreated || null,
    referredByCtvId: n.referred_by_ctv_id || null,
    level,
    directDownlineCount: directCountOf(n.id),
    lobs: n.lobs || [],
  });

  const root = byId.get(ctvId);
  if (!root) {
    return {
      current: { id: ctvId, name: null, email: '', phone: '', joinedAt: null, referredByCtvId: null, level: 0, directDownlineCount: 0, lobs: [] },
      upline: [],
      downline: [],
      totals: { directDownlineCount: 0, downlineCount: 0, uplineCount: 0, downlineEarningsBase: 0, potentialOverride: 0, overrideRatePct: 0 },
    };
  }

  // Override rate (%) the CURRENT ctv earns from a downline member sitting `depth` levels
  // below them. In the MLM pool the member keeps their L0 share and each upline level
  // receives commission_level_config.share_percent[depth]: depth 1 = direct downline
  // (14.5%), depth 2 (7.3%), etc. Depths beyond the configured table pay nothing, matching
  // the engine's 5-level cap. Disabled levels contribute 0.
  // hasConfig distinguishes "config supplied" from "config map non-empty": when the
  // table IS present but a level is disabled, that level must pay 0 (not silently fall
  // back to the standard share). The hardcoded fallback only fires when no config exists.
  const hasConfig = Array.isArray(args.levelConfig) && args.levelConfig.length > 0;
  const shareByLevel = new Map();
  for (const c of (args.levelConfig || [])) {
    if (c && c.enabled !== false && c.level != null) {
      shareByLevel.set(Number(c.level), parseFloat(c.share_percent || 0) || 0);
    }
  }
  const rateForDepth = (d) => (hasConfig ? (shareByLevel.get(d) || 0) : (STANDARD_OVERRIDE_SHARES[d] || 0));

  // Upline chain (walk up referred_by_ctv_id), level 1 = direct sponsor.
  const upline = [];
  const seenUp = new Set([root.id]);
  let cur = root;
  let up = 1;
  while (cur.referred_by_ctv_id && byId.has(cur.referred_by_ctv_id) && !seenUp.has(cur.referred_by_ctv_id) && up <= 5) {
    const u = byId.get(cur.referred_by_ctv_id);
    upline.push(nodeOf(u, up));
    seenUp.add(u.id);
    cur = u;
    up += 1;
  }

  // Downline (flat, BFS), level 1..5. Alongside the list we roll up the downline's own
  // earnings (base) and the projected override this ctv could earn from them
  // (base × rate[depth]). active_earnings_sum was populated per node by mergeById.
  const downline = [];
  let downlineEarningsBase = 0;
  let potentialOverride = 0;
  // Cycle guard: seed the visited set with this CTV *and its entire upline chain*, so a
  // corrupt back-edge (an ancestor whose referred_by_ctv_id points back down at this CTV)
  // can never drag the upline — and its whole subtree — into this CTV's downline.
  const seen = new Set([ctvId, ...upline.map((u) => u.id)]);
  let frontier = [ctvId];
  let depth = 1;
  while (frontier.length && depth <= 5) {
    const next = [];
    for (const pid of frontier) {
      for (const n of all) {
        if (n.referred_by_ctv_id === pid && !seen.has(n.id)) {
          seen.add(n.id);
          const earned = parseFloat(n.active_earnings_sum || 0) || 0;
          const contribution = earned * (rateForDepth(depth) / 100);
          // Per-node detail so the portal can show WHERE the potential comes from:
          // each member's own earnings → this ctv's projected cut from that member.
          downline.push({ ...nodeOf(n, depth), earned: Math.round(earned), overrideContribution: Math.round(contribution) });
          downlineEarningsBase += earned;
          potentialOverride += contribution;
          next.push(n.id);
        }
      }
    }
    frontier = next;
    depth += 1;
  }

  // Headline "% you earn from your downline": the effective blended rate (override ÷ base).
  // When the downline hasn't earned yet (base 0), fall back to the direct-downline rate
  // (depth 1) so the card still shows a meaningful, non-zero percentage.
  const overrideRatePct = downlineEarningsBase > 0
    ? Math.round((potentialOverride / downlineEarningsBase) * 1000) / 10
    : Math.round(rateForDepth(1) * 10) / 10;

  // Derive the direct count from the (cycle-safe) downline so it can never disagree with
  // the rendered list (e.g. counting an ancestor back-edge as a "direct downline").
  const directDownlineCount = downline.filter((d) => d.level === 1).length;

  return {
    current: { ...nodeOf(root, 0), directDownlineCount },
    upline,
    downline,
    totals: {
      directDownlineCount,
      downlineCount: downline.length,
      uplineCount: upline.length,
      downlineEarningsBase: Math.round(downlineEarningsBase),
      potentialOverride: Math.round(potentialOverride),
      overrideRatePct,
    },
  };
}

/**
 * loadHierarchySource — fetch the raw CTV graph inputs from BOTH LOB DBs.
 * Same query set used by GET /api/ctv/network and GET /api/ctv/hierarchy.
 * Returns the six arrays buildCtvNetwork/buildCtvHierarchy expect.
 */
async function loadHierarchySource() {
  const { getDb } = require('../db');
  // Per-LOB resilience: a missing/unreachable LOB DB degrades to [] rather than
  // failing the whole hierarchy (mirrors the dual-DB pattern elsewhere). Errors are
  // logged so a real failure is diagnosable instead of silently empty.
  const safeRows = async (db, sql) => {
    try {
      const r = db.queryRows ? await db.queryRows(sql) : await db.query(sql);
      return Array.isArray(r) ? r : (r && r.rows) || [];
    } catch (e) {
      console.error('[ctvNetwork loadHierarchySource] query failed:', e.message);
      return [];
    }
  };
  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');
  const ctvSql = `
    SELECT id, name, phone, email, active, referred_by_ctv_id, datecreated
    FROM dbo.partners
    WHERE is_ctv = true AND isdeleted = false
  `;
  const clientCountSql = `SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id`;
  // DIRECT earnings only (level 0) as the projection base — the override rows the engine now
  // writes (level >= 1) are the REALISED override; counting them here too would double-count
  // (a CTV's own override would inflate the base their upline projects from). Keeping the base =
  // downline's direct commission means the projection still equals the override they actually receive.
  const earningsSql = `SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings WHERE COALESCE(level, 0) = 0 GROUP BY recipient_partner_id`;
  const levelConfigSql = `SELECT level, share_percent, enabled FROM dbo.commission_level_config ORDER BY level`;
  const [dentalCtvs, cosmeticCtvs, dentalClientCounts, cosmeticClientCounts, dentalEarnings, cosmeticEarnings, dentalLevelConfig] = await Promise.all([
    safeRows(dentalDb, ctvSql),
    safeRows(cosmeticDb, ctvSql),
    safeRows(dentalDb, clientCountSql),
    safeRows(cosmeticDb, clientCountSql),
    safeRows(dentalDb, earningsSql),
    safeRows(cosmeticDb, earningsSql),
    safeRows(dentalDb, levelConfigSql),
  ]);
  // MLM level shares are identical across LOB DBs; dental is authoritative. Fall back to
  // cosmetic if dental's table is absent, else buildCtvHierarchy uses STANDARD_OVERRIDE_SHARES.
  let levelConfig = dentalLevelConfig;
  if (!levelConfig || levelConfig.length === 0) {
    levelConfig = await safeRows(cosmeticDb, levelConfigSql);
  }
  return { dentalCtvs, cosmeticCtvs, dentalClientCounts, cosmeticClientCounts, dentalEarnings, cosmeticEarnings, levelConfig };
}

/**
 * getCtvHierarchy — resolve the full upline+downline hierarchy for ANY ctvId.
 * Self-contained (fetches its own source data), so admin callers can look up an
 * arbitrary CTV without going through the CTV self-portal endpoint.
 * @param {string} ctvId
 * @returns {Promise<{current, upline, downline, totals}>}
 */
async function getCtvHierarchy(ctvId) {
  if (!ctvId || typeof ctvId !== 'string') {
    throw new Error('getCtvHierarchy: ctvId must be a non-empty string');
  }
  const src = await loadHierarchySource();
  return buildCtvHierarchy({ ctvId, ...src });
}

module.exports = { buildCtvNetwork, buildCtvHierarchy, loadHierarchySource, getCtvHierarchy };
