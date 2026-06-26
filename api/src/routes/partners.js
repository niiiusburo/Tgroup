/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[Express router for /api/Partners: mounted in api/src/server.js; called by website/src/lib/api/partners.ts]
 * @crossref:uses[api/src/routes/partners/getPartnerById.js, api/src/routes/partners/readHandlers.js, api/src/routes/partners/mutationHandlers.js, api/src/routes/partners/resolveHandler.js, api/src/middleware/auth.js, product-map/domains/customers-partners.yaml]
 */
const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { getPartnerById } = require('./partners/getPartnerById');
const { checkPartnerUnique, getPartnerKpis, listPartners } = require('./partners/readHandlers');
const { createPartner, hardDeletePartner, softDeletePartner, updatePartner } = require('./partners/mutationHandlers');
const { resolvePartner } = require('./partners/resolveHandler');
const { patchInvestorVisibility } = require('./partners/investorVisibilityPatch');

const router = express.Router();

router.get('/', requirePermission('customers.view'), listPartners);
// declared before /:id to prevent Express matching these as an id param.
router.get('/check-unique', requirePermission('customers.view'), checkPartnerUnique);
router.get('/resolve', requirePermission('customers.view'), resolvePartner);
router.patch('/:id/investor-visibility', requirePermission('customers.set_investor_visibility'), patchInvestorVisibility);
router.get('/:id', requirePermission('customers.view'), getPartnerById);
router.get('/:id/GetKPIs', requirePermission('customers.view'), getPartnerKpis);
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), createPartner);
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), updatePartner);
router.patch('/:id/soft-delete', requirePermission('customers.delete'), softDeletePartner);
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), hardDeletePartner);

module.exports = router;
