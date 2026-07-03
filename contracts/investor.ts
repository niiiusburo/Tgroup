// contracts/investor.ts
// Investor portal Zod schemas — safe projection allow-list is the redaction boundary.

import { z } from "zod";

export const InvestorLobSchema = z.enum(["dental", "cosmetic"]);

export const InvestorAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  investor_name: z.string().nullable().optional(),
  lob: InvestorLobSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date().optional(),
});

export const InvestorClientSchema = z.object({
  investor_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  lob: InvestorLobSchema,
  is_visible: z.boolean(),
  marked_by_partner_id: z.string().uuid(),
  marked_at: z.coerce.date(),
});

/** Safe projection — only these keys may leave /api/investor/clients* */
export const InvestorClientResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  gender: z.string().nullable().optional(),
  birth_year: z.coerce.number().int().nullable().optional(),
  appointment_count: z.coerce.number().int().nonnegative(),
  order_count: z.coerce.number().int().nonnegative(),
  deposit_balance: z.coerce.number().nonnegative(),
  outstanding_balance: z.coerce.number().nonnegative(),
  status: z.enum(["active", "inactive"]),
});

export const InvestorAuthResponseSchema = z.object({
  success: z.literal(true),
  token: z.string(),
  investor: InvestorAccountSchema.pick({
    id: true,
    email: true,
    investor_name: true,
    lob: true,
  }),
  permissions: z.array(z.string()).default(["investor.read"]),
});

export const InvestorLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const InvestorClientsListResponseSchema = z.object({
  success: z.literal(true),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  items: z.array(InvestorClientResponseSchema),
});

// ─── Phase 2: staff visibility ─────────────────────────────────────

export const InvestorVisibilityPatchSchema = z.object({
  investorId: z.string().uuid(),
  isVisible: z.boolean(),
});

export const InvestorVisibilityStateSchema = z.object({
  investorId: z.string().uuid(),
  investorName: z.string(),
  isVisible: z.boolean(),
});

export const InvestorVisibilityListResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(InvestorVisibilityStateSchema),
});

// ─── Phase 2: admin provisioning ───────────────────────────────────

export const InvestorAdminCreateSchema = z.object({
  email: z.string().email(),
  investorName: z.string().min(1).max(200),
  lob: InvestorLobSchema,
  password: z.string().min(6).max(128).optional(),
});

export const InvestorAdminUpdateSchema = z.object({
  investorName: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
}).refine((v) => v.investorName !== undefined || v.isActive !== undefined, {
  message: 'At least one field required',
});

export const InvestorAdminListItemSchema = InvestorAccountSchema.extend({
  client_count: z.coerce.number().int().nonnegative().optional(),
});

// ─── Phase 2: password reset ─────────────────────────────────────────

export const InvestorPasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const InvestorPasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((v) => v.password === v.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});