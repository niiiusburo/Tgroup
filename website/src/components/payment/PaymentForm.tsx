/**
 * PaymentForm - Multi-source payment: deposit + cash + bank in any combo, any amount.
 * Blueprint spec: cu-18 "Pay Against a Service — any combo, any amount. Partial payment OK."
 * @crossref:used-in[Payment, Services, CustomerProfile]
 * @crossref:uses[CustomerSelector, ServiceCatalogSelector, useCustomers, useProducts, useDeposits]
 * @crossref:matches[AddCustomerForm DESIGN STANDARD]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  FORM FAMILY — @crossref:related[]                                     ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  @crossref:related[AppointmentForm] — SISTER FORM                      ║
 * ║    • Header/footer/label/input styling MUST match                      ║
 * ║    • Shared selectors (CustomerSelector, LocationSelector, etc.)       ║
 * ║                                                                        ║
 * ║  @crossref:related[ServiceForm] — SISTER FORM                          ║
 * ║    • Same design standard, same shared components                      ║
 * ║                                                                        ║
 * ║  @crossref:related[EmployeeForm] — SISTER FORM                         ║
 * ║    • Same design standard                                              ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, CreditCard, User, Stethoscope, MapPin, FileText, Check, DollarSign,
  Banknote, Wallet, Building2, AlertCircle, Info,
} from 'lucide-react';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { useCustomers } from '@/hooks/useCustomers';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useDeposits } from '@/hooks/useDeposits';
import { LocationSelector } from '@/components/shared/LocationSelector';
import type { ServiceCatalogItem } from '@/types/service';
import type { Customer } from '@/hooks/useCustomers';
import type { Product } from '@/hooks/useProducts';
import type { AppointmentType } from '@/constants';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

// ─── Multi-source payment data ─────────────────────────────────

export interface PaymentSourceBreakdown {
  readonly depositAmount: number;
  readonly cashAmount: number;
  readonly bankAmount: number;
}

export interface PaymentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly amount: number;
  readonly method: 'deposit' | 'cash' | 'bank_transfer' | 'mixed';
  readonly locationName: string;
  readonly notes: string;
  /** Breakdown of payment across sources (for multi-source) */
  readonly sources?: PaymentSourceBreakdown;
}

interface PaymentFormProps {
  readonly onSubmit: (data: PaymentFormData) => void;
  readonly onClose: () => void;
  readonly defaultCustomerName?: string;
  readonly defaultServiceName?: string;
  readonly defaultAmount?: number;
  /** Pre-selected customer ID — skips customer selector */
  readonly defaultCustomerId?: string;
  /** Available deposit balance for pre-selected customer */
  readonly depositBalance?: number;
  /** Outstanding balance for pre-selected customer */
  readonly outstandingBalance?: number;
}

export function PaymentForm({
  onSubmit,
  onClose,
  defaultCustomerName = '',
  defaultServiceName = '',
  defaultCustomerId,
  depositBalance: externalDepositBalance,
  outstandingBalance: externalOutstandingBalance,
}: PaymentFormProps) {
  const { customers: apiCustomers, loading: customersLoading } = useCustomers();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();
  const { products, isLoading: productsLoading } = useProducts({ limit: 1000 });
  const { loadDeposits, balance: depositBalanceData } = useDeposits();

  // ─── Form state ───────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Multi-source amounts
  const [depositAmount, setDepositAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [bankAmount, setBankAmount] = useState(0);

  // ─── Derived data ─────────────────────────────────────────────
  const customers: Customer[] = apiCustomers.map(c => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    locationId: c.locationId, status: c.status, lastVisit: c.lastVisit,
  }));

  const serviceCatalog: ServiceCatalogItem[] = useMemo(() =>
    products.map((p: Product) => ({
      id: p.id, name: p.name,
      category: 'treatment' as AppointmentType,
      description: p.categoryName || 'Dental service',
      defaultPrice: p.listPrice,
      estimatedDuration: 30,
      totalVisits: 1,
    })),
    [products]
  );

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedService = serviceCatalog.find(s => s.id === serviceId);
  const selectedLocation = apiLocations.find(l => l.id === locationId);

  const totalPayment = depositAmount + cashAmount + bankAmount;

  // Deposit balance: use external if provided, otherwise from deposits hook
  const availableDeposit = externalDepositBalance ?? depositBalanceData.depositBalance;
  const outstandingBalance = externalOutstandingBalance ?? depositBalanceData.outstandingBalance;

  // Load deposit balance when customer changes (only if no external balance provided)
  useEffect(() => {
    if (customerId && externalDepositBalance === undefined) {
      loadDeposits(customerId);
    }
  }, [customerId, externalDepositBalance, loadDeposits]);

  // ─── Quick amount helpers ─────────────────────────────────────
  const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

  const applyQuickAmount = useCallback((amount: number) => {
    // Fill cash first, then bank
    setCashAmount(amount);
    setDepositAmount(0);
    setBankAmount(0);
  }, []);

  const useMaxDeposit = useCallback(() => {
    const maxUsable = Math.min(availableDeposit, outstandingBalance || Infinity);
    setDepositAmount(maxUsable);
  }, [availableDeposit, outstandingBalance]);

  // ─── Validation ───────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer = 'Vui lòng chọn khách hàng';
    if (totalPayment <= 0) newErrors.amount = 'Tổng số tiền phải lớn hơn 0';
    if (depositAmount > availableDeposit) newErrors.deposit = `Số dư ví chỉ có ${formatVND(availableDeposit)}`;
    if (depositAmount < 0) newErrors.deposit = 'Số tiền không hợp lệ';
    if (cashAmount < 0) newErrors.cash = 'Số tiền không hợp lệ';
    if (bankAmount < 0) newErrors.bank = 'Số tiền không hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────
  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;
    if (!selectedCustomer || totalPayment <= 0) return;

    // Determine primary method for backwards compat
    let method: PaymentFormData['method'] = 'cash';
    const sources = [depositAmount > 0, cashAmount > 0, bankAmount > 0].filter(Boolean);
    if (sources.length > 1) method = 'mixed';
    else if (depositAmount > 0) method = 'deposit';
    else if (bankAmount > 0) method = 'bank_transfer';
    else method = 'cash';

    onSubmit({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      serviceId: serviceId || `svc-${Date.now()}`,
      serviceName: selectedService?.name || defaultServiceName || '',
      amount: totalPayment,
      method,
      locationName: selectedLocation?.name || '',
      notes: notes.trim(),
      sources: {
        depositAmount,
        cashAmount,
        bankAmount,
      },
    });
  }

  const isLoading = customersLoading || locationsLoading || productsLoading;

  // ─── Determine if this is a customer-scoped form ──────────────
  const isCustomerScoped = !!defaultCustomerId;

  return (
    <div className="modal-container">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-content animate-in zoom-in-95 duration-200">
        {/* ─── Header ─── */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Ghi nhận thanh toán</h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isCustomerScoped ? `Thanh toán cho ${defaultCustomerName || selectedCustomer?.name || ''}` : 'Tạo giao dịch thanh toán mới'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ─── Form Body ─── */}
        <form onSubmit={handleSubmit} className="modal-body px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
              Đang tải...
            </div>
          )}

          {/* ─── Customer (hidden if scoped) ─── */}
          {!isCustomerScoped && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Khách hàng
              </label>
              <CustomerSelector customers={customers} selectedId={customerId} onChange={setCustomerId} />
              {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
            </div>
          )}

          {/* ─── Customer balance info ─── */}
          {customerId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <p className="text-xs text-emerald-600 mb-0.5">Số dư ví (Deposit)</p>
                <p className="text-lg font-bold text-emerald-700">{formatVND(availableDeposit)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <p className="text-xs text-red-600 mb-0.5">Còn nợ (Outstanding)</p>
                <p className="text-lg font-bold text-red-700">{formatVND(outstandingBalance)}</p>
              </div>
            </div>
          )}

          {/* ─── Dịch vụ ─── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Dịch vụ
            </label>
            <ServiceCatalogSelector catalog={serviceCatalog} selectedId={serviceId} onChange={setServiceId} placeholder="Chọn dịch vụ..." />
            {selectedService && (
              <p className="text-xs text-gray-400 mt-1">
                Giá tham khảo: <span className="font-medium text-gray-600">{formatVND(selectedService.defaultPrice)}</span>
              </p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════
              MULTI-SOURCE PAYMENT SECTION
              Blueprint: "Use Deposit ($) + Cash ($) + Bank Transfer ($)
              — any combo, any amount. Partial payment OK."
          ═══════════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nguồn thanh toán
              </label>
              <span className="flex items-center gap-1 text-xs text-blue-500">
                <Info className="w-3 h-3" />
                Kết hợp nhiều nguồn được
              </span>
            </div>

            <div className="space-y-3">
              {/* ─── Deposit Source ─── */}
              <div className={`rounded-xl border-2 p-4 transition-all ${
                depositAmount > 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      depositAmount > 0 ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <Wallet className={`w-4 h-4 ${depositAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Từ ví (Deposit)</span>
                      <span className="text-xs text-gray-400 ml-2">Sẵn: {formatVND(availableDeposit)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useMaxDeposit}
                    disabled={availableDeposit <= 0}
                    className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Dùng tất cả
                  </button>
                </div>
                <input
                  type="number"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  min={0}
                  max={availableDeposit}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm"
                />
                {errors.deposit && <p className="text-xs text-red-500 mt-1">{errors.deposit}</p>}
              </div>

              {/* ─── Cash Source ─── */}
              <div className={`rounded-xl border-2 p-4 transition-all ${
                cashAmount > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    cashAmount > 0 ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <Banknote className={`w-4 h-4 ${cashAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Tiền mặt (Cash)</span>
                </div>
                <input
                  type="number"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all text-sm"
                />
              </div>

              {/* ─── Bank Transfer Source ─── */}
              <div className={`rounded-xl border-2 p-4 transition-all ${
                bankAmount > 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    bankAmount > 0 ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Building2 className={`w-4 h-4 ${bankAmount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Chuyển khoản (Bank)</span>
                </div>
                <input
                  type="number"
                  value={bankAmount || ''}
                  onChange={(e) => setBankAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
                />
              </div>
            </div>

            {/* ─── Total Summary ─── */}
            <div className={`mt-4 rounded-xl p-4 border-2 ${
              totalPayment > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">Tổng thanh toán</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{formatVND(totalPayment)}</span>
              </div>
              {totalPayment > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                  {depositAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600">Từ ví</span>
                      <span className="font-medium">{formatVND(depositAmount)}</span>
                    </div>
                  )}
                  {cashAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600">Tiền mặt</span>
                      <span className="font-medium">{formatVND(cashAmount)}</span>
                    </div>
                  )}
                  {bankAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">Chuyển khoản</span>
                      <span className="font-medium">{formatVND(bankAmount)}</span>
                    </div>
                  )}
                </div>
              )}
              {errors.amount && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.amount}
                </div>
              )}
              {outstandingBalance > 0 && totalPayment > 0 && totalPayment < outstandingBalance && (
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <Info className="w-3 h-3" />
                  Thanh toán một phần — còn lại: {formatVND(outstandingBalance - totalPayment)}
                </div>
              )}
            </div>

            {/* ─── Quick amounts (applied to cash) ─── */}
            <div className="mt-3">
              <span className="text-xs text-gray-400 mr-2">Nhanh:</span>
              <div className="inline-flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button key={qa} type="button" onClick={() => applyQuickAmount(qa)}
                    className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all">
                    {formatVND(qa)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Chi nhánh ─── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Chi nhánh
            </label>
            <LocationSelector
              locations={apiLocations.map(l => ({ id: l.id, name: l.name, address: l.address || '', phone: l.phone || '', status: 'active' as const, doctorCount: 0, patientCount: 0, appointmentCount: 0 }))}
              selectedId={locationId} onChange={setLocationId} excludeAll
            />
          </div>

          {/* ─── Ghi chú ─── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Ghi chú
            </label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thanh toán..." rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </form>

        {/* ─── Footer ─── */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            Hủy bỏ
          </button>
          <button type="button" onClick={() => handleSubmit()}
            disabled={totalPayment <= 0}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" />
            Ghi nhận {totalPayment > 0 ? formatVND(totalPayment) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
