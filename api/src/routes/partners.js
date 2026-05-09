const express = require('express');
const { requireAnyPermission, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { getPartnerById } = require('./partners/getPartnerById');
const { checkPartnerUnique, getPartnerKpis, listPartners } = require('./partners/readHandlers');
const { createPartner, hardDeletePartner, softDeletePartner, updatePartner } = require('./partners/mutationHandlers');

const router = express.Router();

// Customer picker is used by appointment creation flows; allow staff with appointments.add
// even if they don't have full Customers page access.
router.get('/', requireAnyPermission(['customers.view', 'appointments.add']), listPartners);
// declared before /:id to prevent Express matching 'check-unique' as an id param.
router.get('/check-unique', requirePermission('customers.view'), checkPartnerUnique);
router.get('/:id', requirePermission('customers.view'), getPartnerById);
router.get('/:id/GetKPIs', requirePermission('customers.view'), getPartnerKpis);
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), createPartner);
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), updatePartner);
router.patch('/:id/soft-delete', requirePermission('customers.delete'), softDeletePartner);
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), hardDeletePartner);

module.exports = router;
