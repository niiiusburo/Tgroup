require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const accountRoutes = require('./routes/account');
const sessionRoutes = require('./routes/session');
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
const servicesRoutes = require('./routes/services');
const customerBalanceRoutes = require('./routes/customerBalance');
const monthlyPlansRoutes = require('./routes/monthlyPlans');
const customerSourcesRoutes = require('./routes/customerSources');
const systemPreferencesRoutes = require('./routes/systemPreferences');
const websitePagesRoutes = require('./routes/websitePages');
const placesRoutes = require('./routes/places');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// Routes
app.use('/api/Account', accountRoutes);
app.use('/Web/Session', sessionRoutes);
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
app.use('/api/accountjournals', journalsRoutes);
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
app.use('/api/Services', servicesRoutes);
app.use('/api/CustomerBalance', customerBalanceRoutes);
app.use('/api/MonthlyPlans', monthlyPlansRoutes);
app.use('/api/CustomerSources', customerSourcesRoutes);
app.use('/api/Places', placesRoutes);
app.use('/api/SystemPreferences', systemPreferencesRoutes);
app.use('/api/WebsitePages', websitePagesRoutes);

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
app.use((err, _req, res, _next) => {
  console.error('Unhandled route error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

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
    console.log(`TDental API running on http://localhost:${PORT}`);
  });
}
