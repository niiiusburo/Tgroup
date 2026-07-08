const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { getPartnerById } = require('./partners/getPartnerById');
const { checkPartnerUnique, getPartnerKpis, listPartners } = require('./partners/readHandlers');
const { createPartner, hardDeletePartner, softDeletePartner, updatePartner } = require('./partners/mutationHandlers');
const { resolvePartner } = require('./partners/resolveHandler');
const { listInvestorVisibility, setInvestorVisibility } = require('./partners/investorVisibility');

const router = express.Router();

router.get('/', requirePermission('customers.view'), listPartners);
// declared before /:id to prevent Express matching these as an id param.
router.get('/check-unique', requirePermission('customers.view'), checkPartnerUnique);
// Investor visibility is an ADMIN function: the handler enforces assertAdmin
// (admin / super admin / system admin / '*'), matching the frontend gate on the
// Customers page. It is NOT gated on the narrower 'permissions.edit' — that
// mismatch let an admin see the checkbox but get 403 from the API. Any admin can
// tick the box; global requireAuth populates req.user, assertAdmin does the rest.
router.get('/investor-visibility', listInvestorVisibility);
router.get('/resolve', requirePermission('customers.view'), resolvePartner);
router.get('/:id', requirePermission('customers.view'), getPartnerById);
router.get('/:id/GetKPIs', requirePermission('customers.view'), getPartnerKpis);
router.patch('/:id/investor-visibility', setInvestorVisibility);
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), createPartner);
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), updatePartner);
router.patch('/:id/soft-delete', requirePermission('customers.delete'), softDeletePartner);
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), hardDeletePartner);

module.exports = router;
