/**
 * ctv/index.js — Express router that mounts all CTV sub-routers.
 *
 * This is the split entry point for the former monolithic ctv.js (pure mechanical
 * extraction; no logic/SQL changes). server.js still does `require('./routes/ctv')`,
 * which Node resolves to this directory's index.js.
 *
 * Mounted at /api/ctv (gated by ctv.dashboard.view perm + requireAuth in server.js).
 * Note: GET /api/ctv/me is served by ctvProfileRoutes (mounted before this router in
 * server.js); it is NOT defined here.
 *
 * Sub-routers:
 *   - commission.js — GET /commission-summary (earnings/payouts aggregation)
 *   - clients.js    — GET /referrals, GET /client-journeys, POST /clients,
 *                     GET /client-lookup, GET /services
 *   - bookings.js   — POST /bookings
 *   - network.js    — GET /network, GET /hierarchy
 *   - profile.js    — POST / (authed CTV/admin create)
 *
 * @crossref:endpoint[GET /api/ctv/commission-summary, GET /api/ctv/referrals, GET /api/ctv/client-journeys, POST /api/ctv, POST /api/ctv/clients, POST /api/ctv/bookings, GET /api/ctv/network, GET /api/ctv/hierarchy, GET /api/ctv/client-lookup, GET /api/ctv/services]
 * @crossref:uses[api/src/routes/ctv/commission.js, clients.js, bookings.js, network.js, profile.js, api/src/middleware/auth.js (requireAuth), api/src/services/permissionService.js, product-map/domains/ctv.yaml]
 */
const express = require('express');

const commissionRouter = require('./commission');
const clientsRouter = require('./clients');
const bookingsRouter = require('./bookings');
const networkRouter = require('./network');
const profileRouter = require('./profile');

const mainRouter = express.Router();

mainRouter.use(commissionRouter);
mainRouter.use(clientsRouter);
mainRouter.use(bookingsRouter);
mainRouter.use(networkRouter);
mainRouter.use(profileRouter);

module.exports = mainRouter;
