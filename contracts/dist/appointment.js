"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentUpdateSchema = exports.AppointmentCreateSchema = exports.AppointmentBaseSchema = void 0;
// contracts/appointment.ts
const zod_1 = require("zod");
exports.AppointmentBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    partnerid: zod_1.z.string().uuid(),
    doctorid: zod_1.z.string().uuid(),
    companyid: zod_1.z.string().uuid(),
    productid: zod_1.z.string().uuid(),
    time: zod_1.z.string().datetime(),
    status: zod_1.z.enum(["scheduled", "arrived", "completed", "cancelled"]),
    color: zod_1.z.string().max(1).optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.AppointmentCreateSchema = exports.AppointmentBaseSchema.omit({ id: true });
exports.AppointmentUpdateSchema = exports.AppointmentBaseSchema.partial().required({ id: true });
