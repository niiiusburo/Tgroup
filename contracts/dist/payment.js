"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentUpdateSchema = exports.PaymentCreateSchema = exports.PaymentBaseSchema = void 0;
// contracts/payment.ts
const zod_1 = require("zod");
exports.PaymentBaseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    customer_id: zod_1.z.string().uuid(),
    service_id: zod_1.z.string().uuid().optional().nullable(),
    amount: zod_1.z.coerce.number().positive(),
    method: zod_1.z.enum(["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay", "deposit", "mixed"]),
    notes: zod_1.z.string().optional().nullable(),
    payment_date: zod_1.z.string().optional().nullable(),
    reference_code: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(["posted", "voided"]).optional().nullable(),
    deposit_used: zod_1.z.coerce.number().optional().nullable(),
    cash_amount: zod_1.z.coerce.number().optional().nullable(),
    bank_amount: zod_1.z.coerce.number().optional().nullable(),
    deposit_type: zod_1.z.enum(["deposit", "refund", "usage"]).optional().nullable(),
    receipt_number: zod_1.z.string().optional().nullable(),
    allocations: zod_1.z.array(zod_1.z.object({
        invoice_id: zod_1.z.string().uuid().optional(),
        dotkham_id: zod_1.z.string().uuid().optional(),
        allocated_amount: zod_1.z.coerce.number().optional(),
    })).optional().nullable(),
});
exports.PaymentCreateSchema = exports.PaymentBaseSchema.omit({ id: true });
exports.PaymentUpdateSchema = exports.PaymentBaseSchema.partial().omit({ id: true });
