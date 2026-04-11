import { Calendar, CheckCircle2, Clock, AlertTriangle, Circle, Receipt } from 'lucide-react';
import type { MonthlyPlan, InstallmentStatus } from '@/types/monthlyPlans';
import { InstallmentTracker } from './InstallmentTracker';

/**
 * PaymentSchedule - Timeline of installments for a monthly plan
 * @crossref:used-in[Payment, CustomerProfile]
 */

interface PaymentScheduleProps {
  readonly plan: MonthlyPlan;
  readonly onMarkPaid?: (planId: string, installmentId: string) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

const STATUS_CONFIG: Record<InstallmentStatus, {
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly Icon: typeof CheckCircle2;
}> = {
  paid: { label: 'Paid', color: 'text-dental-green', bgColor: 'bg-dental-green/10', Icon: CheckCircle2 },
  upcoming: { label: 'Upcoming', color: 'text-primary', bgColor: 'bg-primary/10', Icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-500', bgColor: 'bg-red-50', Icon: AlertTriangle },
  pending: { label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-50', Icon: Circle },
};

const PLAN_STATUS_STYLE: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  completed: 'bg-dental-green/10 text-dental-green',
  defaulted: 'bg-red-50 text-red-500',
  draft: 'bg-gray-100 text-gray-500',
};

export function PaymentSchedule({ plan, onMarkPaid }: PaymentScheduleProps) {
  const paidCount = plan.installments.filter((i) => i.status === 'paid').length;
  const progressPercent = plan.numberOfInstallments > 0
    ? Math.round((paidCount / plan.numberOfInstallments) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-card">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{plan.customerName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{plan.treatmentDescription}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PLAN_STATUS_STYLE[plan.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {plan.status}
          </span>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-400 block text-xs">Total</span>
            <span className="font-medium text-gray-900">{formatVND(plan.totalAmount)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs">Down Payment</span>
            <span className="font-medium text-gray-900">{formatVND(plan.downPayment)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs">Per Installment</span>
            <span className="font-medium text-gray-900">{formatVND(plan.installmentAmount)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-700">{paidCount}/{plan.numberOfInstallments} paid ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-dental-green rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Linked Invoices */}
      {plan.items && plan.items.length > 0 && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/40">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-medium text-gray-700">Linked Invoices</h4>
          </div>
          <div className="space-y-2">
            {plan.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm bg-white rounded-lg border border-gray-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{item.invoiceName || item.invoiceId.slice(0, 8)}</span>
                  <span className="text-xs text-gray-400">Total {formatVND(item.invoiceTotal || 0)}</span>
                </div>
                <span className={`text-xs font-medium ${(item.invoiceResidual || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {(item.invoiceResidual || 0) > 0 ? `Owing ${formatVND(item.invoiceResidual || 0)}` : 'Paid'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-700">Installment Schedule</h4>
        </div>

        <div className="space-y-1">
          {plan.installments.map((installment) => (
            <InstallmentTracker
              key={installment.id}
              installment={installment}
              statusConfig={STATUS_CONFIG}
              formatAmount={formatVND}
              onMarkPaid={
                onMarkPaid && (installment.status === 'upcoming' || installment.status === 'overdue')
                  ? () => onMarkPaid(plan.id, installment.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
