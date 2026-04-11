# Requirements — TG Clinic KOL Integration

## v1 Requirements

### VietQR Payments
- **PAY-01**: User can generate a VietQR code for a service payment with amount and description
- **PAY-02**: User can upload payment proof screenshot after patient transfer
- **PAY-03**: Admin can configure clinic bank account (BIN, account number, account name) in settings
- **PAY-04**: QR description auto-generates from customer name + phone last 4 digits

### Facial Recognition
- **FACE-01**: Receptionist can enroll a new customer's face during registration (multi-angle capture)
- **FACE-02**: Receptionist can scan a customer's face to verify identity and pull up profile
- **FACE-03**: Customer list shows face-enrolled badge for customers with biometrics
- **FACE-04**: System stores 128-dim face descriptor linked to customer record

### Backend / Data
- **DATA-01**: Database migration adds `partner_biometrics` and `partner_biometric_images` tables
- **DATA-02**: Database migration adds `company_bank_settings` table for clinic bank config
- **DATA-03**: API endpoints exist for biometric enroll, match, and phone-check
- **DATA-04**: API endpoints exist for bank settings CRUD

## v1.1 / Architecture Shifts

- **REQ-06**: Two-tier customer delete with permission gating and FK-safe confirmation dialogs
- **REQ-12**: Multi-branch employee assignment via junction table and dual-selector UI
- **REQ-15**: Payment allocation expanded to dotkhams (examination vouchers) via tabbed UI

## v2 / Deferred

- Quick check-in widget on Overview dashboard with face scanner
- Face recognition confidence analytics
- Multiple bank accounts per location

## Out of Scope

- KOL referral tracking or commission logic
- Mobile native app integration
- Real-time payment webhook from banks
- REQ-13, REQ-14: originally scoped but dropped/consolidated into other v1.1 items

## Traceability

| REQ-ID | Phase |
|--------|-------|
| PAY-01 | 1 |
| PAY-02 | 1 |
| PAY-03 | 1 |
| PAY-04 | 1 |
| FACE-01 | 2 |
| FACE-02 | 2 |
| FACE-03 | 4 |
| FACE-04 | 3 |
| DATA-01 | 3 |
| DATA-02 | 1 |
| DATA-03 | 3 |
| DATA-04 | 1 |
| REQ-06 | 3 |
| REQ-12 | 3 |
| REQ-15 | 3 |
