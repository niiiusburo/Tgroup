# Face ID Customer Search Design

- **Date:** 2026-05-07
- **Owner roles:** Customers & Partners, External Integrations, Frontend, Backend, QA/Verification
- **Status:** Approved design direction; ready for implementation planning
- **Primary surfaces:** `/customers`, customer profile, add/edit customer flow
- **Primary endpoints:** `POST /api/face/register`, `POST /api/face/recognize`

## Recap

Build Face ID as a complete local register-and-search loop. Staff can lock a customer's face to their customer record, search for a customer by face, review possible matches when confidence is not perfect, and use a no-match capture to search a customer by name/phone/code and register that same captured face without retaking the photo.

The chosen system is a local OpenCV YuNet + SFace embedding service, with TGClinic storing searchable embeddings in Postgres and keeping customer ownership in `dbo.partners`.

## Current Context

- Local database currently has 56 active customers, 0 customers with `face_subject_id`, 319 active employees, and 382 active non-deleted partners.
- The app already has Face ID plumbing:
  - Backend route: `api/src/routes/faceRecognition.js`
  - Current Compreface client: `api/src/services/comprefaceClient.js`
  - Frontend hook: `website/src/hooks/useFaceRecognition.ts`
  - Capture modal: `website/src/components/shared/FaceCaptureModal.tsx`
  - Customer camera widget: `website/src/components/customer/CustomerCameraWidget.tsx`
- `product-map/domains/customers-partners.yaml` owns customer records and face registration fields.
- `product-map/domains/integrations.yaml` owns Face ID integration behavior and currently references Compreface.

## Goals

- Register one or more face samples to an existing customer.
- Search active customers by captured face with fast local latency.
- Show high-confidence matches directly and lower-confidence candidates for manual staff confirmation.
- Preserve no-match captures in the current UI flow so staff can search a customer by name, phone, or customer code and register the same capture.
- Support multiple active face samples per customer so recognition improves over time.
- Keep Face ID optional: engine failures must not block normal customer create/edit/search workflows.
- Keep biometric storage local. Do not call cloud recognition APIs.

## Non-Goals

- Door access, payment authorization, attendance tracking, or legal identity verification.
- Employee Face ID in V1.
- Public patient self-enrollment.
- Storing raw face photos permanently by default.
- Adding Qdrant, Milvus, or a vector database in V1.
- Rebuilding the whole customer page UI.

## System Choice

Use a local Python `face-service` with OpenCV:

- Face detection: OpenCV `FaceDetectorYN` with YuNet ONNX model.
- Face recognition: OpenCV `FaceRecognizerSF` with SFace ONNX model.
- TGClinic API calls the service over the Docker network.
- TGClinic API remains the only browser-facing API for permissions, customer lookup, persistence, and response shaping.

Reasoning:

- OpenCV documents YuNet/SFace as ONNX models for face detection and recognition. The SFace model is small enough for local deployment and OpenCV documents LFW accuracy at 99.60%, with a cosine reference threshold of 0.363.
- The SFace model card is Apache 2.0.
- Current customer count is tiny, so direct cosine search against Postgres-loaded embeddings is simpler and fast enough.
- Compreface remains a fallback/reference, but it is heavier and not currently running in this local stack.

Reference links:

- OpenCV DNN face detection/recognition tutorial: https://docs.opencv.org/4.x/d0/dd4/tutorial_dnn_face.html
- OpenCV SFace model card: https://huggingface.co/opencv/face_recognition_sface
- pgvector, future optional vector index: https://github.com/pgvector/pgvector

## Architecture

```text
Browser camera
  -> TGClinic frontend FaceCaptureModal
  -> TGClinic API /api/face/*
  -> local face-service /embed
  -> TGClinic API compares/stores embeddings
  -> dbo.customer_face_embeddings + dbo.partners status fields
```

TGClinic API owns:

- Auth and `customers.view` / `customers.edit` permission checks.
- Customer existence checks.
- Customer search by name, phone, and code.
- Embedding storage and comparison.
- Match/candidate response contract.
- Staff-facing error semantics.

Face service owns:

- Image decoding.
- Face detection.
- Rejecting no-face and many-face captures.
- Face alignment.
- Embedding extraction.
- Returning model metadata and quality information.

## Data Model

Add a new table rather than overloading `dbo.partners`:

```sql
CREATE TABLE IF NOT EXISTS dbo.customer_face_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES dbo.partners(id),
  embedding double precision[] NOT NULL,
  detection_score double precision,
  face_box jsonb,
  image_sha256 text,
  source text NOT NULL DEFAULT 'manual_capture',
  model_name text NOT NULL,
  model_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  deleted_at timestamp without time zone NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_face_embeddings_partner
  ON dbo.customer_face_embeddings(partner_id)
  WHERE is_active = true;
```

Keep existing quick-status fields on `dbo.partners`:

- `face_subject_id`: set to the partner UUID when the first active sample is registered.
- `face_registered_at`: update every time a new active sample is added.

Storage rules:

- Store embeddings and metadata, not permanent raw face photos.
- The browser may keep the latest captured image in memory during the no-match rescue flow.
- The backend may hash the uploaded bytes as `image_sha256` for duplicate/sample diagnostics, but it must not persist the raw image unless a future decision explicitly adds face-photo retention.
- Deleting/deactivating a customer must prevent matching inactive/deleted customers.

## API Contract

### `POST /api/face/register`

Auth: `customers.edit`

FormData:

- `partnerId`: customer partner UUID
- `image`: captured image file
- optional `source`: `profile_register` | `no_match_rescue` | `candidate_confirmation`

Behavior:

- Validate `partnerId` belongs to an active, non-deleted customer.
- Send `image` to local face-service `/embed`.
- Reject if no face, many faces, low detection score, or unreadable image.
- Insert a new active row in `dbo.customer_face_embeddings`.
- Set or keep `dbo.partners.face_subject_id = partnerId`.
- Update `dbo.partners.face_registered_at`.
- Do not delete prior samples.

Response:

```json
{
  "success": true,
  "partnerId": "uuid",
  "sampleId": "uuid",
  "sampleCount": 3,
  "faceRegisteredAt": "2026-05-07T..."
}
```

### `POST /api/face/recognize`

Auth: `customers.view`

FormData:

- `image`: captured image file

Behavior:

- Send `image` to local face-service `/embed`.
- Load active embeddings for active, non-deleted customers.
- Compare with cosine similarity.
- Score each customer by the best sample score for that customer.
- Return:
  - `match` when the top score is high-confidence and sufficiently separated from the second score.
  - `candidates` when score is plausible but not safe for auto-open.
  - `match: null` and `candidates: []` for no-match.
- Do not create or mutate face records during recognition.

Response:

```json
{
  "match": {
    "partnerId": "uuid",
    "name": "Customer Name",
    "code": "T8250",
    "phone": "090...",
    "confidence": 0.62
  },
  "candidates": [],
  "captureToken": null
}
```

No-match or candidate response:

```json
{
  "match": null,
  "candidates": [
    {
      "partnerId": "uuid",
      "name": "Customer Name",
      "code": "T8250",
      "phone": "090...",
      "confidence": 0.52
    }
  ],
  "captureToken": null
}
```

`captureToken` is not required in V1 because the frontend can keep the Blob in memory. Add a token only if browser memory handling proves unreliable.

### `GET /api/face/status/:partnerId`

Required V1 helper for customer profile Face ID status and sample count.

Auth: `customers.view`

Response:

```json
{
  "partnerId": "uuid",
  "registered": true,
  "sampleCount": 2,
  "lastRegisteredAt": "2026-05-07T..."
}
```

## Matching Rules

Use environment-configurable thresholds with conservative defaults:

- `FACE_AUTO_MATCH_THRESHOLD=0.50`
- `FACE_CANDIDATE_THRESHOLD=0.363`
- `FACE_AUTO_MATCH_MARGIN=0.05`
- `FACE_MAX_CANDIDATES=3`
- `FACE_DETECTION_THRESHOLD=0.90`

Interpretation:

- Auto-open only if top score is at least `FACE_AUTO_MATCH_THRESHOLD` and beats the second-best customer by at least `FACE_AUTO_MATCH_MARGIN`.
- Candidate review if top score is at least `FACE_CANDIDATE_THRESHOLD` but auto-open rules are not met.
- No-match if no score reaches `FACE_CANDIDATE_THRESHOLD`.
- Registration and recognition reject captures when the detector score is below `FACE_DETECTION_THRESHOLD`.

The implementation plan must include a local threshold calibration script or test harness using a small set of captured clinic samples before production deployment. If calibration shows the defaults are too permissive, raise thresholds before release.

## Frontend Behavior

### Register From Existing Customer

Surface: customer profile. The existing edit-form register button may remain, but the customer profile must expose the primary registration status/action.

Flow:

1. Staff opens customer.
2. Staff clicks `Register Face`.
3. Camera modal opens.
4. Staff captures one clear face.
5. API registers a new sample.
6. Profile updates immediately with registered state and sample count.

Repeat registration:

- If the customer already has Face ID, clicking register adds another sample.
- Do not replace old samples.
- Copy should indicate that the new sample improves Face ID rather than overwriting it.

### Search From `/customers`

Surface: `/customers` list toolbar or customer search area.

Flow:

1. Staff clicks `Face ID`.
2. Camera modal opens.
3. Staff captures walk-in face.
4. If high-confidence match: open customer profile.
5. If candidate review: show top candidates with customer name, code, phone, and confidence. Staff must click one.
6. If no match: keep captured image preview and show customer search input.
7. Staff searches by name, phone, or code.
8. Staff selects the correct customer.
9. Staff clicks `Register this face`.
10. API registers the original capture to the selected customer and opens/refreshes that profile.

No-match rescue is required for V1. A no-match state must not force staff to retake the face capture after they find the customer manually.

### Error States

Show clear staff-facing messages for:

- Camera permission denied.
- No face detected.
- Multiple faces detected.
- Image blurry or too low quality.
- Face service offline.
- Customer no longer exists or is deleted.
- Permission denied.

Face service offline must not break `/customers` normal text search or customer profile loading.

## UI Copy Requirements

Add English and Vietnamese i18n keys.

Suggested product labels:

- `Face ID`
- `Register Face`
- `Face registered`
- `Add another face sample`
- `No face found`
- `More than one face detected`
- `No matching customer found`
- `Search customer to register this face`
- `Register this face to selected customer`
- `Possible matches`
- `Face service is unavailable`

Vietnamese labels should preserve clinic staff language and avoid technical model terms.

## Backend Implementation Notes

- Replace `api/src/services/comprefaceClient.js` usage with a new local face client boundary, for example `api/src/services/faceEngineClient.js`.
- Keep route file size under the project rule. Extract matching/storage helpers instead of expanding `faceRecognition.js` heavily.
- Use `multer.memoryStorage()` with the existing 5MB image limit unless local testing proves phone captures exceed it.
- Normalize API errors into stable codes so frontend can translate them.
- Do not log image bytes or embeddings.
- Log enough operational detail to diagnose service outages: error code, route, model version, duration, and request result category.

## Face Service Implementation Notes

Required service:

- Python FastAPI.
- `opencv-contrib-python-headless` for `FaceDetectorYN` and `FaceRecognizerSF`.
- Model files stored outside git under a documented model directory, downloaded by a script.
- Docker service name: `face-service`.
- Health endpoint: `GET /health`.
- Embedding endpoint: `POST /embed`.

`POST /embed` response:

```json
{
  "embedding": [0.0123, -0.0456],
  "model": {
    "detector": "yunet",
    "recognizer": "sface",
    "version": "opencv-sface-2021"
  },
  "quality": {
    "faceCount": 1,
    "detectionScore": 0.94,
    "box": { "x": 120, "y": 80, "width": 160, "height": 180 }
  }
}
```

Failure response:

```json
{
  "error": "NO_FACE",
  "message": "No face detected"
}
```

Required error codes:

- `NO_FACE`
- `MULTIPLE_FACES`
- `LOW_QUALITY`
- `IMAGE_UNREADABLE`
- `MODEL_NOT_READY`
- `ENGINE_ERROR`

## Product-Map And Docs Updates Required With Implementation

- Update `product-map/domains/customers-partners.yaml` to include `dbo.customer_face_embeddings`.
- Update `product-map/domains/integrations.yaml` to replace Compreface as the V1 engine.
- Update `product-map/schema-map.md` with the new table and blast radius.
- Update `product-map/contracts/api-index.md` with changed Face ID response contracts.
- Update `.env.example` and Docker Compose/runbooks for `FACE_SERVICE_URL`, thresholds, and model path.
- If Compreface remains in compose as fallback, mark it as legacy/fallback so future agents do not confuse the active engine.

## Verification Plan

Backend/API:

- Unit tests for:
  - Missing image.
  - Missing/invalid partner ID.
  - No face.
  - Multiple faces.
  - Register inserts a new sample and updates partner face status.
  - Repeat register adds another sample.
  - Recognition groups scores by customer and returns best sample.
  - Candidate review response when below auto-open threshold.
  - No-match response when below candidate threshold.
- Route tests with mocked face-service.

Face service:

- Health check test.
- Embedding endpoint with a known sample image.
- Failure tests for no-face and multi-face fixtures.

Frontend:

- Hook tests for register, match, candidate review, no-match, and errors.
- Customer widget tests for:
  - Face ID opens camera.
  - Match opens/selects customer.
  - Candidate review requires staff selection.
  - No-match keeps captured image and enables manual customer search.
  - Registering from no-match uses the original captured image.

Browser/TestSprite:

- Run a browser smoke on `/customers`.
- Exercise the full no-match rescue flow with mocked API if real camera automation is unreliable.
- Include TestSprite in verification unless blocked by camera/browser permission limitations. If blocked, record that and use Playwright/component fallback.

Manual local proof:

- Register one face sample to a test customer.
- Register a second sample to the same customer and confirm sample count increases.
- Search by face and confirm the customer opens only when confidence rules pass.
- Search with an unrelated/no-face image and confirm normal customer search still works.

Performance:

- For current data size, target under 1 second for local recognition after image capture on a development machine.
- Log route duration for register and recognize.
- Revisit `pgvector` only when active face samples grow enough that direct comparison becomes slow.

## Rollout Plan

1. Add face-service locally with model download script and health check.
2. Add DB migration for `dbo.customer_face_embeddings`.
3. Replace backend recognition client behind the existing `/api/face/*` route boundary.
4. Add matching/storage helpers and tests.
5. Update frontend Face ID search and no-match rescue UI.
6. Update product-map/docs/env/runbooks.
7. Run local verification and browser smoke.
8. Deploy only after local register/search/no-match rescue are proven.

## Open Implementation Risks

- Real threshold behavior must be calibrated with actual clinic camera captures before production release.
- Camera automation may not be reliable in TestSprite/Playwright; mocked API browser tests may be required.
- Model files should not be committed accidentally if they are downloaded locally.
- Existing dirty worktree should be cleaned or isolated before implementation begins.
