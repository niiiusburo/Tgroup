-- @crossref:domain[auth]
-- @crossref:used-in[NK2 schema promotion: api/migrations/071_add_partner_lifecycle_columns]
-- @crossref:uses[dbo.partners, api/src/services/loginIdentifier.js, api/src/services/ctvSelfProfile.js]
--
-- Migration 071: Codify partners lifecycle columns that existed as ad-hoc
-- schema drift on tdental_nk3 but were never captured in a migration.
-- Discovered 2026-07-03 while promoting nk2-deploy (v0.40.0) to NK2:
-- findLoginPartner selects p.created_via -> login 500 on tdental_demo.
--
-- Definitions replicated exactly from tdental_nk3 (source of the drift):
--   created_via     VARCHAR(64)  DEFAULT 'admin_create'  NULL
--   is_live         BOOLEAN      DEFAULT false           NULL
--   signature_image TEXT                                 NULL
--
-- Apply to BOTH dental and cosmetic databases (partners is the canonical
-- identity table in each). Idempotent: safe to re-run anywhere, including
-- tdental_nk3/tcosmetic_nk3 where the columns already exist.

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS created_via VARCHAR(64) DEFAULT 'admin_create';

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS signature_image TEXT;
