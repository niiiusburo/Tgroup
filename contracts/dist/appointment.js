"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentUpdateSchema = exports.AppointmentCreateSchema = exports.AppointmentBaseSchema = void 0;
// contracts/appointment.ts
const zod_1 = require("zod");
exports.AppointmentBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    date: zod_1.z.string().min(1),
    time: zod_1.z.string().optional().nullable(),
    partnerid: zod_1.z.string().uuid().optional(),
    doctorid: zod_1.z.string().uuid().optional().nullable(),
    companyid: zod_1.z.string().uuid().optional(),
    note: zod_1.z.string().optional().nullable(),
    timeexpected: zod_1.z.coerce.number().int().min(1).max(480).optional().nullable(),
    color: zod_1.z.string().optional().nullable(),
    state: zod_1.z.enum(["draft", "scheduled", "confirmed", "arrived", "in Examination", "in-progress", "done", "cancelled"]).optional().nullable(),
    productid: zod_1.z.string().uuid().optional().nullable(),
    assistantid: zod_1.z.string().uuid().optional().nullable(),
    dentalaideid: zod_1.z.string().uuid().optional().nullable(),
});
exports.AppointmentCreateSchema = exports.AppointmentBaseSchema.omit({ id: true });
exports.AppointmentUpdateSchema = exports.AppointmentBaseSchema.partial().omit({ id: true });
