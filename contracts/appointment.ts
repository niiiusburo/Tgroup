// contracts/appointment.ts
import { z } from "zod";

export const AppointmentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().min(1),
  time: z.string().optional().nullable(),
  partnerid: z.string().uuid().optional(),
  doctorid: z.string().uuid().optional().nullable(),
  companyid: z.string().uuid().optional(),
  note: z.string().optional().nullable(),
  timeexpected: z.coerce.number().int().min(1).max(480).optional().nullable(),
  color: z.string().optional().nullable(),
  state: z.enum(["draft", "scheduled", "confirmed", "arrived", "in Examination", "in-progress", "done", "cancelled"]).optional().nullable(),
  productid: z.string().uuid().optional().nullable(),
  assistantid: z.string().uuid().optional().nullable(),
  dentalaideid: z.string().uuid().optional().nullable(),
});

export const AppointmentCreateSchema = AppointmentBaseSchema.omit({ id: true });
export const AppointmentUpdateSchema = AppointmentBaseSchema.partial().omit({ id: true });

export type Appointment = z.infer<typeof AppointmentBaseSchema>;
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
