const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AppointmentCreateSchema, AppointmentUpdateSchema } = require('@tgroup/contracts');
const { getAppointmentById, listAppointments } = require('./appointments/readHandlers');
const { createAppointment, updateAppointment } = require('./appointments/mutationHandlers');

const router = express.Router();

router.get('/', requirePermission('appointments.view'), listAppointments);
router.get('/:id', requirePermission('appointments.view'), getAppointmentById);
router.post('/', requirePermission('appointments.add'), validate(AppointmentCreateSchema), createAppointment);
router.put('/:id', requirePermission('appointments.edit'), validate(AppointmentUpdateSchema), updateAppointment);

module.exports = router;
