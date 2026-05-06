const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { getPartnerById } = require('./partners/getPartnerById');
const { checkPartnerUnique, getPartnerKpis, listPartners } = require('./partners/readHandlers');
const { createPartner, hardDeletePartner, softDeletePartner, updatePartner } = require('./partners/mutationHandlers');

const router = express.Router();

router.get('/', requirePermission(['customers.view', 'customers.search']), listPartners);
// declared before /:id to prevent Express matching 'check-unique' as an id param.
router.get('/check-unique', requirePermission(['customers.view', 'customers.search']), checkPartnerUnique);
router.get('/:id', requirePermission(['customers.view', 'customers.search']), getPartnerById);
router.get('/:id/GetKPIs', requirePermission(['customers.view', 'customers.search']), getPartnerKpis);
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), createPartner);
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), updatePartner);
router.patch('/:id/soft-delete', requirePermission('customers.delete'), softDeletePartner);
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), hardDeletePartner);

module.exports = router;
