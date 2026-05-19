# SMS/Zalo Appointment Messaging System Research

Date: 2026-05-18
Status: Research / implementation plan pending Phase 0 provider, legal, and template decisions
Owner role: Product/Behavior, Backend, Frontend, Data, Integrations, QA

## Executive Recommendation

Build a real messaging system, not a one-off "send SMS" button.

For Vietnam clinic operations, the best V1 is:

1. Use a Vietnam SMS Brandname provider for transactional customer-care SMS, with a dry-run provider in local/dev.
2. Design the backend as a provider adapter so Zalo ZBS/ZNS template messaging can become the cheaper primary channel later, with SMS fallback.
3. Start with appointment reminders and late-arrival nudges only; do not ship marketing blasts in V1.
4. Store every send attempt in an append-only message ledger with idempotency, status, provider response, recipient snapshot, and actor/job source.

Twilio should not be the default Vietnam provider for this clinic. Twilio is technically strong, but its Vietnam SMS rules require sender/content registration, transactional-only use, no URLs or phone numbers in SMS content, and the listed Vietnam outbound price is materially higher than local SMS Brandname/Zalo template options.

Roadmap note: this maps to Phase 5 appointment messaging work and should not bypass the Phase 4 API-stability dependency unless the team explicitly accepts a smaller manual-send pilot. The plan below is suitable for sizing and authority-doc promotion, not direct coding until Phase 0 decisions are closed.

## Source-Backed Vendor Findings

### Twilio Vietnam SMS

- Vietnam SMS supports alphanumeric sender IDs, but registration is required.
- Twilio lists an estimated registration timeline of up to 5 weeks for Vietnam sender/content registration.
- Twilio states that promotional traffic is not currently supported in Vietnam.
- Twilio's Vietnam SMS guidelines prohibit URLs and phone numbers in message content.
- Twilio's Vietnam pricing page listed international/alphanumeric SMS outbound at USD 0.2852 per SMS on 2026-05-18.

Fit: Useful as a future global adapter or fallback, not the Vietnam-first clinic default.

### Zalo ZBS/ZNS Template Messaging

- Zalo positions ZBS/ZNS template messaging as customer-care messaging through a business Official Account.
- Zalo requires an OA, OA verification, approved templates, and either API integration or sending through the Zalo Cloud interface.
- Template API rules require the message structure to be approved before use, tied to a prior customer transaction/relationship, and not misleading.
- Zalo's pricing page listed successful template-message delivery at 200-300 VND depending on template type on 2026-05-18.

Fit: Best medium-term primary channel for Vietnamese customers who use Zalo. It is not SMS, so SMS fallback remains necessary.

### Local SMS Brandname Providers

- eSMS lists SMS Brandname as brand-sender customer-care/marketing SMS and publishes sample pricing around 520 VND/SMS, with fixed-number SMS around 450 VND/SMS, subject to volume/quote.
- eSMS exposes HTTP GET/POST APIs with API key/secret authentication, brandname, SMS type, send status lookup, and provider error codes.
- SpeedSMS exposes an HTTP API for one-to-many sends, supports CSKH, brandname, Notify/default brandname, status lookup, invalid phone reporting, and VND total price in the send response.

Fit: Best V1 SMS path. Choose one after a short procurement check on brandname registration time, template/content approval process, delivery reports, webhook support, pricing by volume, contract terms, and data-processing posture.

## Legal, Compliance, And Privacy Constraints

1. Treat V1 messages as transactional/customer-care only.
   Late-arrival and appointment reminders should say why the customer is receiving the message and avoid promotional content.

2. Keep opt-out and consent state even for operational messaging.
   Vietnam anti-spam rules require prior consent and opt-out handling for advertising messages. Even if V1 is transactional, storing contact preference state prevents accidental future misuse.

3. Do not include treatment/medical detail in SMS/Zalo messages.
   Vietnam personal-data rules classify health information in medical records as sensitive personal data. SMS lock screens and shared family phones make this risky. Use generic copy like appointment time, clinic name, and request to contact the clinic.

4. Preserve a processing/audit trail.
   Store consent source, provider used, template version, rendered body snapshot, send time, status, provider id, and actor/job source.

5. Quiet hours and throttling should be configurable.
   Default late reminders should only send during business hours. Marketing/campaign messaging is out of scope for V1.

## Current Repo Fit

### Existing UI

- `/notifications` exists, but `website/src/pages/Notifications.tsx` is only a static placeholder for SMS/email cards and templates.
- The route is already present in `website/src/constants/index.ts` and guarded by `notifications.view`.
- `notifications.view` exists in product-map permissions. `notifications.edit` is seeded for super admin but is not fully represented in the product-map registry.

### Appointment And Customer Data

Relevant appointment fields already returned by the appointment API:

- `datetimeappointment`
- `date`
- `time`
- `state`
- `aptstate`
- `datetimearrived`
- `dateappointmentreminder`
- `lastdatereminder`
- `customercarestatus`
- `partnerid`
- `partnername`
- `partnerphone`
- `partneremail`

Relevant customer fields already exist:

- `phone`
- `email`
- `zaloid`
- `receiverzalonumber`
- `emergencyphone`

Important invariant: `partners.phone` is not unique. Consent, sends, and audit rows must key to `partners.id`, not phone number.

### No Existing Messaging Backend

No real SMS/Zalo route, provider service, queue/worker, message template table, message log table, or retry logic exists today.

## V1 Product Scope

### Staff-Facing Outcomes

1. Staff can see appointments that are late today.
2. Staff can manually send a late-reminder message from a late appointment.
3. The system can later auto-send reminders through a scheduled worker, initially disabled/dry-run.
4. Staff can view message status and failure reasons in `/notifications`.
5. Admin/manager can manage approved templates and provider settings references.
6. Customer profile records show communication preference and recent message history.

### Out Of Scope For V1

- Marketing blasts.
- Promotional birthday campaigns.
- Two-way chat.
- WhatsApp.
- AI-generated message body.
- Treatment-specific medical message content.
- Replacing phone calls for urgent cases.

## Late Appointment Rule

A late-reminder candidate should satisfy all conditions:

- Appointment is for the current Vietnam day.
- Appointment has a parseable scheduled time from `datetimeappointment`, or `date` + `time`.
- Current Asia/Ho_Chi_Minh time is after scheduled time plus a configurable grace period, default 15 minutes.
- Appointment state is one of `scheduled`, `confirmed`, or `draft`.
- Appointment is not `arrived`, `in Examination`, `in-progress`, `done`, or `cancelled`.
- `datetimearrived` is null.
- Appointment has a `partnerid`.
- Customer has a valid normalized Vietnam phone number, or an eligible Zalo route if Zalo is enabled.
- Customer is not opted out of operational messages.
- No successful same-trigger message was sent inside the cooldown window.

Idempotency key:

```text
late_arrival:{appointment_id}:{partner_id}:{template_id}:{scheduled_at_local}
```

## Proposed Data Model

Use new append-only messaging tables instead of overloading appointment reminder fields.

### `messaging_templates`

- `id`
- `channel` (`sms`, `zalo_zbs`, future `email`)
- `code` (`appointment_late_v1`, `appointment_reminder_v1`)
- `language` (`vi`, `en`)
- `status` (`draft`, `approved`, `disabled`)
- `provider_template_id`
- `body`
- `variables_json`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### `customer_contact_preferences`

- `id`
- `partner_id`
- `channel`
- `destination_snapshot`
- `operational_opt_in`
- `marketing_opt_in`
- `opt_out_at`
- `opt_out_reason`
- `consent_source`
- `updated_by`
- `updated_at`

### `messaging_outbox`

- `id`
- `trigger_type`
- `appointment_id`
- `partner_id`
- `channel`
- `template_id`
- `destination_snapshot`
- `body_snapshot`
- `status` (`queued`, `sending`, `sent`, `delivered`, `failed`, `skipped`, `cancelled`)
- `idempotency_key`
- `next_attempt_at`
- `last_error_code`
- `last_error_message`
- `created_by`
- `created_source` (`manual`, `worker`, `api`)
- `created_at`
- `updated_at`

Unique index:

```sql
UNIQUE (idempotency_key)
```

### `messaging_attempts`

- `id`
- `outbox_id`
- `provider`
- `provider_message_id`
- `request_payload_json`
- `response_payload_json`
- `status`
- `error_code`
- `error_message`
- `attempted_at`

### `messaging_provider_accounts`

Store non-secret provider metadata only. API keys stay in env/secrets.

- `id`
- `provider`
- `display_name`
- `sender_name`
- `status`
- `config_json`
- `created_at`
- `updated_at`

## Proposed API Surface

Use the existing route pattern: Express router, `requirePermission()`, Zod validation, and frontend wrappers under `website/src/lib/api/`.

### Notifications

- `GET /api/Notifications/templates`
- `POST /api/Notifications/templates`
- `PUT /api/Notifications/templates/:id`
- `POST /api/Notifications/preview`
- `POST /api/Notifications/send`
- `GET /api/Notifications/messages`
- `GET /api/Notifications/messages/:id`
- `POST /api/Notifications/messages/:id/retry`
- `POST /api/Notifications/provider-webhook/:provider`

### Appointment Messaging

- `GET /api/Notifications/late-appointments`
- `POST /api/Notifications/appointments/:id/late-reminder`

Keep appointment-specific messaging under `Notifications` so provider logic does not leak into the appointment domain.

### Customer Contact Preferences

- `GET /api/Partners/:id/contact-preferences`
- `PUT /api/Partners/:id/contact-preferences`

Permissions:

- `notifications.view`
- `notifications.edit`
- `notifications.send`
- `notifications.admin`

`notifications.view` exists today. `notifications.edit`, `notifications.send`, and `notifications.admin` must be added to the permission registry, seeds, role defaults, route guards, route-permission map, TestSprite scenarios, and docs before implementation ships.

## Webhook Security Decision

Provider callback endpoints must not be added as ordinary authenticated staff routes.

If the selected provider supports delivery callbacks, use a dedicated public webhook path with all of the following controls:

- Explicit allowlist in the API public-path/auth-bypass layer.
- Provider signature or shared-secret verification before parsing provider status into trusted state.
- Rate limiting and request-size limits.
- Raw provider payload stored only in the message-attempt audit table, with secrets and customer-sensitive fields redacted.
- Idempotent status handling keyed by provider message id and internal outbox id.
- No customer-facing state change from an unsigned or unrecognized callback.

If the selected provider does not support verifiable callbacks, do not expose a public webhook. Use authenticated/internal polling from the worker to retrieve delivery status.

## Worker Design

Add one worker entry point after manual-send V1 is stable:

- `api/src/workers/messagingWorker.js`, or `api/scripts/messaging-scheduler.js`
- Runs every 1-5 minutes in production.
- Local/dev default provider is `dry_run`.
- Worker only enqueues eligible candidates; provider sending drains the outbox with retries.
- Use row locking or status transitions so two worker instances cannot send duplicates.
- Add Docker/infra docs before enabling on VPS.

## Frontend Design

### `/notifications`

Make the placeholder page real:

- Message dashboard: queued, sent, delivered, failed, skipped.
- Template list and template detail.
- Provider status card.
- Outbox detail drawer with rendered body, appointment/customer context, attempt history, and retry action.
- Filters: date, status, channel, trigger, provider, branch.

### `/calendar`

- Add a late-status badge or smart filter for late appointments.
- Add "Send late reminder" action only when the appointment is eligible.
- Show last sent status if a reminder exists.

### Overview

- Add late appointments to the Today queue or a focused late panel.
- Staff should be able to see who is late without opening the full calendar.

### Customer Profile

- Add communication preference row.
- Show recent message history.
- Keep phone/Zalo contact edits separate from consent changes.

## Suggested Message Copy

Vietnamese SMS body, ASCII-safe if provider Brandname requires no diacritics:

```text
TGClinic: Quy khach co lich hen luc {time} hom nay. Neu den tre hoac can doi lich, vui long lien he phong kham. Cam on quy khach.
```

Vietnamese Zalo template body can use diacritics if approved:

```text
TGClinic thong bao: Quy khach co lich hen luc {time} hom nay. Neu den tre hoac can doi lich, vui long lien he phong kham. Cam on quy khach.
```

Do not include treatment names, health conditions, balances, links, or phone numbers in the body unless the selected provider/template policy explicitly supports the format and legal review accepts it.

## Implementation Phases

### Phase 0: Procurement And Approval

- Pick SMS Brandname provider and get brandname/template rules in writing.
- Decide if Zalo OA/ZBS setup is ready or should be Phase 2.
- Confirm clinic-approved sender name and exact message template.
- Confirm opt-out process and who handles inbound replies.

### Phase 1: Manual Late Reminder

- Add database tables and migrations.
- Add provider adapter with `dry_run`, then one real SMS provider.
- Add notification APIs and permission registry updates.
- Upgrade `/notifications` from placeholder to outbox/template/status page.
- Add manual send action on late appointments.
- Add TestSprite coverage and backend integration tests.

Required authority/docs handoff in the same implementation branch:

- Create or update `COORDINATION_REQUESTS.md` because this crosses appointments, customers, integrations, permissions, worker/infra, and sensitive contact data.
- Update `product-map/schema-map.md` for new messaging tables.
- Update affected product-map domains: `appointments-calendar`, `customers-partners`, `integrations`, and either a new notifications/messaging domain or a clearly owned existing domain.
- Update `product-map/contracts/api-index.md` for every new notification/contact-preference route.
- Update `product-map/contracts/permission-registry.yaml` for `notifications.edit`, `notifications.send`, and `notifications.admin`.
- Update `docs/CONTRACTS.md`, `docs/DATA-MODEL.md`, `docs/MIGRATIONS.md`, `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, `docs/INVARIANTS.md`, `docs/SECURITY.md`, `docs/TEST-MATRIX.md`, and relevant runbooks.
- Append `docs/CHANGELOG.md` and bump `website/package.json` for runtime UI/API work.
- Keep `testbright.md` updated with TestSprite browser coverage and required screenshot states.

### Phase 2: Scheduled Reminders

- Add worker in dry-run mode.
- Add candidate query tests and idempotency tests.
- Enable appointment reminder and late-reminder schedules separately.
- Add monitoring and failure dashboard.

### Phase 3: Zalo Primary / SMS Fallback

- Add Zalo provider adapter.
- Add provider routing preference: Zalo first, SMS fallback.
- Track per-channel delivery and cost.

## Open Questions Before Implementation

1. Does the company already have a registered SMS Brandname or Zalo OA?
2. Which customer messages are legally approved: late only, reminder before appointment, cancellation, reschedule, birthday, payment?
3. Should staff send manually first, or should auto-send be enabled immediately after testing?
4. What late grace period should V1 use: 10, 15, or 20 minutes?
5. Who receives replies or failed delivery notifications?
6. Should English customer messages exist in V1, or Vietnamese only?
7. What branch/location-scope rule should late reminders enforce for staff who do not have global appointment access?

## Test Plan

Backend tests:

- Late-candidate query respects timezone, status, arrived time, cancelled/done state, and grace period.
- Idempotency prevents duplicate sends for the same appointment/template/customer.
- Provider failure records a failed attempt without losing the outbox row.
- Missing phone, invalid phone, and opted-out customer create skipped rows, not crashes.
- Permission tests cover `notifications.view`, `notifications.edit`, and `notifications.send`.
- Permission tests cover template/provider admin controls, retry actions, and staff without global/branch access.

Frontend tests:

- `/notifications` renders templates, outbox rows, failed states, retry action, and empty states.
- `/calendar` exposes manual send only for eligible late appointments.
- Customer profile shows preferences/history without treating phone as unique.
- Vietnamese and English i18n keys exist for new visible copy.

TestSprite browser checks:

- `/notifications`
- `/calendar`
- `/customers/:id`
- Overview today queue
- Branch/location-scope scenario proving scoped staff cannot view or send reminders for another branch.

Use screenshot evidence for every browser-visible verification run.

## Sources

- Twilio Vietnam SMS guidelines: https://www.twilio.com/en-us/guidelines/vn/sms
- Twilio Vietnam SMS pricing: https://www.twilio.com/en-us/sms/pricing/vn
- Zalo ZBS/ZNS overview: https://zalo.solutions/blog/zalo-notification-service-zns-giai-phap-cham-soc-khach-hang-truc-tuyen-tu-zalo/uw7eroeucid968zyt0m0uvv6
- Zalo registration guide: https://zalo.solutions/blog/huong-dan-dang-ky-su-dung-dich-vu-zns/jlm44tzzwffh0od10ix6rra7
- Zalo Template API conditions: https://zalo.solutions/blog/dieu-kien-khoi-tao-lenhzns-template-api-/axs6yf08mxlvsfpm13att55l
- Zalo template review rules: https://zalo.solutions/news/quy-dinh-chung-khi-kiem-duyet-mau-zns/xdygqtrjjm97k28rsh07wr72
- Zalo pricing: https://zalo.solutions/business-message/pricing
- eSMS pricing: https://esms.vn/chinh-sach-gia
- eSMS API docs: https://esms.vn/SMSApi/ApiDetail
- SpeedSMS API docs: https://speedsms.vn/sms-api/
- Vietnam Decree 91/2020 anti-spam text/call/email rules: https://english.luatvietnam.vn/decree-no-91-2020-nd-cp-dated-august-14-2020-of-the-government-on-fighting-against-spam-text-messages-spam-emails-and-spam-calls-189003-doc1.html
- Vietnam Decree 13/2023 personal data protection: https://english.luatvietnam.vn/decree-no-13-2023-nd-cp-dated-april-17-2023-of-the-government-on-personal-data-protection-249791-doc1.html
