// contracts/partner.ts
// Shared Zod schema for Partner / Customer / Employee
// Imported by both frontend (form validation) and backend (request validation)

import { z } from "zod";

const optionalNullableUuid = z.preprocess(
  (value) => value === "" ? null : value,
  z.string().uuid().optional().nullable(),
);

const optionalNullableDatePart = (schema: z.ZodNumber) => z.preprocess(
  (value) => value === "" || value === 0 || value === "0" ? null : value,
  schema.optional().nullable(),
);

export const PartnerBaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().max(50),
  email: z.string().email().optional().nullable(),
  companyid: optionalNullableUuid,
  gender: z.string().optional().nullable(),
  birthday: optionalNullableDatePart(z.coerce.number().int().min(1).max(31)),
  birthmonth: optionalNullableDatePart(z.coerce.number().int().min(1).max(12)),
  birthyear: optionalNullableDatePart(z.coerce.number().int()),
  street: z.string().optional().nullable(),
  cityname: z.string().optional().nullable(),
  districtname: z.string().optional().nullable(),
  wardname: z.string().optional().nullable(),
  medicalhistory: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  sourceid: optionalNullableUuid,
  referraluserid: optionalNullableUuid,
  weight: z.coerce.number().optional().nullable(),
  identitynumber: z.string().optional().nullable(),
  healthinsurancecardnumber: z.string().optional().nullable(),
  emergencyphone: z.string().optional().nullable(),
  jobtitle: z.string().optional().nullable(),
  taxcode: z.string().optional().nullable(),
  unitname: z.string().optional().nullable(),
  unitaddress: z.string().optional().nullable(),
  isbusinessinvoice: z.boolean().optional().nullable(),
  personalname: z.string().optional().nullable(),
  personalidentitycard: z.string().optional().nullable(),
  personaltaxcode: z.string().optional().nullable(),
  personaladdress: z.string().optional().nullable(),
  salestaffid: optionalNullableUuid,
  cskhid: optionalNullableUuid,
  customer: z.boolean().default(true),
  status: z.boolean().default(true),
  ref: z.string().optional().nullable(),
});

export const PartnerCreateSchema = PartnerBaseSchema.omit({ id: true });
export const PartnerUpdateSchema = PartnerBaseSchema.partial().omit({ id: true });

export type Partner = z.infer<typeof PartnerBaseSchema>;
export type PartnerCreate = z.infer<typeof PartnerCreateSchema>;
export type PartnerUpdate = z.infer<typeof PartnerUpdateSchema>;
