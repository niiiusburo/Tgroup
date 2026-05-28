'use strict';

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
  const visited = new Set();
  function children(parentId, depth) {
    if (depth >= 5 || visited.has(parentId)) return [];
    visited.add(parentId);
    return Array.from(byId.values())
      .filter((n) => n.referred_by_ctv_id === parentId)
      .map((n) => ({ ...n, level: depth + 1, children: children(n.id, depth + 1) }));
  }
  const direct = Array.from(byId.values()).filter((n) => n.referred_by_ctv_id === ctvId);
  const upline = root.referred_by_ctv_id && byId.has(root.referred_by_ctv_id) ? byId.get(root.referred_by_ctv_id) : null;
  return {
    self: { ...root, level: 0, children: undefined },
    upline: upline ? { ...upline, children: undefined } : null,
    direct: direct.map((n) => ({ ...n, children: undefined })),
    downline: children(ctvId, 0),
  };
}

module.exports = { buildCtvNetwork };
