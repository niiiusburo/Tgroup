/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[NK3 Express API route: api/src/routes/reports]
 * @crossref:uses[product-map/domains/reports-analytics.yaml, docs/TEST-MATRIX.md, testbright.md]
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
