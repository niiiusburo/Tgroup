/**
 * Mock data for Monthly Payment Plans
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
  readonly createdAt: string;
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

function generateInstallments(
  planId: string,
  count: number,
  amount: number,
  startDate: string,
  paidCount: number,
  hasOverdue: boolean,
): readonly Installment[] {
  const start = new Date(startDate);
  return Array.from({ length: count }, (_, i) => {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i + 1);

    let status: InstallmentStatus = 'pending';
    let paidDate: string | null = null;
    let paidAmount: number | null = null;

    if (i < paidCount) {
      status = 'paid';
      const pd = new Date(dueDate);
      pd.setDate(pd.getDate() - Math.floor(Math.random() * 5));
      paidDate = pd.toISOString().split('T')[0];
      paidAmount = amount;
    } else if (i === paidCount && hasOverdue) {
      status = 'overdue';
    } else if (i === paidCount) {
      status = 'upcoming';
    }

    return {
      id: `${planId}-inst-${i + 1}`,
      planId,
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount,
      status,
      paidDate,
      paidAmount,
    };
  });
}

export const MOCK_MONTHLY_PLANS: readonly MonthlyPlan[] = [
  {
    id: 'plan-001',
    customerId: 'cust-1',
    customerName: 'Nguyen Van A',
    treatmentDescription: 'Implant - Full Arch Upper Jaw',
    totalAmount: 120000000,
    downPayment: 30000000,
    numberOfInstallments: 6,
    installmentAmount: 15000000,
    startDate: '2026-01-15',
    status: 'active',
    installments: generateInstallments('plan-001', 6, 15000000, '2026-01-15', 2, true),
    createdAt: '2026-01-15',
  },
  {
    id: 'plan-002',
    customerId: 'cust-2',
    customerName: 'Tran Thi B',
    treatmentDescription: 'Orthodontic Braces - 18 months',
    totalAmount: 45000000,
    downPayment: 9000000,
    numberOfInstallments: 12,
    installmentAmount: 3000000,
    startDate: '2025-10-01',
    status: 'active',
    installments: generateInstallments('plan-002', 12, 3000000, '2025-10-01', 5, false),
    createdAt: '2025-10-01',
  },
  {
    id: 'plan-003',
    customerId: 'cust-3',
    customerName: 'Le Van C',
    treatmentDescription: 'Porcelain Veneers - 10 units',
    totalAmount: 80000000,
    downPayment: 20000000,
    numberOfInstallments: 4,
    installmentAmount: 15000000,
    startDate: '2025-08-01',
    status: 'completed',
    installments: generateInstallments('plan-003', 4, 15000000, '2025-08-01', 4, false),
    createdAt: '2025-08-01',
  },
  {
    id: 'plan-004',
    customerId: 'cust-4',
    customerName: 'Pham Thi D',
    treatmentDescription: 'Root Canal + Crown - 3 teeth',
    totalAmount: 24000000,
    downPayment: 6000000,
    numberOfInstallments: 3,
    installmentAmount: 6000000,
    startDate: '2026-02-01',
    status: 'defaulted',
    installments: generateInstallments('plan-004', 3, 6000000, '2026-02-01', 0, true),
    createdAt: '2026-02-01',
  },
  {
    id: 'plan-005',
    customerId: 'cust-5',
    customerName: 'Hoang Van E',
    treatmentDescription: 'Dental Implant - Single Tooth',
    totalAmount: 25000000,
    downPayment: 5000000,
    numberOfInstallments: 4,
    installmentAmount: 5000000,
    startDate: '2026-03-10',
    status: 'active',
    installments: generateInstallments('plan-005', 4, 5000000, '2026-03-10', 1, false),
    createdAt: '2026-03-10',
  },
];
