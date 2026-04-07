/**
 * Payment Form Component - Create new payments
 * @crossref:used-in[Payment, Services]
 * @crossref:uses[usePayment, mockPayment]
 */

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/data/mockPayment';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

export interface PaymentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly locationName: string;
  readonly notes: string;
}

interface PaymentFormProps {
  readonly onSubmit: (data: PaymentFormData) => void;
  readonly onClose: () => void;
  readonly defaultCustomerName?: string;
  readonly defaultServiceName?: string;
  readonly defaultAmount?: number;
}

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = (
  Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]
).map(([value, label]) => ({ value, label }));

export function PaymentForm({
  onSubmit,
  onClose,
  defaultCustomerName = '',
  defaultServiceName = '',
  defaultAmount = 0,
}: PaymentFormProps) {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceName, setServiceName] = useState(defaultServiceName);
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!customerName || !serviceName || parsedAmount <= 0) return;

    onSubmit({
      customerId: `cust-${Date.now()}`,
      customerName,
      customerPhone,
      serviceId: `svc-${Date.now()}`,
      serviceName,
      amount: parsedAmount,
      method,
      locationName,
      notes,
    });
  };

  const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">New Payment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyen Van A"
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0901-111-222"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service Name *</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Lam sach rang"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (VND) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1,500,000"
              required
              min={1}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {Number(amount) > 0 && (
              <p className="text-xs text-gray-400 mt-1">{formatVND(Number(amount))}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((qa) => (
                <button
                  key={qa}
                  type="button"
                  onClick={() => setAmount(String(qa))}
                  className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {formatVND(qa)}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setMethod(pm.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    method === pm.value
                      ? 'bg-primary text-white border-primary'
                      : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Chi nhanh Quan 1"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
