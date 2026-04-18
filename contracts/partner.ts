// contracts/partner.ts
// Shared Zod schema for Partner / Customer / Employee
// Imported by both frontend (form validation) and backend (request validation)

import { z } from "zod";

export const PartnerBaseSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  cityname: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  companyid: z.string().uuid(),
  customer: z.boolean().default(false),
  employee: z.boolean().default(false),
  isdoctor: z.boolean().default(false),
  isassistant: z.boolean().default(false),
  isreceptionist: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const PartnerCreateSchema = PartnerBaseSchema.omit({ id: true });
export const PartnerUpdateSchema = PartnerBaseSchema.partial().required({ id: true });

export type Partner = z.infer<typeof PartnerBaseSchema>;
export type PartnerCreate = z.infer<typeof PartnerCreateSchema>;
export type PartnerUpdate = z.infer<typeof PartnerUpdateSchema>;
