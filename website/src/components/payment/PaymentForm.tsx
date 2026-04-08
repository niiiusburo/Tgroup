/**
 * Payment Form Component - Create new payments
 * @crossref:used-in[Payment, Services]
 * @crossref:uses[usePayment, mockPayment]
 * @crossref:matches[EditAppointmentModal styling]
 */

import { useState } from 'react';
import { X, CreditCard, User, Phone, Stethoscope, DollarSign, MapPin, FileText, Check, Banknote, CreditCard as CardIcon, Wallet, QrCode } from 'lucide-react';
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

  const getMethodIcon = (methodValue: PaymentMethod) => {
    switch (methodValue) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CardIcon className="w-4 h-4" />;
      case 'bank_transfer': return <Wallet className="w-4 h-4" />;
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'momo': return <QrCode className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="modal-container">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="modal-content animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">New Payment</h2>
                <p className="text-sm text-orange-100 mt-0.5">Record a new transaction</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="modal-body px-6 py-6 space-y-5">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyen Van A"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0901-111-222"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Service Name *
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Lam sach rang"
              required
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              Amount (VND) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1,500,000"
              required
              min={1}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
            {Number(amount) > 0 && (
              <p className="mt-2 text-sm font-medium text-orange-600">{formatVND(Number(amount))}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_AMOUNTS.map((qa) => (
                <button
                  key={qa}
                  type="button"
                  onClick={() => setAmount(String(qa))}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all"
                >
                  {formatVND(qa)}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setMethod(pm.value)}
                  className={`
                    flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-all duration-200
                    ${method === pm.value
                      ? 'bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-orange-500/20'
                      : 'text-gray-600 bg-white border-gray-200 hover:border-orange-300'
                    }
                  `}
                >
                  {getMethodIcon(pm.value)}
                  <span className="hidden sm:inline">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Chi nhanh Quan 1"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes..."
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
          >
            <Check className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
