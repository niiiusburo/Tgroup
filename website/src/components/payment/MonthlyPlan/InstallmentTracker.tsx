import { CheckCircle2 } from 'lucide-react';
import type { Installment, InstallmentStatus } from '@/types/monthlyPlans';

/**
 * InstallmentTracker - Payment status display per installment
 * @crossref:used-in[PaymentSchedule]
 */

interface StatusConfig {
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly Icon: typeof CheckCircle2;
}

interface InstallmentTrackerProps {
  readonly installment: Installment;
  readonly statusConfig: Record<InstallmentStatus, StatusConfig>;
  readonly formatAmount: (amount: number) => string;
  readonly onMarkPaid?: () => void;
}

export function InstallmentTracker({
  installment,
  statusConfig,
  formatAmount,
  onMarkPaid,
}: InstallmentTrackerProps) {
  const config = statusConfig[installment.status];
  const { Icon } = config;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${config.bgColor}`}>
      {/* Status icon */}
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />

      {/* Installment info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            #{installment.installmentNumber}
          </span>
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Due: {installment.dueDate}
          {installment.paidDate && (
            <span className="ml-2">· Paid: {installment.paidDate}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">
          {formatAmount(installment.amount)}
        </span>
      </div>

      {/* Mark paid button */}
      {onMarkPaid && (
        <button
          onClick={onMarkPaid}
          className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-dental-green bg-dental-green/10 rounded-md hover:bg-dental-green/20 transition-colors"
        >
          Mark Paid
        </button>
      )}
    </div>
  );
}
