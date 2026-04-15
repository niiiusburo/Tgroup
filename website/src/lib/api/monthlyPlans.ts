import { apiFetch } from './core';

// ─── Monthly Plans ────────────────────────────────────────────────

export interface ApiMonthlyPlanItem {
  id: string;
  planId: string;
  invoiceId: string;
  invoiceName?: string;
  invoiceTotal?: number;
  invoiceResidual?: number;
  priority: number;
}

export interface ApiMonthlyPlan {
  id: string;
  customer_id: string;
  customer_name: string;
  company_id: string;
  treatment_description: string;
  total_amount: string;
  down_payment: string;
  installment_amount: string;
  number_of_installments: number;
  start_date: string;
  status: 'active' | 'completed' | 'defaulted' | 'draft';
  notes: string;
  installments: ApiInstallment[];
  items?: ApiMonthlyPlanItem[];
  created_at: string;
  updated_at: string;
}

export interface ApiInstallment {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount: string;
  status: 'paid' | 'upcoming' | 'overdue' | 'pending';
  paid_date: string | null;
  paid_amount: string | null;
}

export interface MonthlyPlanSummary {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalOutstanding: number;
  overdueCount: number;
}

export interface MonthlyPlansResponse {
  items: ApiMonthlyPlan[];
  aggregates: MonthlyPlanSummary;
}

export function fetchMonthlyPlans(params?: {
  companyId?: string;
  status?: string;
  customerId?: string;
  search?: string;
}) {
  return apiFetch<MonthlyPlansResponse>('/MonthlyPlans', {
    params: {
      company_id: params?.companyId,
      status: params?.status,
      customer_id: params?.customerId,
      search: params?.search,
    },
  });
}

export function fetchMonthlyPlanById(id: string) {
  return apiFetch<ApiMonthlyPlan>(`/MonthlyPlans/${id}`);
}

export function createMonthlyPlan(data: {
  customer_id: string;
  company_id?: string;
  treatment_description: string;
  total_amount: number;
  down_payment?: number;
  number_of_installments: number;
  start_date: string;
  notes?: string;
  invoice_ids?: string[];
}) {
  return apiFetch<ApiMonthlyPlan>('/MonthlyPlans', { method: 'POST', body: data });
}

export function updateMonthlyPlan(id: string, data: Partial<{
  treatment_description: string;
  total_amount: number;
  down_payment: number;
  status: string;
  notes: string;
  invoice_ids?: string[];
}>) {
  return apiFetch<ApiMonthlyPlan>(`/MonthlyPlans/${id}`, { method: 'PUT', body: data });
}

export function deleteMonthlyPlan(id: string) {
  return apiFetch<void>(`/MonthlyPlans/${id}`, { method: 'DELETE' });
}

export function markInstallmentPaid(planId: string, installmentId: string, data?: {
  paid_amount?: number;
  paid_date?: string;
}) {
  return apiFetch<ApiInstallment>(`/MonthlyPlans/${planId}/installments/${installmentId}/pay`, {
    method: 'PUT',
    body: data,
  });
}

