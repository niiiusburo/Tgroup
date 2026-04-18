"use strict";
// contracts/partner.ts
// Shared Zod schema for Partner / Customer / Employee
// Imported by both frontend (form validation) and backend (request validation)
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerUpdateSchema = exports.PartnerCreateSchema = exports.PartnerBaseSchema = void 0;
const zod_1 = require("zod");
exports.PartnerBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(255),
    phone: zod_1.z.string().max(50),
    email: zod_1.z.string().email().optional().nullable(),
    companyid: zod_1.z.string().uuid().optional().nullable(),
    gender: zod_1.z.string().optional().nullable(),
    birthday: zod_1.z.coerce.number().int().min(1).max(31).optional().nullable(),
    birthmonth: zod_1.z.coerce.number().int().min(1).max(12).optional().nullable(),
    birthyear: zod_1.z.coerce.number().int().optional().nullable(),
    street: zod_1.z.string().optional().nullable(),
    cityname: zod_1.z.string().optional().nullable(),
    districtname: zod_1.z.string().optional().nullable(),
    wardname: zod_1.z.string().optional().nullable(),
    medicalhistory: zod_1.z.string().optional().nullable(),
    note: zod_1.z.string().optional().nullable(),
    comment: zod_1.z.string().optional().nullable(),
    referraluserid: zod_1.z.string().uuid().optional().nullable(),
    weight: zod_1.z.coerce.number().optional().nullable(),
    identitynumber: zod_1.z.string().optional().nullable(),
    healthinsurancecardnumber: zod_1.z.string().optional().nullable(),
    emergencyphone: zod_1.z.string().optional().nullable(),
    jobtitle: zod_1.z.string().optional().nullable(),
    taxcode: zod_1.z.string().optional().nullable(),
    unitname: zod_1.z.string().optional().nullable(),
    unitaddress: zod_1.z.string().optional().nullable(),
    isbusinessinvoice: zod_1.z.boolean().optional().nullable(),
    personalname: zod_1.z.string().optional().nullable(),
    personalidentitycard: zod_1.z.string().optional().nullable(),
    personaltaxcode: zod_1.z.string().optional().nullable(),
    personaladdress: zod_1.z.string().optional().nullable(),
    salestaffid: zod_1.z.string().uuid().optional().nullable(),
    cskhid: zod_1.z.string().uuid().optional().nullable(),
    customer: zod_1.z.boolean().default(true),
    status: zod_1.z.boolean().default(true),
    ref: zod_1.z.string().optional().nullable(),
});
exports.PartnerCreateSchema = exports.PartnerBaseSchema.omit({ id: true });
exports.PartnerUpdateSchema = exports.PartnerBaseSchema.partial().omit({ id: true });
