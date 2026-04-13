/**
 * Payment History Table - Shows all payment transactions
 * @crossref:used-in[Payment]
 * @crossref:uses[mockPayment]
 */

import { Receipt, FileText } from 'lucide-react';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  type PaymentRecord,
} from '@/data/mockPayment';
import { formatVND } from '@/lib/formatting';

interface PaymentHistoryProps {
  readonly payments: readonly PaymentRecord[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card p-8 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No payment records found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-mono text-gray-600">{payment.receiptNumber}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{payment.customerName}</p>
                    <p className="text-xs text-gray-400">{payment.customerPhone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{payment.recordName}</p>
                  <p className="text-xs text-gray-400">{payment.locationName}</p>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatVND(payment.amount)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {PAYMENT_METHOD_LABELS[payment.method]}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PAYMENT_STATUS_STYLES[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{payment.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
