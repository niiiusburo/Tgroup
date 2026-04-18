import { z } from "zod";
export declare const PaymentBaseSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    partnerid: z.ZodString;
    companyid: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay"]>;
    status: z.ZodEnum<["posted", "voided"]>;
    date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    partnerid: string;
    companyid: string;
    status: "posted" | "voided";
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay";
    id?: string | undefined;
    date?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    partnerid: string;
    companyid: string;
    status: "posted" | "voided";
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay";
    id?: string | undefined;
    date?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const PaymentCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    partnerid: z.ZodString;
    companyid: z.ZodString;
    amount: z.ZodNumber;
    method: z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay"]>;
    status: z.ZodEnum<["posted", "voided"]>;
    date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "id">, "strip", z.ZodTypeAny, {
    partnerid: string;
    companyid: string;
    status: "posted" | "voided";
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay";
    date?: string | null | undefined;
    notes?: string | null | undefined;
}, {
    partnerid: string;
    companyid: string;
    status: "posted" | "voided";
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay";
    date?: string | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const PaymentUpdateSchema: z.ZodObject<{
    id: z.ZodString;
    partnerid: z.ZodOptional<z.ZodString>;
    companyid: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["posted", "voided"]>>;
    date: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    amount: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    partnerid?: string | undefined;
    companyid?: string | undefined;
    status?: "posted" | "voided" | undefined;
    date?: string | null | undefined;
    notes?: string | null | undefined;
    amount?: number | undefined;
    method?: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | undefined;
}, {
    id: string;
    partnerid?: string | undefined;
    companyid?: string | undefined;
    status?: "posted" | "voided" | undefined;
    date?: string | null | undefined;
    notes?: string | null | undefined;
    amount?: number | undefined;
    method?: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | undefined;
}>;
export type Payment = z.infer<typeof PaymentBaseSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
export type PaymentUpdate = z.infer<typeof PaymentUpdateSchema>;
