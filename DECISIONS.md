# DECISIONS.md

> Accepted project decisions for TGClinic. Add entries when a rule or direction
> should remain durable across sessions.

## Decision Format

```text
DEC-YYYYMMDD-NN: Title
Status: Accepted | Superseded | Proposed
Context:
Decision:
Consequences:
```

## DEC-20260502-01: Root Authority Stack

Status: Accepted

Context:
TGClinic had strong local docs in `AGENTS.md`, `website/agents.md`, `website/design.md`, `product-map/`, and `notes/`, but it did not have a single root authority-doc routing pattern.

Decision:
Create and use the root authority stack: `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`, `COORDINATION_REQUESTS.md`, `IDEA.md`, and `docs/runbooks/`.

Consequences:
Future work starts from the root authority stack, then drills into `product-map/`, `website/`, and `notes/` as needed. `notes/` remains supporting context, not the highest source of truth.

## DEC-20260502-02: Product Map Remains Mandatory

Status: Accepted

Context:
`product-map/` already tracks domain ownership, schema blast radius, dependency rules, permissions, unknowns, hooks, and tests.

Decision:
Do not replace `product-map/` with new root docs. Root docs route work; `product-map/` governs domain-specific implementation details.

Consequences:
Any schema, API, permission, or UI change must still read the affected domain YAML, `schema-map.md`, `contracts/dependency-rules.yaml`, and `unknowns.md`.

## DEC-20260502-03: Local-First Release Discipline

Status: Accepted

Context:
Production deploy issues have happened when code shipped before migrations, permissions, nginx timeouts, or local verification were complete.

Decision:
All fixes are made and verified locally before VPS changes. VPS deployment happens only after local code, data, migration, and behavior checks are complete.

Consequences:
Agents must not patch VPS files directly as the first fix path. If production is touched, the local cause and local fix path must be documented first.

## DEC-20260502-04: Generated And Secret Artifacts Stay Out Of Git

Status: Accepted

Context:
The project previously tracked local env files, Playwright MCP logs, screenshots, build output, and dependency folders.

Decision:
Generated artifacts, local auth/session files, build output, screenshots, browser logs, `node_modules`, and real env files are not source truth and must stay ignored.

Consequences:
Verification may require reinstalling dependencies locally. Secrets that were committed historically should be considered exposed and rotated or restricted.

## DEC-20260502-05: Website Version Bump For Code Changes

Status: Accepted

Context:
The frontend build exposes version metadata and production release checks rely on version/changelog sync.

Decision:
After website code changes, bump `website/package.json` according to patch/minor/major impact and keep changelog/version metadata aligned.

Consequences:
Docs-only governance changes do not require a website version bump. UI, API-client, behavior, or frontend runtime changes do.
