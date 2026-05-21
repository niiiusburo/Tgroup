# Audit Reports

Permanent, agent-authored audit and verification reports kept under
`docs/audits/<YYYY-MM-DD>-<topic>/`. These are markdown only — large
screenshot/JSON evidence stays out of git (see `.gitignore`'s
`output/playwright/`, `reports/feedback-extract/`, `reports/responsive-qa/`).

## Index

- `2026-05-16-nk2-deeplink/` — proof report for NK2 calendar deeplink
  behavior captured during the v0.32 feedback-stabilization push.
- `2026-05-19-cosmetic-lob/` — finishing-swarm audit pack for the
  cosmetic LOB v2 work that landed on `nk3-deploy`:
  - `brutal-audit-2.md` — independent zero-trust re-audit (#2)
  - `cosmetic-overall-status.md` — executive synthesis across all
    sub-agent audits
  - `cross-lob-badge.md` — implementation report for the
    `lob.crossview` cross-LOB pill on `/customers/:id`
  - `docs-sync.md` — authority docs + product-map alignment report

These files describe a moment in time. Do not edit them after the
fact; supersede with a newer dated audit if needed.
