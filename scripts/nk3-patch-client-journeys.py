#!/usr/bin/env python3
"""
Surgically insert the activity-based journey override into NK3's /ctv/client-journeys handler.

Works on NK3's ACTUAL deployed ctv.js (442-line snapshot) — NOT my 783-line working tree (which
carries unrelated WIP). Idempotent: re-running is a no-op. Validates nothing here; caller runs
`node --check` on the output before deploying.

Usage:
    python3 nk3-patch-client-journeys.py <input_ctv.js> <output_ctv.js>
Exit 0 = patched (or already patched), 2 = anchor not found (refuse to write).
"""
import sys, re

SRC, DST = sys.argv[1], sys.argv[2]
text = open(SRC, encoding="utf-8").read()

if "activityProgressById" in text:
    open(DST, "w", encoding="utf-8").write(text)
    print("ALREADY_PATCHED")
    sys.exit(0)

# Anchor: the cItems assignment line inside the /client-journeys handler.
anchor_re = re.compile(
    r"^([ \t]*)const cItems = await Promise\.all\(cRefsRaw\.map\(\(r\) => buildJourney\(cosmeticDb, r, 'cosmetic'\)\)\);[ \t]*\n",
    re.MULTILINE,
)
m = anchor_re.search(text)
if not m:
    print("ANCHOR_NOT_FOUND")
    sys.exit(2)

indent = m.group(1)  # match NK3's existing indentation (4 spaces)
block_lines = [
    "",
    "// Activity-based journey override: stages above reflect commission EARNINGS, so a client who",
    "// already came & paid but has no earning row yet (retroactive CTV assignment, or a paid order",
    "// whose product carries no commission rate) is wrongly frozen at \"referred\" (1/4). Re-derive the",
    "// stage from the client's REAL operational activity (completed appointment / sale-order line /",
    "// payment) and take the higher of the two so the CTV sees their client actually progressing.",
    "// Commission ($) display stays driven by earnings. Batched per LOB (no N+1); each query goes",
    "// through safeQueryRows so a missing table degrades to no-override rather than 500ing the portal.",
    "const activityProgressById = new Map();",
    "const computeActivity = async (db, rawRows) => {",
    "  if (!rawRows || rawRows.length === 0) return;",
    "  const ids = rawRows.map((r) => r.id);",
    "  const [payAgg, svcAgg, visitAgg] = await Promise.all([",
    "    safeQueryRows(db, `SELECT customer_id AS id FROM payments WHERE customer_id = ANY($1) AND amount > 0 GROUP BY customer_id`, [ids]),",
    "    safeQueryRows(db, `SELECT so.partnerid AS id FROM dbo.saleorderlines sol JOIN dbo.saleorders so ON so.id = sol.orderid WHERE so.partnerid = ANY($1) AND sol.isdeleted = false GROUP BY so.partnerid`, [ids]),",
    "    safeQueryRows(db, `SELECT partnerid AS id FROM appointments WHERE partnerid = ANY($1) AND state IN ('completed','done','arrived') GROUP BY partnerid`, [ids]),",
    "  ]);",
    "  const paid = new Set(payAgg.map((r) => r.id));",
    "  const serviced = new Set(svcAgg.map((r) => r.id));",
    "  const visited = new Set(visitAgg.map((r) => r.id));",
    "  for (const id of ids) {",
    "    let p = 1;",
    "    if (paid.has(id)) p = 4;",
    "    else if (serviced.has(id)) p = 3;",
    "    else if (visited.has(id)) p = 2;",
    "    activityProgressById.set(id, Math.max(p, activityProgressById.get(id) || 1));",
    "  }",
    "};",
    "await Promise.all([computeActivity(dentalDb, dRefsRaw), computeActivity(cosmeticDb, cRefsRaw)]);",
    "const STAGE_BY_PROGRESS = { 1: 'referred', 2: 'visited', 3: 'serviced', 4: 'paid' };",
    "const applyActivity = (item) => {",
    "  const ap = activityProgressById.get(item.id) || 1;",
    "  if (ap > item.stage_progress) {",
    "    item.stage_progress = ap;",
    "    item.stage = STAGE_BY_PROGRESS[ap];",
    "  }",
    "};",
    "dItems.forEach(applyActivity);",
    "cItems.forEach(applyActivity);",
    "",
]
block = "".join(indent + ln + "\n" if ln else "\n" for ln in block_lines)

patched = text[: m.end()] + block + text[m.end() :]
open(DST, "w", encoding="utf-8").write(patched)
print("PATCHED ok; inserted %d lines at offset %d (indent=%d spaces)" % (len(block_lines), m.end(), len(indent)))
