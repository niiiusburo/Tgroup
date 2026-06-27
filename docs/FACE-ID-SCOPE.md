# Face ID Scope Rule (HARD CONSTRAINT)

> Recorded: 2026-06-27 by user directive. Authoritative. Do not change without explicit user approval.

## The rule

Face ID is **CHECK-IN / IDENTITY-VERIFY ONLY**.

### What Face ID IS for
- Verify a client is who they say they are at check-in time.
- Run on a dedicated **iPad kiosk** at clinic locations.
- A **single-purpose public page** (no login required) that:
  1. Captures a face.
  2. Calls a recognize-only public endpoint.
  3. Shows a minimal confirmation (e.g., "Welcome back, [name]"). No PHI beyond what is needed to confirm identity.
  4. Marks the client as checked-in for today (if check-in write path is enabled).
  5. Returns to the capture screen for the next client.

### What Face ID IS NOT for (hard NO)
- **NOT for login.** Face ID never authenticates a user into the admin app.
- **NOT for client login.** Clients do not have app accounts.
- **NOT attached to any JWT / auth session.** The kiosk page never receives a token.
- **NOT for staff login.**
- **NOT for admin/employee authentication.**
- **NOT for CTV portal access.**

### Architecture invariants
1. The kiosk page (`/check-in` or similar) is a **public route** — no `ProtectedRoute`, no `useAuth`, no JWT.
2. The check-in API endpoint is a **separate public route** — NOT `/api/face/recognize` (which requires `customers.view`). Use a new `/api/public/face/check-in` or equivalent that is recognize-only and returns minimal data.
3. The existing `/api/face/recognize`, `/api/face/register`, `/api/face/re-register`, `/api/face/status` routes stay **admin-only** (JWT + `customers.view`/`customers.edit`). Do not weaken them.
4. Check-in never issues a session token. After verification, the kiosk screen resets.
5. Check-in honors `dentalLobGate` — a kiosk at a dental location must only match against that location's LOB; a cosmetic kiosk must only match cosmetic.
6. PHI minimization: the public check-in response returns only what the kiosk needs to greet the client (e.g., first name + last initial, or "Welcome back"). No financials, no appointment history, no contact details.

### Anti-patterns to refuse in code review
- Adding `useAuth()` or `requireAuth` import to any kiosk/check-in page or component.
- Calling `/api/face/recognize` from the kiosk (use the public check-in endpoint instead).
- Returning full partner/customer records from the public check-in endpoint.
- Attaching a token, cookie, or session marker after a successful check-in match.
- Reusing `GlobalFaceIdButton` directly on the kiosk (it calls admin routes + uses `useAuth`).

### Reference
- Existing admin Face ID surface: `website/src/components/shared/GlobalFaceIdButton.tsx` (admin-only)
- Face engine (reusable): `api/src/services/faceMatchEngine.js`, `faceRecognitionRuntime.js`
- Public-path registry: `api/src/middleware/publicApiPaths.js` (add the new check-in route here)
- Lob gate: `api/src/middleware/dentalLobGate.js`
