# TGClinic Enterprise Reference Library

> Curated, downloaded references from battle-tested open-source repositories. Used to improve code organization, eliminate duplication, remove bottlenecks, and align TGClinic implementations with enterprise patterns.

## How to use this library

1. Each subfolder is a domain-relevant reference bundle.
2. `README-reference.md` inside each subfolder explains:
   - What was downloaded
   - Why it is relevant to TGClinic
   - Key patterns to adopt
   - Specific files/functions to study
3. Do **not** copy code blindly; use these as exemplars and adapt to TGClinic authority stack (`AGENTS.md`, `ARCHITECTURE.md`, `product-map/`).

## Domains

| Folder | Domain | TGClinic Touch Points |
|---|---|---|
| `money-flow/` | Payment allocation, deposits, receipts, refunds, residuals | `api/src/routes/payments.js`, `payments-deposits` domain, migrations |
| `bank-statements/` | Bank statement import, parsing, reconciliation | Payment imports, future bank integration |
| `commissions-mlm/` | Commission calculation, MLM/upline payouts, earnings ledgers | `api/src/routes/commissionEngine.js`, `earnings.js`, `payouts.js` |
| `ctv-referral/` | Affiliate/referral/CTV systems | `api/src/routes/ctv*.js`, `CtvCreationForm` SSOT |
| `auth-rbac/` | Authentication, RBAC, permissions, JWT | `api/src/middleware/auth.js`, `AuthContext.tsx`, permission routes |
| `react-patterns/` | Enterprise React architecture, forms, tables, state | `website/src/components/`, `website/src/hooks/`, `website/src/contexts/` |
| `express-patterns/` | Express service-layer organization, route refactoring | `api/src/routes/`, `api/src/db/` |
| `postgresql-patterns/` | PostgreSQL migrations, dual-DB topology, transactions | `api/migrations/`, `api/src/db/index.js` |
| `testing-patterns/` | E2E, integration, contract testing | `website/e2e/`, `api/src/routes/__tests__/` |
| `gen-ai-chat-support/` | Generative AI chatbot, RAG, human escalation, learning loop | `api/src/services/ai/`, `api/src/routes/patient/chat.js`, `nk-patient-app/src/screens/chat/` |

## Adding a reference

1. Clone or download into the correct domain folder.
2. Keep only the relevant source files; remove `node_modules`, `.git`, tests unless they are the exemplar.
3. Add an entry to `INDEX.md`.
4. Update the domain `README-reference.md` with lessons learned.

## Governance

- References are read-only exemplars.
- Any code adopted from a reference must still pass TGClinic governance gates: `npm run verify:governance`, `npm run verify:crossrefs`, `npm run verify:docs`.
- CTV/LOB changes must co-update the CTV SSOT module, backend routes, product-map, and CHANGELOG per `AGENTS.md` §5.1.
