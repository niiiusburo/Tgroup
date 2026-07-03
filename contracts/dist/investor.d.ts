import { z } from "zod";
export declare const InvestorLobSchema: z.ZodEnum<["dental", "cosmetic"]>;
export declare const InvestorAccountSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    investor_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lob: z.ZodEnum<["dental", "cosmetic"]>;
    is_active: z.ZodBoolean;
    created_at: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    lob: "dental" | "cosmetic";
    is_active: boolean;
    investor_name?: string | null | undefined;
    created_at?: Date | undefined;
}, {
    id: string;
    email: string;
    lob: "dental" | "cosmetic";
    is_active: boolean;
    investor_name?: string | null | undefined;
    created_at?: Date | undefined;
}>;
export declare const InvestorClientSchema: z.ZodObject<{
    investor_id: z.ZodString;
    partner_id: z.ZodString;
    lob: z.ZodEnum<["dental", "cosmetic"]>;
    is_visible: z.ZodBoolean;
    marked_by_partner_id: z.ZodString;
    marked_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    lob: "dental" | "cosmetic";
    investor_id: string;
    partner_id: string;
    is_visible: boolean;
    marked_by_partner_id: string;
    marked_at: Date;
}, {
    lob: "dental" | "cosmetic";
    investor_id: string;
    partner_id: string;
    is_visible: boolean;
    marked_by_partner_id: string;
    marked_at: Date;
}>;
/** Safe projection — only these keys may leave /api/investor/clients* */
export declare const InvestorClientResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    gender: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    birth_year: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    appointment_count: z.ZodNumber;
    order_count: z.ZodNumber;
    deposit_balance: z.ZodNumber;
    outstanding_balance: z.ZodNumber;
    status: z.ZodEnum<["active", "inactive"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "active" | "inactive";
    name: string;
    appointment_count: number;
    order_count: number;
    deposit_balance: number;
    outstanding_balance: number;
    gender?: string | null | undefined;
    birth_year?: number | null | undefined;
}, {
    id: string;
    status: "active" | "inactive";
    name: string;
    appointment_count: number;
    order_count: number;
    deposit_balance: number;
    outstanding_balance: number;
    gender?: string | null | undefined;
    birth_year?: number | null | undefined;
}>;
export declare const InvestorAuthResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    token: z.ZodString;
    investor: z.ZodObject<Pick<{
        id: z.ZodString;
        email: z.ZodString;
        investor_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lob: z.ZodEnum<["dental", "cosmetic"]>;
        is_active: z.ZodBoolean;
        created_at: z.ZodOptional<z.ZodDate>;
    }, "id" | "email" | "investor_name" | "lob">, "strip", z.ZodTypeAny, {
        id: string;
        email: string;
        lob: "dental" | "cosmetic";
        investor_name?: string | null | undefined;
    }, {
        id: string;
        email: string;
        lob: "dental" | "cosmetic";
        investor_name?: string | null | undefined;
    }>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    success: true;
    token: string;
    investor: {
        id: string;
        email: string;
        lob: "dental" | "cosmetic";
        investor_name?: string | null | undefined;
    };
    permissions: string[];
}, {
    success: true;
    token: string;
    investor: {
        id: string;
        email: string;
        lob: "dental" | "cosmetic";
        investor_name?: string | null | undefined;
    };
    permissions?: string[] | undefined;
}>;
export declare const InvestorLoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const InvestorClientsListResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    offset: z.ZodNumber;
    limit: z.ZodNumber;
    totalItems: z.ZodNumber;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        gender: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birth_year: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        appointment_count: z.ZodNumber;
        order_count: z.ZodNumber;
        deposit_balance: z.ZodNumber;
        outstanding_balance: z.ZodNumber;
        status: z.ZodEnum<["active", "inactive"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: "active" | "inactive";
        name: string;
        appointment_count: number;
        order_count: number;
        deposit_balance: number;
        outstanding_balance: number;
        gender?: string | null | undefined;
        birth_year?: number | null | undefined;
    }, {
        id: string;
        status: "active" | "inactive";
        name: string;
        appointment_count: number;
        order_count: number;
        deposit_balance: number;
        outstanding_balance: number;
        gender?: string | null | undefined;
        birth_year?: number | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    success: true;
    offset: number;
    limit: number;
    totalItems: number;
    items: {
        id: string;
        status: "active" | "inactive";
        name: string;
        appointment_count: number;
        order_count: number;
        deposit_balance: number;
        outstanding_balance: number;
        gender?: string | null | undefined;
        birth_year?: number | null | undefined;
    }[];
}, {
    success: true;
    offset: number;
    limit: number;
    totalItems: number;
    items: {
        id: string;
        status: "active" | "inactive";
        name: string;
        appointment_count: number;
        order_count: number;
        deposit_balance: number;
        outstanding_balance: number;
        gender?: string | null | undefined;
        birth_year?: number | null | undefined;
    }[];
}>;
export declare const InvestorVisibilityPatchSchema: z.ZodObject<{
    investorId: z.ZodString;
    isVisible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    investorId: string;
    isVisible: boolean;
}, {
    investorId: string;
    isVisible: boolean;
}>;
export declare const InvestorVisibilityStateSchema: z.ZodObject<{
    investorId: z.ZodString;
    investorName: z.ZodString;
    isVisible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    investorId: string;
    isVisible: boolean;
    investorName: string;
}, {
    investorId: string;
    isVisible: boolean;
    investorName: string;
}>;
export declare const InvestorVisibilityListResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    items: z.ZodArray<z.ZodObject<{
        investorId: z.ZodString;
        investorName: z.ZodString;
        isVisible: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        investorId: string;
        isVisible: boolean;
        investorName: string;
    }, {
        investorId: string;
        isVisible: boolean;
        investorName: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    success: true;
    items: {
        investorId: string;
        isVisible: boolean;
        investorName: string;
    }[];
}, {
    success: true;
    items: {
        investorId: string;
        isVisible: boolean;
        investorName: string;
    }[];
}>;
export declare const InvestorAdminCreateSchema: z.ZodObject<{
    email: z.ZodString;
    investorName: z.ZodString;
    lob: z.ZodEnum<["dental", "cosmetic"]>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    lob: "dental" | "cosmetic";
    investorName: string;
    password?: string | undefined;
}, {
    email: string;
    lob: "dental" | "cosmetic";
    investorName: string;
    password?: string | undefined;
}>;
export declare const InvestorAdminUpdateSchema: z.ZodEffects<z.ZodObject<{
    investorName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    investorName?: string | undefined;
    isActive?: boolean | undefined;
}, {
    investorName?: string | undefined;
    isActive?: boolean | undefined;
}>, {
    investorName?: string | undefined;
    isActive?: boolean | undefined;
}, {
    investorName?: string | undefined;
    isActive?: boolean | undefined;
}>;
export declare const InvestorAdminListItemSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    investor_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lob: z.ZodEnum<["dental", "cosmetic"]>;
    is_active: z.ZodBoolean;
    created_at: z.ZodOptional<z.ZodDate>;
} & {
    client_count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    lob: "dental" | "cosmetic";
    is_active: boolean;
    investor_name?: string | null | undefined;
    created_at?: Date | undefined;
    client_count?: number | undefined;
}, {
    id: string;
    email: string;
    lob: "dental" | "cosmetic";
    is_active: boolean;
    investor_name?: string | null | undefined;
    created_at?: Date | undefined;
    client_count?: number | undefined;
}>;
export declare const InvestorPasswordResetRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const InvestorPasswordResetConfirmSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    password: string;
    confirmPassword: string;
}, {
    token: string;
    password: string;
    confirmPassword: string;
}>, {
    token: string;
    password: string;
    confirmPassword: string;
}, {
    token: string;
    password: string;
    confirmPassword: string;
}>;
