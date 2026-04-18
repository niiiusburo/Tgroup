import { z } from "zod";
export declare const PaymentBaseSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    customer_id: z.ZodString;
    service_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    amount: z.ZodNumber;
    method: z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay", "deposit", "mixed"]>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payment_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reference_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodNullable<z.ZodOptional<z.ZodEnum<["posted", "voided"]>>>;
    deposit_used: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    cash_amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    bank_amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    deposit_type: z.ZodNullable<z.ZodOptional<z.ZodEnum<["deposit", "refund", "usage"]>>>;
    receipt_number: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    allocations: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        invoice_id: z.ZodOptional<z.ZodString>;
        dotkham_id: z.ZodOptional<z.ZodString>;
        allocated_amount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    customer_id: string;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed";
    id?: string | undefined;
    status?: "posted" | "voided" | null | undefined;
    service_id?: string | null | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}, {
    customer_id: string;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed";
    id?: string | undefined;
    status?: "posted" | "voided" | null | undefined;
    service_id?: string | null | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}>;
export declare const PaymentCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    customer_id: z.ZodString;
    service_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    amount: z.ZodNumber;
    method: z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay", "deposit", "mixed"]>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payment_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reference_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodNullable<z.ZodOptional<z.ZodEnum<["posted", "voided"]>>>;
    deposit_used: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    cash_amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    bank_amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    deposit_type: z.ZodNullable<z.ZodOptional<z.ZodEnum<["deposit", "refund", "usage"]>>>;
    receipt_number: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    allocations: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        invoice_id: z.ZodOptional<z.ZodString>;
        dotkham_id: z.ZodOptional<z.ZodString>;
        allocated_amount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }>, "many">>>;
}, "id">, "strip", z.ZodTypeAny, {
    customer_id: string;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed";
    status?: "posted" | "voided" | null | undefined;
    service_id?: string | null | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}, {
    customer_id: string;
    amount: number;
    method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed";
    status?: "posted" | "voided" | null | undefined;
    service_id?: string | null | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}>;
export declare const PaymentUpdateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    customer_id: z.ZodOptional<z.ZodString>;
    service_id: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    amount: z.ZodOptional<z.ZodNumber>;
    method: z.ZodOptional<z.ZodEnum<["cash", "bank_transfer", "card", "momo", "vnpay", "zalopay", "deposit", "mixed"]>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    payment_date: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    reference_code: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEnum<["posted", "voided"]>>>>;
    deposit_used: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    cash_amount: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    bank_amount: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    deposit_type: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEnum<["deposit", "refund", "usage"]>>>>;
    receipt_number: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    allocations: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        invoice_id: z.ZodOptional<z.ZodString>;
        dotkham_id: z.ZodOptional<z.ZodString>;
        allocated_amount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }, {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }>, "many">>>>;
}, "id">, "strip", z.ZodTypeAny, {
    status?: "posted" | "voided" | null | undefined;
    customer_id?: string | undefined;
    service_id?: string | null | undefined;
    amount?: number | undefined;
    method?: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed" | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}, {
    status?: "posted" | "voided" | null | undefined;
    customer_id?: string | undefined;
    service_id?: string | null | undefined;
    amount?: number | undefined;
    method?: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" | "zalopay" | "deposit" | "mixed" | undefined;
    notes?: string | null | undefined;
    payment_date?: string | null | undefined;
    reference_code?: string | null | undefined;
    deposit_used?: number | null | undefined;
    cash_amount?: number | null | undefined;
    bank_amount?: number | null | undefined;
    deposit_type?: "deposit" | "refund" | "usage" | null | undefined;
    receipt_number?: string | null | undefined;
    allocations?: {
        invoice_id?: string | undefined;
        dotkham_id?: string | undefined;
        allocated_amount?: number | undefined;
    }[] | null | undefined;
}>;
export type Payment = z.infer<typeof PaymentBaseSchema>;
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;
export type PaymentUpdate = z.infer<typeof PaymentUpdateSchema>;
