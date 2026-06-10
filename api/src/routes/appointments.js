/**
 * @crossref:domain[appointments-calendar]
 * @crossref:used-in[mounted at /api/Appointments (+/api/cosmetic mirror) by api/src/server.js; frontend client website/src/lib/api/appointments.ts]
 * @crossref:uses[api/src/routes/appointments/readHandlers.js, api/src/routes/appointments/mutationHandlers.js, api/src/middleware/auth.js (requirePermission), api/src/middleware/validate.js (@tgroup/contracts schemas), product-map/domains/appointments-calendar.yaml]
 */
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
