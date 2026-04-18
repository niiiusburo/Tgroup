"use strict";
// contracts/partner.ts
// Shared Zod schema for Partner / Customer / Employee
// Imported by both frontend (form validation) and backend (request validation)
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerUpdateSchema = exports.PartnerCreateSchema = exports.PartnerBaseSchema = void 0;
const zod_1 = require("zod");
exports.PartnerBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    code: zod_1.z.string().min(1).max(50),
    name: zod_1.z.string().min(1).max(255),
    phone: zod_1.z.string().max(50).optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
    cityname: zod_1.z.string().optional().nullable(),
    district: zod_1.z.string().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    companyid: zod_1.z.string().uuid(),
    customer: zod_1.z.boolean().default(false),
    employee: zod_1.z.boolean().default(false),
    isdoctor: zod_1.z.boolean().default(false),
    isassistant: zod_1.z.boolean().default(false),
    isreceptionist: zod_1.z.boolean().default(false),
    active: zod_1.z.boolean().default(true),
});
exports.PartnerCreateSchema = exports.PartnerBaseSchema.omit({ id: true });
exports.PartnerUpdateSchema = exports.PartnerBaseSchema.partial().required({ id: true });
