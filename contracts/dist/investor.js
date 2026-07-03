"use strict";
// contracts/investor.ts
// Investor portal Zod schemas — safe projection allow-list is the redaction boundary.
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestorPasswordResetConfirmSchema = exports.InvestorPasswordResetRequestSchema = exports.InvestorAdminListItemSchema = exports.InvestorAdminUpdateSchema = exports.InvestorAdminCreateSchema = exports.InvestorVisibilityListResponseSchema = exports.InvestorVisibilityStateSchema = exports.InvestorVisibilityPatchSchema = exports.InvestorClientsListResponseSchema = exports.InvestorLoginRequestSchema = exports.InvestorAuthResponseSchema = exports.InvestorClientResponseSchema = exports.InvestorClientSchema = exports.InvestorAccountSchema = exports.InvestorLobSchema = void 0;
const zod_1 = require("zod");
exports.InvestorLobSchema = zod_1.z.enum(["dental", "cosmetic"]);
exports.InvestorAccountSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    investor_name: zod_1.z.string().nullable().optional(),
    lob: exports.InvestorLobSchema,
    is_active: zod_1.z.boolean(),
    created_at: zod_1.z.coerce.date().optional(),
});
exports.InvestorClientSchema = zod_1.z.object({
    investor_id: zod_1.z.string().uuid(),
    partner_id: zod_1.z.string().uuid(),
    lob: exports.InvestorLobSchema,
    is_visible: zod_1.z.boolean(),
    marked_by_partner_id: zod_1.z.string().uuid(),
    marked_at: zod_1.z.coerce.date(),
});
/** Safe projection — only these keys may leave /api/investor/clients* */
exports.InvestorClientResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    gender: zod_1.z.string().nullable().optional(),
    birth_year: zod_1.z.coerce.number().int().nullable().optional(),
    appointment_count: zod_1.z.coerce.number().int().nonnegative(),
    order_count: zod_1.z.coerce.number().int().nonnegative(),
    deposit_balance: zod_1.z.coerce.number().nonnegative(),
    outstanding_balance: zod_1.z.coerce.number().nonnegative(),
    status: zod_1.z.enum(["active", "inactive"]),
});
exports.InvestorAuthResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    token: zod_1.z.string(),
    investor: exports.InvestorAccountSchema.pick({
        id: true,
        email: true,
        investor_name: true,
        lob: true,
    }),
    permissions: zod_1.z.array(zod_1.z.string()).default(["investor.read"]),
});
exports.InvestorLoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.InvestorClientsListResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    offset: zod_1.z.number().int().nonnegative(),
    limit: zod_1.z.number().int().positive(),
    totalItems: zod_1.z.number().int().nonnegative(),
    items: zod_1.z.array(exports.InvestorClientResponseSchema),
});
// ─── Phase 2: staff visibility ─────────────────────────────────────
exports.InvestorVisibilityPatchSchema = zod_1.z.object({
    investorId: zod_1.z.string().uuid(),
    isVisible: zod_1.z.boolean(),
});
exports.InvestorVisibilityStateSchema = zod_1.z.object({
    investorId: zod_1.z.string().uuid(),
    investorName: zod_1.z.string(),
    isVisible: zod_1.z.boolean(),
});
exports.InvestorVisibilityListResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    items: zod_1.z.array(exports.InvestorVisibilityStateSchema),
});
// ─── Phase 2: admin provisioning ───────────────────────────────────
exports.InvestorAdminCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    investorName: zod_1.z.string().min(1).max(200),
    lob: exports.InvestorLobSchema,
    password: zod_1.z.string().min(6).max(128).optional(),
});
exports.InvestorAdminUpdateSchema = zod_1.z.object({
    investorName: zod_1.z.string().min(1).max(200).optional(),
    isActive: zod_1.z.boolean().optional(),
}).refine((v) => v.investorName !== undefined || v.isActive !== undefined, {
    message: 'At least one field required',
});
exports.InvestorAdminListItemSchema = exports.InvestorAccountSchema.extend({
    client_count: zod_1.z.coerce.number().int().nonnegative().optional(),
});
// ─── Phase 2: password reset ─────────────────────────────────────────
exports.InvestorPasswordResetRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.InvestorPasswordResetConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(6),
    confirmPassword: zod_1.z.string().min(6),
}).refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
});
