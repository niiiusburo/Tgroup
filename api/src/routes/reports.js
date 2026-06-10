/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[Express router for /api/Reports: mounted in api/src/server.js; called by website/src/hooks/useReportData.ts (POST /Reports/*)]
 * @crossref:uses[api/src/routes/reports/dashboard.js, api/src/routes/reports/revenue.js, api/src/routes/reports/revenueBreakdowns.js, api/src/routes/reports/cashFlow.js, and sibling api/src/routes/reports/*.js, product-map/domains/reports-analytics.yaml]
 */
const express = require('express');

const router = express.Router();

router.use('/dashboard', require('./reports/dashboard'));
router.use('/', require('./reports/revenue'));
router.use('/', require('./reports/revenueBreakdowns'));
router.use('/', require('./reports/cashFlow'));
router.use('/', require('./reports/appointments'));
router.use('/', require('./reports/doctors'));
router.use('/', require('./reports/customers'));
router.use('/', require('./reports/employeesOverview'));
router.use('/', require('./reports/servicesBreakdown'));
router.use('/', require('./reports/locationsComparison'));

module.exports = router;
