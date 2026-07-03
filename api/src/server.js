require('dotenv').config();

// --- Clustering (perf, opt-in) ---------------------------------------------
// A single Node process serializes concurrent requests on one event loop. When
// WEB_CONCURRENCY>1, fork N workers (capped at CPU count) so a page's 6-15 parallel
// XHRs run across workers. Default 1 = current single-process behavior (zero change).
// IMPORTANT: total DB connections = workers * 2 pools (dental+cosmetic) * DB_POOL_MAX
// must stay under postgres max_connections (100) — size DB_POOL_MAX down when clustering.
const cluster = require('cluster');
const os = require('os');
const _clusterWorkers = parseInt(process.env.WEB_CONCURRENCY || process.env.NODE_CLUSTER_WORKERS || '1', 10);
const _isPrimary = cluster.isPrimary !== undefined ? cluster.isPrimary : cluster.isMaster;
if (_clusterWorkers > 1 && _isPrimary) {
  const n = Math.min(_clusterWorkers, os.cpus().length || _clusterWorkers);
  console.log(`[cluster] primary ${process.pid} starting ${n} workers`);
  for (let i = 0; i < n; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    console.error(`[cluster] worker ${worker.process.pid} exited (code=${code} sig=${signal}); restarting`);
    cluster.fork();
  });
  return; // primary only supervises; workers fall through and run the server below
}

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { requireAuth, requirePermission, requireLobScope } = require('./middleware/auth');
const { dentalLobGate } = require('./middleware/dentalLobGate');
const { attachCosmeticDb } = require('./middleware/lob');
const { enforceIpAccess } = require('./middleware/ipAccess');
const { errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set');
  process.exit(1);
}

const configRoutes = require('./routes/config');
const companiesRoutes = require('./routes/companies');
const partnersRoutes = require('./routes/partners');
const saleOrdersRoutes = require('./routes/saleOrders');
const appointmentsRoutes = require('./routes/appointments');
const customerReceiptsRoutes = require('./routes/customerReceipts');
const dotKhamsRoutes = require('./routes/dotKhams');
const accountPaymentsRoutes = require('./routes/accountPayments');
const cashbooksRoutes = require('./routes/cashbooks');
const commissionConfigRoutes = require('./routes/commissionConfig');
const employeesRoutes = require('./routes/employees');
const productsRoutes = require('./routes/products');
const productCategoriesRoutes = require('./routes/productCategories');
const saleOrderLinesRoutes = require('./routes/saleOrderLines');
const dashboardReportsRoutes = require('./routes/dashboardReports');
const permissionsRoutes = require('./routes/permissions');
const authRoutes = require('./routes/auth');
const paymentsRoutes = require('./routes/payments');
const customerBalanceRoutes = require('./routes/customerBalance');
const monthlyPlansRoutes = require('./routes/monthlyPlans');
const customerSourcesRoutes = require('./routes/customerSources');
const systemPreferencesRoutes = require('./routes/systemPreferences');
const websitePagesRoutes = require('./routes/websitePages');
const placesRoutes = require('./routes/places');
const bankSettingsRoutes = require('./routes/bankSettings');
const externalCheckupsRoutes = require('./routes/externalCheckups');
const faceRecognitionRoutes = require('./routes/faceRecognition');
const feedbackRoutes = require('./routes/feedback');
const reportsRoutes = require('./routes/reports');
const telemetryRoutes = require('./routes/telemetry');
const publicTelemetryErrorRoutes = require('./routes/publicTelemetryErrors');
const publicBangGiaRoutes = require('./routes/publicBangGia');
const { startPricingSyncWorker } = require('./services/pricingSyncWorker');
const ipAccessRoutes = require('./routes/ipAccess');
const exportsRoutes = require('./routes/exports');
const mediaRoutes = require('./routes/media');
const ctvRoutes = require('./routes/ctv');
const ctvProfileRoutes = require('./routes/ctvProfile');
const discountCodesRoutes = require('./routes/discountCodes');
const ctvsRoutes = require('./routes/ctvs');
const earningsRoutes = require('./routes/earnings');
const payoutsRoutes = require('./routes/payouts');
const newClientsRoutes = require('./routes/newClients');
const {
  healthCheck: faceRecognitionHealth,
  getFaceRecognitionProvider,
} = require('./services/faceRecognitionRuntime');
const { query, runWithLob } = require('./db');

// TGClinic uses explicit Authorization: Bearer JWTs, not cookie-backed auth; see docs/SECURITY.md.
// nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'http://localhost:5175',
  'http://localhost:5715',
  'http://76.13.16.68:5175',
  'http://76.13.16.68:5275',
  'http://76.13.16.68:5375',
  'https://nk.2checkin.com',
  'https://www.nk.2checkin.com',
  'https://nk2.2checkin.com',
  'https://www.nk2.2checkin.com',
  'https://nk3.2checkin.com',
  'https://www.nk3.2checkin.com',
  'https://76-13-16-68.sslip.io',
  'https://tmv.2checkin.com',
  'https://www.tmv.2checkin.com',
];
app.use(helmet());
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):(517\d|5715|3\d{3})$/;
app.use(cors({ origin: (o, cb) => !o || ALLOWED_ORIGINS.includes(o) || DEV_ORIGIN.test(o) ? cb(null, true) : cb(new Error(`CORS: ${o}`)), credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

const loginRateLimitMessage = { error: 'Too many login attempts, please try again later.' };
const loginWindowMs = 15 * 60 * 1000;
const normalizeLoginEmail = (req) => String(req.body?.email || 'missing-email').trim().toLowerCase();
const safeIpKey = (req) => rateLimit.ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown-ip');

const loginIpFailureLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: process.env.NODE_ENV === 'development' ? 500 : 75,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: loginRateLimitMessage,
});

const loginAccountFailureLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: process.env.NODE_ENV === 'development' ? 100 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${normalizeLoginEmail(req)}:${safeIpKey(req)}`,
  message: loginRateLimitMessage,
});

const loginLimiters = [loginIpFailureLimiter, loginAccountFailureLimiter];
app.use('/api/Auth/login', loginLimiters);
app.use('/api/investor/auth/login', loginLimiters);
app.use('/api/investor/auth/password-reset-request', loginLimiters);
app.use('/api/investor/auth/password-reset', loginLimiters);

// Request logger
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// IP Access Control enforcement — applies before auth so blocked IPs cannot even login
app.use('/api', enforceIpAccess);

// AutoDebugger: public error collection endpoint (before auth)
// Frontend reports errors here; management endpoints stay behind auth
app.use('/api/telemetry/errors', publicTelemetryErrorRoutes);
app.use('/api/patient', require('./routes/patient'));
app.use('/api/investor', require('./routes/investor'));

// Public (unauthenticated) CTV self-signup via referral link — mounted BEFORE the /api auth gate.
app.use('/api/ctv-public', require('./routes/ctvPublic'));
app.use('/api/public/bang-gia', publicBangGiaRoutes);

const { isPublicApiPath } = require('./middleware/publicApiPaths');

app.use('/api', (req, res, next) => {
  const fullPath = req.originalUrl.split('?')[0];
  if (isPublicApiPath(fullPath, req.method)) return next();
  return requireAuth(req, res, next);
});

// LOB hard gate for the legacy dental routes (symmetric to the /api/cosmetic/* mirror's
// requireLobScope('cosmetic')). Closes the cross-LOB hole where a cosmetic-only/CTV token
// could read dental data (incl. patient PHI via /api/Partners) directly, bypassing the
// frontend LOB pin (INV-008A). Cross-cutting routes pass through; see middleware/dentalLobGate.js.
app.use('/api', dentalLobGate);

// Routes
app.use('/api/IrConfigParameters', configRoutes);
app.use('/api/Companies', companiesRoutes);
app.use('/api/Partners', partnersRoutes);
app.use('/api/investor-visibility', require('./routes/investor/staffVisibility'));
app.use('/api/admin/investors', require('./routes/investor/adminStaff'));

// ─── Cross-LOB identity probe (D6 / lob.crossview) ───────────────────────────
// Admin-only soft phone match across the two physical DBs. Cross-cutting (not in
// dentalLobGate's scoped set, so it passes through), and reads the OTHER LOB pool by
// design via getDb(). Powers the "also a {dental|cosmetic} client" profile badge AND
// the Face ID cross-LOB chooser. Restored after being dropped in the cosmetic-LOB merge.
app.get('/api/cross-lob-probe', requirePermission('lob.crossview'), async (req, res) => {
  const { phone, lob } = req.query || {};
  if (!phone || (lob !== 'dental' && lob !== 'cosmetic')) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'phone and lob=dental|cosmetic required' } });
  }
  const otherLob = lob === 'dental' ? 'cosmetic' : 'dental';
  // Soft phone key: last 9 significant digits (handles VN 84/0 prefix variants).
  const key = String(phone).replace(/\D/g, '').slice(-9);
  if (!key) return res.json({ matched: false, otherLob });
  try {
    const { getDb } = require('./db');
    const rows = await getDb(otherLob).queryRows(
      `SELECT id, name, phone FROM dbo.partners
       WHERE customer = true AND isdeleted = false
         AND phone IS NOT NULL AND phone <> ''
         AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) = $1
       LIMIT 1`,
      [key]
    );
    const r = rows && rows[0];
    if (r) {
      return res.json({ matched: true, otherLob, otherId: r.id, otherName: r.name, matchedPhone: r.phone });
    }
    return res.json({ matched: false, otherLob });
  } catch (err) {
    console.error('cross-lob-probe error:', err);
    return res.status(500).json({ error: { code: 'PROBE_FAILED' } });
  }
});
app.use('/api/SaleOrders', saleOrdersRoutes);
app.use('/api/Appointments', appointmentsRoutes);
app.use('/api/CustomerReceipts', customerReceiptsRoutes);
app.use('/api/DotKhams', dotKhamsRoutes);
app.use('/api/AccountPayments', accountPaymentsRoutes);
app.use('/api/CashBooks', cashbooksRoutes);
app.use('/api/CommissionConfig', commissionConfigRoutes);
app.use('/api/Ctvs', ctvsRoutes);
app.use('/api/Earnings', earningsRoutes);
app.use('/api/Payouts', payoutsRoutes);
app.use('/api/NewClients', newClientsRoutes);
app.use('/api/Employees', employeesRoutes);
app.use('/api/Products', productsRoutes);
app.use('/api/ProductCategories', productCategoriesRoutes);
app.use('/api/SaleOrderLines', saleOrderLinesRoutes);
app.use('/api/DashboardReports', dashboardReportsRoutes);
app.use('/api/Permissions', permissionsRoutes);
app.use('/api/Auth', authRoutes);
app.use('/api/Payments', paymentsRoutes);
app.use('/api/CustomerBalance', customerBalanceRoutes);
app.use('/api/MonthlyPlans', monthlyPlansRoutes);
app.use('/api/CustomerSources', customerSourcesRoutes);
app.use('/api/Places', placesRoutes);
app.use('/api/SystemPreferences', systemPreferencesRoutes);
app.use('/api/WebsitePages', websitePagesRoutes);
app.use('/api/settings', bankSettingsRoutes);
app.use('/api/ExternalCheckups', externalCheckupsRoutes);
app.use('/api/face', faceRecognitionRoutes);
app.use('/api/Feedback', feedbackRoutes);
app.use('/api/Reports', reportsRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/IpAccess', ipAccessRoutes);
app.use('/api/Exports', exportsRoutes);
app.use('/api/media', mediaRoutes);

// === Cosmetic LOB v2: /api/cosmetic/* mirrors (Phase 1) ===
// Reuses the *exact same* route handler modules as dental (DRY).
// Dynamic DB resolution via ALS + runWithLob in db.js makes their internal `query()` calls
// target tcosmetic_demo when the request context is set.
// Gated by feature flag (503) + requireLobScope('cosmetic') hard gate (S_LOB_FORBIDDEN).
// All core admin surfaces (customers, employees, products, services, appointments, payments, reports, etc.)
// become functional against the empty cosmetic DB with zero handler duplication.
const COSMETIC_FLAG = process.env.COSMETIC_LOB_ENABLED === 'true';
if (COSMETIC_FLAG) {
  const cosmeticRouter = express.Router();

  // 1. LOB scope hard gate (CTV and dental-only users get 403 S_LOB_FORBIDDEN)
  cosmeticRouter.use(requireLobScope('cosmetic'));

  // 2. Attach cosmetic DB context (req.db + req.lob) so that handlers using getQuery(req) or updated paths target tcosmetic_demo
  // (Dental paths remain untouched and default to dental.)
  cosmeticRouter.use(attachCosmeticDb);

  // 2b. ALS context wrapper (Finishing Swarm): ensures bare legacy `query()` calls (via getCurrentLob) also resolve to cosmetic
  // when inside /api/cosmetic/* . Complements getQuery(req) migrations. Safe additive; dental paths unaffected.
  cosmeticRouter.use((req, res, next) => {
    const lob = req.lob || 'cosmetic';
    runWithLob(lob, next);
  });

  // 3. Soft permission gate (cosmetic.access registered in permissionService + product-map)
  cosmeticRouter.use(requirePermission('cosmetic.access'));

  // 4. Mount the identical dental routers under /cosmetic prefix.
  // Client calls /api/cosmetic/Partners → partnersRoutes (which registers GET /) → listPartners etc see req.db via getQuery(req).
  cosmeticRouter.use('/Partners', partnersRoutes);
  cosmeticRouter.use('/Employees', employeesRoutes);
  cosmeticRouter.use('/Products', productsRoutes);
  cosmeticRouter.use('/ProductCategories', productCategoriesRoutes);
  cosmeticRouter.use('/SaleOrders', saleOrdersRoutes);
  cosmeticRouter.use('/SaleOrderLines', saleOrderLinesRoutes);
  cosmeticRouter.use('/Appointments', appointmentsRoutes);
  cosmeticRouter.use('/Payments', paymentsRoutes);
  cosmeticRouter.use('/Companies', companiesRoutes);
  cosmeticRouter.use('/Reports', reportsRoutes);
  cosmeticRouter.use('/DashboardReports', dashboardReportsRoutes);
  cosmeticRouter.use('/media', mediaRoutes);
  cosmeticRouter.use('/CustomerBalance', customerBalanceRoutes);
  cosmeticRouter.use('/CustomerReceipts', customerReceiptsRoutes);
  cosmeticRouter.use('/CustomerSources', customerSourcesRoutes);
  cosmeticRouter.use('/CommissionConfig', commissionConfigRoutes);
  cosmeticRouter.use('/Ctvs', ctvsRoutes);
  cosmeticRouter.use('/NewClients', newClientsRoutes);
  cosmeticRouter.use('/Earnings', earningsRoutes);
  cosmeticRouter.use('/Payouts', payoutsRoutes);
  cosmeticRouter.use('/Permissions', permissionsRoutes);
  cosmeticRouter.use('/AccountPayments', accountPaymentsRoutes);
  // cosmeticRouter.use('/CrmTasks', crmTasksRoutes); // DEAD ROUTE: crmTasks.js queries non-existent dbo.crmtasks (HTTP 500)
  cosmeticRouter.use('/DotKhams', dotKhamsRoutes);
  cosmeticRouter.use('/MonthlyPlans', monthlyPlansRoutes);
  cosmeticRouter.use('/settings', bankSettingsRoutes);
  cosmeticRouter.use('/ExternalCheckups', externalCheckupsRoutes);
  cosmeticRouter.use('/face', faceRecognitionRoutes);
  cosmeticRouter.use('/Exports', exportsRoutes);
  // Add more mirrors (e.g. /Services if revived, feedback, etc.) as needed for full admin reuse

  app.use('/api/cosmetic', cosmeticRouter);
  console.log('[CosmeticLOB] /api/cosmetic/* mirrors mounted (flag=true, using tcosmetic_demo via req context)');
} else {
  // When flag off, still register a 503 handler so clients get clear signal (no 404 mystery)
  app.use('/api/cosmetic', (req, res) => {
    res.status(503).json({
      error: {
        code: 'COSMETIC_LOB_DISABLED',
        message: 'Cosmetic LOB is disabled (COSMETIC_LOB_ENABLED=false)',
      },
    });
  });
}
app.use('/api/ctv', requirePermission('ctv.dashboard.view'), ctvProfileRoutes);
app.use('/api/ctv', requirePermission('ctv.dashboard.view'), ctvRoutes);
app.use('/api/discount-codes', discountCodesRoutes);

app.get('/api/health', async (_req, res) => {
  const checks = { db: false, faceService: false };
  let dbLatency = 0;
  let faceLatency = 0;

  const dbStart = Date.now();
  try {
    await query('SELECT 1');
    checks.db = true;
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    console.error('[Health] DB check failed:', err.message);
  }

  const faceStart = Date.now();
  try {
    const fh = await faceRecognitionHealth();
    checks.faceService = fh.ok;
    faceLatency = Date.now() - faceStart;
  } catch (err) {
    console.error('[Health] Face service check failed:', err.message);
  }

  const allHealthy = checks.db && checks.faceService;
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    faceProvider: getFaceRecognitionProvider(),
    latency: { db: dbLatency, faceService: faceLatency },
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded feedback attachments
app.use('/uploads/feedback', express.static(path.join(__dirname, '..', 'uploads', 'feedback')));

// Serve uploaded payout receipt photos
app.use('/uploads/payouts', express.static(path.join(__dirname, '..', 'uploads', 'payouts')));

// Stub image endpoint used by partner avatars
app.get('/api/web/Image2', (req, res) => {
  res.status(204).end();
});

// ============================================================================
// API docs (Swagger UI) — opt-in outside development.
// Gated behind NODE_ENV!=production OR ENABLE_API_DOCS=1 so prod is opt-in:
// the spec leaks internal route shapes, so we do not want it surfaced to the
// public internet unless the operator explicitly enables it. In dev/staging,
// the UI is always reachable. ENABLE_DOCS_PERSIST_AUTH=1 opts into Swagger UI's
// `persistAuthorization: true` (writes the JWT to localStorage in the caller's
// browser); default is off to avoid leaving JWTs on shared/personal machines.
// ============================================================================
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === '1') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const yaml = require('js-yaml');
    const fsForDocs = require('fs');
    const OPENAPI_PATH = path.join(__dirname, '..', 'openapi.yaml');
    // Cache the spec once at boot. Avoids re-reading the file per request.
    let openapiSpec = null;
    let openapiRaw = null;
    if (fsForDocs.existsSync(OPENAPI_PATH)) {
      try {
        openapiRaw = fsForDocs.readFileSync(OPENAPI_PATH, 'utf8');
        openapiSpec = yaml.load(openapiRaw);
      } catch (yamlErr) {
        console.error('[docs] api/openapi.yaml failed to parse; Swagger UI disabled:', yamlErr.message);
      }
    } else {
      console.warn('[docs] api/openapi.yaml not found; Swagger UI disabled');
    }
    if (openapiSpec) {
      // Cached raw YAML/JSON so the spec is served exactly as on disk.
      app.get('/api/docs/openapi.yaml', (req, res) => {
        res.type('application/yaml').send(openapiRaw);
      });
      app.get('/api/docs/openapi.json', (req, res) => {
        res.type('application/json').send(JSON.stringify(openapiSpec, null, 2));
      });
      // Anything we keep here is fully reachable to anyone who can fetch
      // /api/docs (including unauthenticated visitors in dev), so be
      // conservative about what ends up in the published description fields.
      const persistAuth = process.env.ENABLE_DOCS_PERSIST_AUTH === '1';
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
        customSiteTitle: 'TGClinic NK3 API Docs',
        swaggerOptions: {
          persistAuthorization: persistAuth,
          // The Try-it-Out box makes a real call as the visitor. Show it but warn.
          docExpansion: 'list',
          // Cap the bundled payload response by leaving display deep-linking on for permalinks.
          displayOperationId: false,
          displayRequestDuration: true,
          filter: true,
        },
      }));
      // Friendly redirect /api/docs → /api/docs/
      app.get('/api/docs', (req, res) => res.redirect('/api/docs/'));
      console.log(`[docs] Swagger UI enabled at /api/docs (NODE_ENV=${process.env.NODE_ENV || 'development'}, persistAuthorization=${persistAuth})`);
    }
  } catch (err) {
    // Surface a real stack on first failure so misconfiguration is debuggable.
    console.error('[docs] Swagger UI failed to load:', err && err.stack ? err.stack : err);
  }
}

// 404 fallback
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// Global error-handling middleware — catches thrown errors in routes
// Also persists to error_events for AutoDebugger pipeline
app.use(errorHandler);

// Prevent process crashes from unhandled rejections/exceptions
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Export for testing
module.exports = app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`TG Clinic API running on http://localhost:${PORT}`);
    startPricingSyncWorker();
  });
}
