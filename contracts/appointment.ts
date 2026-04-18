// contracts/appointment.ts
import { z } from "zod";

export const AppointmentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  partnerid: z.string().uuid(),
  doctorid: z.string().uuid(),
  companyid: z.string().uuid(),
  productid: z.string().uuid(),
  time: z.string().datetime(),
  status: z.enum(["scheduled", "arrived", "completed", "cancelled"]),
  color: z.string().max(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const AppointmentCreateSchema = AppointmentBaseSchema.omit({ id: true });
export const AppointmentUpdateSchema = AppointmentBaseSchema.partial().required({ id: true });

export type Appointment = z.infer<typeof AppointmentBaseSchema>;
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
