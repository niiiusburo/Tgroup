// contracts/payment.ts
import { z } from "zod";

export const PaymentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  partnerid: z.string().uuid(),
  companyid: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay"]),
  status: z.enum(["posted", "voided"]),
  date: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PaymentCreateSchema = PaymentBaseSchema.omit({ id: true });
export const PaymentUpdateSchema = PaymentBaseSchema.partial().required({ id: true });

export type Payment = z.infer<typeof PaymentBaseSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
export type PaymentUpdate = z.infer<typeof PaymentUpdateSchema>;
