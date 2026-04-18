import { z } from "zod";
export declare const AppointmentBaseSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    partnerid: z.ZodString;
    doctorid: z.ZodString;
    companyid: z.ZodString;
    productid: z.ZodString;
    time: z.ZodString;
    status: z.ZodEnum<["scheduled", "arrived", "completed", "cancelled"]>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    partnerid: string;
    doctorid: string;
    companyid: string;
    productid: string;
    time: string;
    status: "scheduled" | "arrived" | "completed" | "cancelled";
    id?: string | undefined;
    color?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    partnerid: string;
    doctorid: string;
    companyid: string;
    productid: string;
    time: string;
    status: "scheduled" | "arrived" | "completed" | "cancelled";
    id?: string | undefined;
    color?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const AppointmentCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    partnerid: z.ZodString;
    doctorid: z.ZodString;
    companyid: z.ZodString;
    productid: z.ZodString;
    time: z.ZodString;
    status: z.ZodEnum<["scheduled", "arrived", "completed", "cancelled"]>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "id">, "strip", z.ZodTypeAny, {
    partnerid: string;
    doctorid: string;
    companyid: string;
    productid: string;
    time: string;
    status: "scheduled" | "arrived" | "completed" | "cancelled";
    color?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    partnerid: string;
    doctorid: string;
    companyid: string;
    productid: string;
    time: string;
    status: "scheduled" | "arrived" | "completed" | "cancelled";
    color?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const AppointmentUpdateSchema: z.ZodObject<{
    id: z.ZodString;
    partnerid: z.ZodOptional<z.ZodString>;
    doctorid: z.ZodOptional<z.ZodString>;
    companyid: z.ZodOptional<z.ZodString>;
    productid: z.ZodOptional<z.ZodString>;
    time: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["scheduled", "arrived", "completed", "cancelled"]>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    partnerid?: string | undefined;
    doctorid?: string | undefined;
    companyid?: string | undefined;
    productid?: string | undefined;
    time?: string | undefined;
    status?: "scheduled" | "arrived" | "completed" | "cancelled" | undefined;
    color?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    id: string;
    partnerid?: string | undefined;
    doctorid?: string | undefined;
    companyid?: string | undefined;
    productid?: string | undefined;
    time?: string | undefined;
    status?: "scheduled" | "arrived" | "completed" | "cancelled" | undefined;
    color?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export type Appointment = z.infer<typeof AppointmentBaseSchema>;
export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
