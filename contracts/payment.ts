// contracts/payment.ts
import { z } from "zod";

export const PaymentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay", "deposit", "mixed"]),
  notes: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  reference_code: z.string().optional().nullable(),
  status: z.enum(["posted", "voided", "confirmed"]).optional().nullable(),
  deposit_used: z.coerce.number().optional().nullable(),
  cash_amount: z.coerce.number().optional().nullable(),
  bank_amount: z.coerce.number().optional().nullable(),
  deposit_type: z.enum(["deposit", "refund", "usage"]).optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  allocations: z.array(z.object({
    invoice_id: z.string().uuid().optional(),
    dotkham_id: z.string().uuid().optional(),
    allocated_amount: z.coerce.number().optional(),
  })).optional().nullable(),
});

export const PaymentCreateSchema = PaymentBaseSchema.omit({ id: true });
export const PaymentUpdateSchema = PaymentBaseSchema.partial().omit({ id: true });

export type Payment = z.infer<typeof PaymentBaseSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
export type PaymentUpdate = z.infer<typeof PaymentUpdateSchema>;
