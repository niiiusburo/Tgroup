/**
 * Monthly Payment Plan type definitions
 * @crossref:used-in[Payment, hooks]
 */

export type InstallmentStatus = 'paid' | 'upcoming' | 'overdue' | 'pending';
export type PlanStatus = 'active' | 'completed' | 'defaulted' | 'draft';

export interface Installment {
  readonly id: string;
  readonly planId: string;
  readonly installmentNumber: number;
  readonly dueDate: string;
  readonly amount: number;
  readonly status: InstallmentStatus;
  readonly paidDate: string | null;
  readonly paidAmount: number | null;
}

export interface PlanItem {
  readonly id: string;
  readonly planId: string;
  readonly invoiceId: string;
  readonly invoiceName?: string;
  readonly invoiceTotal?: number;
  readonly invoiceResidual?: number;
  readonly priority: number;
}

export interface MonthlyPlan {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly treatmentDescription: string;
  readonly totalAmount: number;
  readonly downPayment: number;
  readonly numberOfInstallments: number;
  readonly installmentAmount: number;
  readonly startDate: string;
  readonly status: PlanStatus;
  readonly installments: readonly Installment[];
  readonly items?: readonly PlanItem[];
  readonly createdAt: string;
  readonly notes?: string;
}

export interface PlanCreationInput {
  readonly customerId: string;
  readonly customerName: string;
  readonly treatmentDescription: string;
  readonly totalAmount: number;
  readonly downPayment: number;
  readonly numberOfInstallments: number;
  readonly startDate: string;
}
