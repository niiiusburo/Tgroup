const express = require('express');
const { requirePermission, requireAnyPermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { getPartnerById } = require('./partners/getPartnerById');
const { checkPartnerUnique, getPartnerKpis, listPartners } = require('./partners/readHandlers');
const { createPartner, hardDeletePartner, softDeletePartner, updatePartner } = require('./partners/mutationHandlers');

const router = express.Router();

const CUSTOMER_READ_PERMS = ['customers.view', 'customers.view_all', 'customers.search'];

router.get('/', requireAnyPermission(CUSTOMER_READ_PERMS), listPartners);
// declared before /:id to prevent Express matching 'check-unique' as an id param.
router.get('/check-unique', requireAnyPermission(CUSTOMER_READ_PERMS), checkPartnerUnique);
router.get('/:id', requireAnyPermission(CUSTOMER_READ_PERMS), getPartnerById);
router.get('/:id/GetKPIs', requireAnyPermission(CUSTOMER_READ_PERMS), getPartnerKpis);
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), createPartner);
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), updatePartner);
router.patch('/:id/soft-delete', requirePermission('customers.delete'), softDeletePartner);
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), hardDeletePartner);

module.exports = router;
