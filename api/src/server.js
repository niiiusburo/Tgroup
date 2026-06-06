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

// const accountRoutes = require('./routes/account'); // LEGACY: duplicates /api/Auth
// const sessionRoutes = require('./routes/session'); // LEGACY: deprecated
const configRoutes = require('./routes/config');
const companiesRoutes = require('./routes/companies');
const partnersRoutes = require('./routes/partners');
const saleOrdersRoutes = require('./routes/saleOrders');
const appointmentsRoutes = require('./routes/appointments');
const customerReceiptsRoutes = require('./routes/customerReceipts');
const dotKhamsRoutes = require('./routes/dotKhams');
const accountPaymentsRoutes = require('./routes/accountPayments');
const cashbooksRoutes = require('./routes/cashbooks');
// const receiptsRoutes = require('./routes/receipts');        // DEAD ROUTE (500) — disabled 2026-06-06
// const journalsRoutes = require('./routes/journals');         // DEAD ROUTE (500) — disabled 2026-06-06
// const stockPickingsRoutes = require('./routes/stockPickings'); // DEAD ROUTE (500) — disabled 2026-06-06
// const crmTasksRoutes = require('./routes/crmTasks'); // DEAD ROUTE: crmTasks.js queries non-existent dbo.crmtasks (HTTP 500)
// const commissionsRoutes = require('./routes/commissions');  // DEAD ROUTE (500) — disabled 2026-06-06
const commissionConfigRoutes = require('./routes/commissionConfig');
// const hrPayslipsRoutes = require('./routes/hrPayslips');     // DEAD ROUTE (500) — disabled 2026-06-06
const employeesRoutes = require('./routes/employees');
const productsRoutes = require('./routes/products');
const productCategoriesRoutes = require('./routes/productCategories');
const saleOrderLinesRoutes = require('./routes/saleOrderLines');
const dashboardReportsRoutes = require('./routes/dashboardReports');
const permissionsRoutes = require('./routes/permissions');
const authRoutes = require('./routes/auth');
const paymentsRoutes = require('./routes/payments');
// const servicesRoutes removed: dead route queries non-existent table
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
const ipAccessRoutes = require('./routes/ipAccess');
const exportsRoutes = require('./routes/exports');
const ctvRoutes = require('./routes/ctv');
const ctvProfileRoutes = require('./routes/ctvProfile');
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
// app.use('/api/Account/Login', loginLimiters);  // LEGACY
// app.use('/api/account/login', loginLimiters);  // LEGACY

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

// Public (unauthenticated) CTV self-signup via referral link — mounted BEFORE the /api auth gate.
app.use('/api/ctv-public', require('./routes/ctvPublic'));

const PUBLIC_PATHS = new Set([
  '/api/Auth/login',
  '/api/auth/login',
  '/api/Account/Login',
  '/api/account/login',
  '/api/IpAccess/check',
  '/api/ipaccess/check',
  '/api/health',
  // Fire-and-forget version-update telemetry (POSTed via keepalive fetch with no auth header,
  // often on page unload / pre-login). Self-protected: IP rate-limit (10/min) + strict event
  // allow-list in routes/telemetry.js. Public like /api/telemetry/errors; was 401-spamming + losing events.
  '/api/telemetry/version',
]);

app.use('/api', (req, res, next) => {
  const fullPath = req.originalUrl.split('?')[0];
  if (PUBLIC_PATHS.has(fullPath)) return next();
  return requireAuth(req, res, next);
});

// LOB hard gate for the legacy dental routes (symmetric to the /api/cosmetic/* mirror's
// requireLobScope('cosmetic')). Closes the cross-LOB hole where a cosmetic-only/CTV token
// could read dental data (incl. patient PHI via /api/Partners) directly, bypassing the
// frontend LOB pin (INV-008A). Cross-cutting routes pass through; see middleware/dentalLobGate.js.
app.use('/api', dentalLobGate);

// Routes
// LEGACY: /api/Account duplicates /api/Auth — verify no external clients use this
// app.use('/api/Account', accountRoutes);
// LEGACY: Session route — verify no external clients before removing
// app.use('/Web/Session', sessionRoutes);
app.use('/api/IrConfigParameters', configRoutes);
app.use('/api/Companies', companiesRoutes);
app.use('/api/Partners', partnersRoutes);
app.use('/api/SaleOrders', saleOrdersRoutes);
app.use('/api/Appointments', appointmentsRoutes);
app.use('/api/CustomerReceipts', customerReceiptsRoutes);
app.use('/api/DotKhams', dotKhamsRoutes);
app.use('/api/AccountPayments', accountPaymentsRoutes);
app.use('/api/CashBooks', cashbooksRoutes);
// DEAD ROUTES (HTTP 500 for all users on NK3 — underlying tables/columns do not exist; 0 frontend references).
// Disabled 2026-06-06 to stop 500s. Re-enable only after the backing schema is created.
//   /api/Receipts        → "column cr.partnerid does not exist"
//   /api/AccountJournals → "relation accountjournals does not exist"
//   /api/StockPickings   → "relation stockpickings does not exist"
// app.use('/api/Receipts', receiptsRoutes);
// app.use('/api/AccountJournals', journalsRoutes);
// app.use('/api/StockPickings', stockPickingsRoutes);
// app.use('/api/CrmTasks', crmTasksRoutes); // DEAD ROUTE: crmTasks.js queries non-existent dbo.crmtasks (HTTP 500). Matches the dead Services route.
// DEAD ROUTE (HTTP 500): legacy "commissions" table does not exist on NK3 (superseded by the
// v3 per-service earnings model). 0 frontend references. Disabled 2026-06-06.
// app.use('/api/Commissions', commissionsRoutes);
app.use('/api/CommissionConfig', commissionConfigRoutes);
app.use('/api/Ctvs', ctvsRoutes);
app.use('/api/Earnings', earningsRoutes);
app.use('/api/Payouts', payoutsRoutes);
app.use('/api/NewClients', newClientsRoutes);
// DEAD ROUTE (HTTP 500): "relation hrpayslips does not exist" on NK3. 0 frontend references. Disabled 2026-06-06.
// app.use('/api/HrPayslips', hrPayslipsRoutes);
app.use('/api/Employees', employeesRoutes);
app.use('/api/Products', productsRoutes);
app.use('/api/ProductCategories', productCategoriesRoutes);
app.use('/api/SaleOrderLines', saleOrderLinesRoutes);
app.use('/api/DashboardReports', dashboardReportsRoutes);
app.use('/api/Permissions', permissionsRoutes);
app.use('/api/Auth', authRoutes);
app.use('/api/Payments', paymentsRoutes);
// DEAD ROUTE: services.js queries non-existent public.services table
// app.use('/api/Services', servicesRoutes);
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

// === Cosmetic LOB v2: /api/cosmetic/* mirrors (Phase 1) ===
// Reuses the *exact same* route handler modules as dental (DRY).
// Dynamic DB resolution via ALS + runWithLob in db/index.js makes their internal `query()` calls
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
  cosmeticRouter.use('/CustomerBalance', customerBalanceRoutes);
  cosmeticRouter.use('/CustomerReceipts', customerReceiptsRoutes);
  cosmeticRouter.use('/CustomerSources', customerSourcesRoutes);
  cosmeticRouter.use('/CommissionConfig', commissionConfigRoutes);
  cosmeticRouter.use('/Ctvs', ctvsRoutes);
  cosmeticRouter.use('/NewClients', newClientsRoutes);
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
  });
}
