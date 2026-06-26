-- Migration 066: Patient Portal Tables
-- Additive only — new tables, no changes to existing tables
-- Date: 2026-06-24
-- Author: codex

-- Patient device tokens (for push notifications later)
CREATE TABLE IF NOT EXISTS dbo.patient_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  apns_token TEXT,
  fcm_token TEXT,
  platform TEXT NOT NULL DEFAULT 'ios',
  app_version TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_devices_partner ON dbo.patient_devices(partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_devices_apns ON dbo.patient_devices(partner_id, apns_token) WHERE apns_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_devices_fcm ON dbo.patient_devices(partner_id, fcm_token) WHERE fcm_token IS NOT NULL;

-- Patient consent / preferences
CREATE TABLE IF NOT EXISTS dbo.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES dbo.partners(id) ON DELETE CASCADE,
  marketing_push BOOLEAN DEFAULT true,
  marketing_sms BOOLEAN DEFAULT true,
  marketing_email BOOLEAN DEFAULT true,
  photo_visible BOOLEAN DEFAULT true,
  data_sharing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_consents_partner ON dbo.patient_consents(partner_id);

-- Notification inbox
CREATE TABLE IF NOT EXISTS dbo.patient_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_partner ON dbo.patient_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_unread ON dbo.patient_notifications(partner_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patient_notifications_created ON dbo.patient_notifications(created_at DESC);

-- Patient-initiated referrals (different from CTV referral)
CREATE TABLE IF NOT EXISTS dbo.patient_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  referred_name TEXT NOT NULL,
  referred_phone TEXT NOT NULL,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_patient_referral_status CHECK (status IN ('submitted', 'contacted', 'booked', 'visited', 'converted', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_partner ON dbo.patient_referrals(partner_id);

-- Service reviews
CREATE TABLE IF NOT EXISTS dbo.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  saleorder_id UUID,
  dotkham_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_reviews_partner ON dbo.service_reviews(partner_id);

-- Media metadata (references external media service IDs)
CREATE TABLE IF NOT EXISTS dbo.patient_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  media_service_id TEXT NOT NULL,
  media_url TEXT,
  category TEXT DEFAULT 'general',
  label TEXT,
  dotkham_id UUID,
  saleorder_id UUID,
  appointment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_media_partner ON dbo.patient_media(partner_id);
CREATE INDEX IF NOT EXISTS idx_patient_media_category ON dbo.patient_media(category);

-- Support tickets / callbacks
CREATE TABLE IF NOT EXISTS dbo.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'callback',
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_support_ticket_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_partner ON dbo.support_tickets(partner_id);

-- Aftercare instructions (linked to dotkham)
CREATE TABLE IF NOT EXISTS dbo.aftercare_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  dotkham_id UUID,
  saleorder_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aftercare_partner ON dbo.aftercare_instructions(partner_id);

-- Comment breadcrumb
-- @crossref:domain[patient-portal]
-- @crossref:used-in[patient portal API, iOS app]
-- @crossref:uses[dbo.partners, product-map/domains/patient-portal.yaml]
