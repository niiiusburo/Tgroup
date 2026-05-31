-- Referral commission rates (CTV) — set the direct-referrer (L0) rate as a % of the ACTUAL service.
--
-- Model (v0.32.67): the commission engine no longer uses a "pool × MLM-level-share" split. The
-- referring CTV (L0) earns `service_line_amount × products.commission_rate_percent` directly.
-- Policy decided by the clinic owner:
--   * Default referral rate ............ 24%  (every service)
--   * Braces / orthodontics ............  7%  (anything braces-related)
--
-- NOT an auto-running migration on purpose — run it deliberately per environment so it never
-- silently changes commission on NK (prod) / NK2 (staging). Applied to NK3 `tdental_smoketest`
-- on 2026-05-29. Run inside the target DB with `SET search_path=dbo;` first.
--
-- @crossref:owned-by[product-map/domains/earnings-commissions.yaml]

SET search_path = dbo;

BEGIN;

-- 1) Default: 24% of the service for every product.
UPDATE products SET commission_rate_percent = 24;

-- 2) Braces / orthodontics: 7% (overrides the default for anything braces-related).
UPDATE products SET commission_rate_percent = 7
WHERE name ILIKE '%niềng%'
   OR name ILIKE '%mắc cài%'
   OR name ILIKE '%chỉnh nha%'
   OR name ILIKE '%invisalign%'
   OR name ILIKE '%khay trong%'
   OR name ILIKE '%aligner%'
   OR name ILIKE '%brace%';

COMMIT;

-- Verification:
--   SELECT commission_rate_percent, count(*) FROM products GROUP BY 1 ORDER BY 1;
--   -- expect: 7 → (braces count), 24 → (the rest)
