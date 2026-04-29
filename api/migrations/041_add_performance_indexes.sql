-- Migration 041: Add performance indexes for large tables (post-TDental migration)
-- Tables have grown 10-100x after TDental data import:
--   partners: 35K, appointments: 222K, payments: 62K, saleorders: 61K, saleorderlines: 63K
-- Without these indexes, every page load triggers full sequential scans.

-- ============================================================================
-- 1. Enable pg_trgm for fast text search (ILIKE/phone search)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. partners — Customer/employee filtering + text search (35,438 rows)
-- ============================================================================

-- Partial index: only customers that aren't deleted (used by EVERY partners query)
CREATE INDEX IF NOT EXISTS idx_partners_customer_active
    ON dbo.partners (datecreated DESC)
    WHERE customer = true AND isdeleted = false;

-- Trigram index for fast name search (ILIKE '%nguyen%')
CREATE INDEX IF NOT EXISTS idx_partners_name_trgm
    ON dbo.partners USING gin (name gin_trgm_ops);

-- Trigram index for phone search (ILIKE '%090%')
-- Also handles the digit-only regexp path in searchFilters.js
CREATE INDEX IF NOT EXISTS idx_partners_phone_trgm
    ON dbo.partners USING gin (phone gin_trgm_ops);

-- Trigram index for namosign search (accent-stripped name)
CREATE INDEX IF NOT EXISTS idx_partners_namenosign_trgm
    ON dbo.partners USING gin (namenosign gin_trgm_ops);

-- Index for ref/code search
CREATE INDEX IF NOT EXISTS idx_partners_ref_trgm
    ON dbo.partners USING gin (ref gin_trgm_ops);

-- ============================================================================
-- 3. appointments — FK columns used in JOINs and filters (222,079 rows)
-- ============================================================================

-- Doctor filter (used in Calendar + Appointment list filters)
CREATE INDEX IF NOT EXISTS idx_appointments_doctorid
    ON dbo.appointments (doctorid);

-- Status filter (scheduled/arrived/cancelled — used everywhere)
CREATE INDEX IF NOT EXISTS idx_appointments_state
    ON dbo.appointments (state);

-- Product/service filter
CREATE INDEX IF NOT EXISTS idx_appointments_productid
    ON dbo.appointments (productid);

-- Assistant filter
CREATE INDEX IF NOT EXISTS idx_appointments_assistantid
    ON dbo.appointments (assistantid);

-- Composite: date + state (most common filter combination for Calendar)
CREATE INDEX IF NOT EXISTS idx_appointments_date_state
    ON dbo.appointments (date, state);

-- ============================================================================
-- 4. payments — FK + date sorting (61,755 rows)
-- ============================================================================

-- Customer payments lookup (used on CustomerProfile + Payments page)
CREATE INDEX IF NOT EXISTS idx_payments_customer_id
    ON dbo.payments (customer_id);

-- Date sorting (used on Payments list page)
CREATE INDEX IF NOT EXISTS idx_payments_payment_date
    ON dbo.payments (payment_date DESC);

-- Service filter
CREATE INDEX IF NOT EXISTS idx_payments_service_id
    ON dbo.payments (service_id);

-- Composite: payment_category + payment_date (main listing query)
CREATE INDEX IF NOT EXISTS idx_payments_category_date
    ON dbo.payments (payment_category, payment_date DESC);

-- ============================================================================
-- 5. saleorders — FK columns (61,459 rows)
-- ============================================================================

-- Customer orders (used on CustomerProfile service history)
CREATE INDEX IF NOT EXISTS idx_saleorders_partnerid
    ON dbo.saleorders (partnerid, isdeleted)
    WHERE isdeleted = false;

-- Company/location filter
CREATE INDEX IF NOT EXISTS idx_saleorders_companyid
    ON dbo.saleorders (companyid);

-- Doctor filter
CREATE INDEX IF NOT EXISTS idx_saleorders_doctorid
    ON dbo.saleorders (doctorid);

-- State filter
CREATE INDEX IF NOT EXISTS idx_saleorders_state
    ON dbo.saleorders (state);

-- Date created (sorting)
CREATE INDEX IF NOT EXISTS idx_saleorders_datecreated
    ON dbo.saleorders (datecreated DESC);

-- ============================================================================
-- 6. saleorderlines — FK columns (63,429 rows) — CRITICAL
-- ============================================================================

-- Order details (used EVERY time customer service history is viewed)
CREATE INDEX IF NOT EXISTS idx_saleorderlines_orderid
    ON dbo.saleorderlines (orderid);

-- Product usage lookup (reports, delete guards)
CREATE INDEX IF NOT EXISTS idx_saleorderlines_productid
    ON dbo.saleorderlines (productid);

-- Employee/doctor filter
CREATE INDEX IF NOT EXISTS idx_saleorderlines_employeeid
    ON dbo.saleorderlines (employeeid);

-- Date created (sorting)
CREATE INDEX IF NOT EXISTS idx_saleorderlines_datecreated
    ON dbo.saleorderlines (datecreated DESC);

-- ============================================================================
-- 7. dotkhams — medical records FK indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dotkhams_partnerid
    ON dbo.dotkhams (partnerid);

CREATE INDEX IF NOT EXISTS idx_dotkhams_doctorid
    ON dbo.dotkhams (doctorid);

-- ============================================================================
-- 8. Run ANALYZE to update query planner statistics
-- ============================================================================
ANALYZE dbo.partners;
ANALYZE dbo.appointments;
ANALYZE dbo.payments;
ANALYZE dbo.saleorders;
ANALYZE dbo.saleorderlines;
ANALYZE dbo.dotkhams;
