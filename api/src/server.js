require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('./middleware/auth');
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
const receiptsRoutes = require('./routes/receipts');
const journalsRoutes = require('./routes/journals');
const stockPickingsRoutes = require('./routes/stockPickings');
const crmTasksRoutes = require('./routes/crmTasks');
const commissionsRoutes = require('./routes/commissions');
const hrPayslipsRoutes = require('./routes/hrPayslips');
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
const {
  healthCheck: faceRecognitionHealth,
  getFaceRecognitionProvider,
} = require('./services/faceRecognitionRuntime');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'http://localhost:5175',
  'http://localhost:5715',
  'http://76.13.16.68:5175',
  'https://nk.2checkin.com',
  'https://www.nk.2checkin.com',
  'https://nk2.2checkin.com',
  'https://www.nk2.2checkin.com',
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

const PUBLIC_PATHS = new Set([
  '/api/Auth/login',
  '/api/auth/login',
  '/api/Account/Login',
  '/api/account/login',
  '/api/IpAccess/check',
  '/api/ipaccess/check',
  '/api/health',
]);

app.use('/api', (req, res, next) => {
  const fullPath = req.originalUrl.split('?')[0];
  if (PUBLIC_PATHS.has(fullPath)) return next();
  return requireAuth(req, res, next);
});

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
app.use('/api/Receipts', receiptsRoutes);
app.use('/api/AccountJournals', journalsRoutes);
app.use('/api/StockPickings', stockPickingsRoutes);
app.use('/api/CrmTasks', crmTasksRoutes);
app.use('/api/Commissions', commissionsRoutes);
app.use('/api/HrPayslips', hrPayslipsRoutes);
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
