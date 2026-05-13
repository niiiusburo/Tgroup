# TGroup Clinic Documentation Stack

> Anti-breakage, parallel-work, and operational safety docs for the TGClinic codebase.
> Every file is mandatory reading before editing the relevant surface.

## Quick Start for New Agents

1. Read `AGENTS.md` (repo root) — workflow and authority stack.
2. Read `ARCHITECTURE.md` (repo root) — repo shape and dependency direction.
3. Read `GLOSSARY.md` below — domain terms and disambiguations.
4. Read the docs for the surface you are about to change.

## Tier 1 — Anti-Breakage Core

| File | Purpose | Read before |
|---|---|---|
| [`GLOSSARY.md`](./GLOSSARY.md) | Every domain term, acronym, and concept with exact definitions. | Any code change in an unfamiliar domain. |
| [`CONTRACTS.md`](./CONTRACTS.md) | Frozen API schemas, event payloads, cross-module signatures, third-party contracts. | Any API, frontend client, or integration change. |
| [`DATA-MODEL.md`](./DATA-MODEL.md) | Full schema + ERD + invariant rules that must always hold. | Schema, migration, or query changes. |
| [`USE-CASES.md`](./USE-CASES.md) | Actor → Trigger → Preconditions → Flow → Postconditions for every use case. | Feature work, UX changes, or bugfix root-cause analysis. |
| [`WORKFLOWS.md`](./WORKFLOWS.md) | End-to-end business workflows as mermaid sequence diagrams. | Cross-domain changes or integration work. |
| [`INVARIANTS.md`](./INVARIANTS.md) | Global truths that must never break. Each has an ID for PR citation. | Any commit that touches money, auth, or data consistency. |

## Tier 2 — Parallel-Work Safety

| File | Purpose | Read before |
|---|---|---|
| [`DEPENDENCY-MAP.md`](./DEPENDENCY-MAP.md) | Module-level import graph and blast radius per module. | Refactors, extractions, or shared-code changes. |
| [`OWNERSHIP.md`](./OWNERSHIP.md) | Who may edit which files/directories per role. | Any edit outside your normal scope. |
| [`TEST-MATRIX.md`](./TEST-MATRIX.md) | "If you change X, run test suite Y." Coverage requirements per module. | Any code change. |
| [`ADR/`](./ADR/) | Architectural Decision Records — append-only, numbered, supersede never rewrite. | Before challenging an established pattern. |

## Tier 3 — Operational Safety

| File | Purpose | Read before |
|---|---|---|
| [`RUNBOOK.md`](./RUNBOOK.md) | Deploy, rollback, health check, incident response per environment. | Any deployment or infra change. |
| [`FAILURE-MODES.md`](./FAILURE-MODES.md) | Known broken patterns + war stories with root cause and fix. | Debugging production issues. |
| [`OBSERVABILITY.md`](./OBSERVABILITY.md) | Log format, metric names, trace IDs, alert thresholds, dashboards. | Adding telemetry or debugging runtime. |
| [`SECURITY.md`](./SECURITY.md) | Auth flow, RBAC, secret locations, token structure, sensitive-action thresholds. | Auth, permission, or secret changes. |

## Tier 4 — Evolution Tracking

| File | Purpose | Read before |
|---|---|---|
| [`CHANGELOG.md`](./CHANGELOG.md) | Append-only semver log of what changed, when, by whom, and why. | Planning the next release or investigating regressions. |
| [`MIGRATIONS.md`](./MIGRATIONS.md) | Schema migration log with up/down/rollback notes. | Schema changes and deploy timing. |
| [`ROADMAP.md`](./ROADMAP.md) | Phases, scope, inter-phase dependencies, and current phase marker. | Planning new features or scheduling releases. |

## Cross-References

- [`product-map/`](../product-map/) — Domain YAMLs, schema blast radius, dependency rules, unknowns.
- [`docs/runbooks/`](./runbooks/) — Operational playbooks (deployment, infrastructure, verification, money flow).
- [`AGENTS.md`](../AGENTS.md) — Root orchestration authority.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — Structural authority.
- [`BEHAVIOR.md`](../BEHAVIOR.md) — Interaction behavior authority.
- [`DECISIONS.md`](../DECISIONS.md) — Accepted durable decisions.
