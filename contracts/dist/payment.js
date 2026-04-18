"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentUpdateSchema = exports.PaymentCreateSchema = exports.PaymentBaseSchema = void 0;
// contracts/payment.ts
const zod_1 = require("zod");
exports.PaymentBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    partnerid: zod_1.z.string().uuid(),
    companyid: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive(),
    method: zod_1.z.enum(["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay"]),
    status: zod_1.z.enum(["posted", "voided"]),
    date: zod_1.z.string().datetime().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.PaymentCreateSchema = exports.PaymentBaseSchema.omit({ id: true });
exports.PaymentUpdateSchema = exports.PaymentBaseSchema.partial().required({ id: true });
