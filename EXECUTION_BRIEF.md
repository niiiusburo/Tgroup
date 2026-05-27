# Cosmetic LOB v2 — Autonomous Execution Brief

**North Star**: docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md (full) + visual companion.

**Worktree**: feat/cosmetic-line-of-business (this directory only)

**Strict Rules**:
- Local development only (127.0.0.1 ports)
- Never touch production or even NK2 until explicit human approval
- All changes must pass existing dental regression (Playwright + Jest)
- Full screenshots of every surface under Dental, Cosmetic, and as CTV user required at the end
- Follow AGENTS.md, website/agents.md, product-map governance

**Current State**: Clean worktree with only the design specs. No implementation yet.

**Success Criteria**:
- Working LOB toggle for admins with both scopes
- Cosmetic admin UI is empty mirror of dental (same components, different data)
- CTV users are redirected to /ctv and see the 4-tab mobile dashboard
- Commission engine writes correctly on payment (with CTV priority)
- All money invariants preserved for legacy data
- Every page has screenshot proof in both LOBs + CTV view

This file is the contract. All agents must read the v2 spec + visual companion + this brief before starting.
