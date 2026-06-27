# Face ID Scope

## Public Kiosk Boundary

`/checkin` is a public Face ID kiosk for phone or tablet use. It is allowed to call only `POST /api/public/face/checkin`.

Hard rules:

- No login, JWT, `useAuth`, customer profile navigation, or token/session creation.
- Recognize-only. The public route must never register, re-register, delete, or mutate Face ID data.
- Minimal response only: match greeting, no-match, or ambiguous count. Never return `partnerId`, phone, customer code, confidence score, or candidate identities.
- Rate-limit per source IP.
- Appointment arrival writes remain staff-confirmed unless a later product decision changes the workflow.
- Start with the front-facing camera (`facingMode: user`) and use iOS-friendly `ideal` camera constraints before `exact` constraints so Safari can choose an available camera.
- Preserve the full camera frame for provider upload. The preview may be softened for privacy, but the submitted JPEG must be unblurred and must not center-crop away portrait iPhone/iPad framing.
- Treat `NO_FACE`, `MULTIPLE_FACES`, and `LOW_QUALITY` provider errors as transient scanner states in the public kiosk. Keep the camera scanning and only show terminal front-desk fallback for real no-match/multiple-match outcomes or repeated failures.

## Provider Status Rule

In CompreFace mode, TGClinic treats a customer as Face ID registered only when both are true:

- `dbo.partners.face_subject_id` is set.
- CompreFace `GET /api/v1/recognition/faces?subject=<subject>` returns at least one saved face example.

Registration must verify CompreFace persistence before updating `face_registered_at`. A stale DB subject with zero provider examples must display as unregistered so staff can re-register it.

## Operator Notes

- If a customer has a DB subject but CompreFace has zero examples, treat them as not registered and re-register from the protected customer profile flow.
- If phone check-in cannot start the camera, verify browser camera permission first, then check whether Low Power Mode or browser autoplay restrictions are blocking video playback.
