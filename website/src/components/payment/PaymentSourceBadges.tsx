import { formatVND } from '@/lib/formatting';

interface PaymentSourceBadgesProps {
  readonly method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed' | string;
  readonly cashAmount?: number;
  readonly bankAmount?: number;
  readonly depositUsed?: number;
}

const METHOD_STYLES: Record<string, string> = {
  cash: 'text-green-700 bg-green-100 border border-green-200',
  bank_transfer: 'text-blue-700 bg-blue-100 border border-blue-200',
  deposit: 'text-purple-700 bg-purple-100 border border-purple-200',
  mixed: 'text-gray-700 bg-gray-100 border border-gray-200',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank',
  deposit: 'Deposit',
  mixed: 'Mixed',
};

export function PaymentSourceBadges({
  method,
  cashAmount = 0,
  bankAmount = 0,
  depositUsed = 0,
}: PaymentSourceBadgesProps) {
  const activeSources = [
    { key: 'deposit', amount: depositUsed, label: 'Deposit', style: METHOD_STYLES.deposit },
    { key: 'cash', amount: cashAmount, label: 'Cash', style: METHOD_STYLES.cash },
    { key: 'bank', amount: bankAmount, label: 'Bank', style: METHOD_STYLES.bank_transfer },
  ].filter((s) => s.amount > 0);

  const hasMultiple = activeSources.length > 1;

  if (!hasMultiple) {
    const label = METHOD_LABELS[method] || method || 'Other';
    const style = METHOD_STYLES[method] || METHOD_STYLES.mixed;
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${style}`}>
        {label}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {activeSources.map((s) => (
        <span
          key={s.key}
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${s.style}`}
        >
          {s.label} {formatVND(s.amount)}
        </span>
      ))}
    </div>
  );
}
