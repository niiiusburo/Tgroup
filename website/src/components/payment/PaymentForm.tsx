/**
 * PaymentForm - Multi-source payment with invoice allocation ledger.
 * Supports applying one payment across multiple invoices.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, CreditCard, User, MapPin, FileText, Check, DollarSign,
  Banknote, Wallet, Building2, AlertCircle, Info, QrCode, CalendarDays,
  Receipt, ListChecks,
} from 'lucide-react';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { VietQrModal } from './VietQrModal';
import { ServicePaymentCard, type ServicePaymentContext } from './ServicePaymentCard';
import { useCustomers } from '@/hooks/useCustomers';
import { useLocations } from '@/hooks/useLocations';
import { useDeposits } from '@/hooks/useDeposits';
import { fetchSaleOrders, fetchDotKhams } from '@/lib/api';
import { LocationSelector } from '@/components/shared/LocationSelector';
import type { Customer } from '@/hooks/useCustomers';
import { formatVND, formatVNDInput } from '@/lib/formatting';
import { CurrencyInput } from '@/components/shared/CurrencyInput';

export interface PaymentSourceBreakdown {
  readonly depositAmount: number;
  readonly cashAmount: number;
  readonly bankAmount: number;
}

export interface PaymentAllocationInput {
  readonly invoiceId?: string;
  readonly dotkhamId?: string;
  readonly allocatedAmount: number;
}

type AllocationTab = 'invoices' | 'dotkhams';

export interface PaymentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly amount: number;
  readonly method: 'deposit' | 'cash' | 'bank_transfer' | 'mixed';
  readonly locationName: string;
  readonly notes: string;
  readonly paymentDate: string;
  readonly referenceCode?: string;
  readonly sources?: PaymentSourceBreakdown;
  readonly allocations?: PaymentAllocationInput[];
}

interface InvoiceOption {
  id: string;
  name: string;
  totalAmount: number;
  residual: number;
  totalPaid: number;
  date: string;
}

interface PaymentFormProps {
  readonly onSubmit: (data: PaymentFormData) => void;
  readonly onClose: () => void;
  readonly defaultCustomerName?: string;
  readonly defaultAmount?: number;
  readonly defaultCustomerId?: string;
  readonly depositBalance?: number;
  readonly outstandingBalance?: number;
  readonly defaultNotes?: string;
  readonly defaultPaymentDate?: string;
  readonly defaultReferenceCode?: string;
  readonly defaultDepositAmount?: number;
  readonly defaultCashAmount?: number;
  readonly defaultBankAmount?: number;
  readonly defaultAllocations?: PaymentAllocationInput[];
  readonly isEdit?: boolean;
  readonly serviceContext?: ServicePaymentContext;
}

export function PaymentForm({
  onSubmit,
  onClose,
  defaultCustomerName = '',
  defaultAmount,
  defaultCustomerId,
  depositBalance: externalDepositBalance,
  outstandingBalance: externalOutstandingBalance,
  defaultNotes = '',
  defaultPaymentDate,
  defaultReferenceCode = '',
  defaultDepositAmount = 0,
  defaultCashAmount = 0,
  defaultBankAmount = 0,
  defaultAllocations,
  isEdit = false,
  serviceContext,
}: PaymentFormProps) {
  const { customers: apiCustomers, loading: customersLoading } = useCustomers();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();
  const { loadDeposits, balance: depositBalanceData } = useDeposits();

  // ─── Form state ───────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(defaultCustomerId ?? null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [notes, setNotes] = useState(defaultNotes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Multi-source amounts
  const [depositAmount, setDepositAmount] = useState(defaultDepositAmount);
  const [cashAmount, setCashAmount] = useState(defaultCashAmount);
  const [bankAmount, setBankAmount] = useState(defaultBankAmount);
  const [showVietQr, setShowVietQr] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => defaultPaymentDate ?? new Date().toISOString().slice(0, 10));
  const [referenceCode, setReferenceCode] = useState(defaultReferenceCode);

  // Invoices & allocations
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [dotkhams, setDotkhams] = useState<{ id: string; name: string; totalAmount: number; residual: number; date: string }[]>([]);
  const [dotkhamsLoading, setDotkhamsLoading] = useState(false);
  const [allocationTab, setAllocationTab] = useState<AllocationTab>('invoices');
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  const [targetAllocationMap, setTargetAllocationMap] = useState<Record<string, number>>({});
  const [allocationTypes, setAllocationTypes] = useState<Record<string, AllocationTab>>({});
  const [allocateMode, setAllocateMode] = useState<'auto' | 'manual'>('manual');

  // Initialize existing allocations when editing
  useEffect(() => {
    if (isEdit && defaultAllocations && defaultAllocations.length > 0) {
      const ids = new Set<string>();
      const map: Record<string, number> = {};
      const types: Record<string, AllocationTab> = {};
      for (const a of defaultAllocations) {
        const id = a.invoiceId || a.dotkhamId;
        if (id) {
          ids.add(id);
          map[id] = a.allocatedAmount;
          types[id] = a.invoiceId ? 'invoices' : 'dotkhams';
        }
      }
      setSelectedTargetIds(ids);
      setTargetAllocationMap(map);
      setAllocationTypes(types);
    }
  }, [isEdit, defaultAllocations]);

  // ─── Derived data ─────────────────────────────────────────────
  const customers: Customer[] = apiCustomers.map(c => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    locationId: c.locationId, status: c.status, lastVisit: c.lastVisit,
  }));

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedLocation = apiLocations.find(l => l.id === locationId);

  const totalPayment = depositAmount + cashAmount + bankAmount;

  const availableDeposit = externalDepositBalance ?? depositBalanceData.depositBalance;
  const outstandingBalance = externalOutstandingBalance ?? depositBalanceData.outstandingBalance;

  // Load deposit balance when customer changes
  useEffect(() => {
    if (customerId && externalDepositBalance === undefined) {
      loadDeposits(customerId);
    }
  }, [customerId, externalDepositBalance, loadDeposits]);

  // Fetch customer invoices when customer changes
  useEffect(() => {
    if (!customerId) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    async function loadInvoices() {
      setInvoicesLoading(true);
      try {
        const res = await fetchSaleOrders({ partnerId: customerId || undefined, limit: 100 });
        if (cancelled) return;
        const mapped = res.items.map((so) => ({
          id: so.id,
          name: so.name || 'Unknown',
          totalAmount: parseFloat(so.amounttotal ?? '0'),
          residual: parseFloat(so.residual ?? '0'),
          totalPaid: parseFloat(so.totalpaid ?? '0'),
          date: so.datecreated ?? '',
        }));
        setInvoices(mapped);
      } catch (e) {
        console.error('Failed to load invoices', e);
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    }
    loadInvoices();
    return () => { cancelled = true; };
  }, [customerId]);

  // Fetch customer dotkhams when customer changes
  useEffect(() => {
    if (!customerId) {
      setDotkhams([]);
      return;
    }
    let cancelled = false;
    async function loadDotKhams() {
      setDotkhamsLoading(true);
      try {
        const res = await fetchDotKhams({ partnerId: customerId || undefined, limit: 100 });
        if (cancelled) return;
        setDotkhams(res.items.map((dk) => ({
          id: dk.id,
          name: dk.name || 'Unknown',
          totalAmount: parseFloat(dk.totalamount ?? '0'),
          residual: parseFloat(dk.amountresidual ?? '0'),
          date: dk.date ?? '',
        })));
      } catch (e) {
        console.error('Failed to load dotkhams', e);
      } finally {
        if (!cancelled) setDotkhamsLoading(false);
      }
    }
    loadDotKhams();
    return () => { cancelled = true; };
  }, [customerId]);

  // Auto-allocate when mode or total payment changes
  useEffect(() => {
    if (allocateMode === 'auto' && selectedTargetIds.size > 0 && totalPayment > 0) {
      const activeTargets = allocationTab === 'invoices' ? invoices : dotkhams;
      const selected = activeTargets
        .filter((t) => selectedTargetIds.has(t.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let remaining = totalPayment;
      const next: Record<string, number> = {};
      for (const t of selected) {
        if (remaining <= 0) break;
        const alloc = Math.min(remaining, t.residual > 0 ? t.residual : t.totalAmount);
        next[t.id] = alloc;
        remaining -= alloc;
      }
      setTargetAllocationMap(next);
    }
  }, [allocateMode, selectedTargetIds, totalPayment, invoices, dotkhams, allocationTab]);

  // Auto-select allocation when serviceContext is provided and invoices are loaded
  useEffect(() => {
    if (!serviceContext) return;
    const targetId = serviceContext.recordId;
    const targetList = serviceContext.recordType === 'saleorder' ? invoices : dotkhams;
    const target = targetList.find((t) => t.id === targetId);
    if (!target) return;
    // Only auto-select once (when invoices first load)
    if (!selectedTargetIds.has(targetId)) {
      setSelectedTargetIds(new Set([targetId]));
      setTargetAllocationMap({ [targetId]: serviceContext.residual > 0 ? serviceContext.residual : target.residual });
      setAllocationTypes({ [targetId]: serviceContext.recordType === 'saleorder' ? 'invoices' : 'dotkhams' });
    }
  }, [serviceContext, invoices, dotkhams, selectedTargetIds]);

  // Auto-fill payment amount from serviceContext when first loaded
  useEffect(() => {
    if (!serviceContext || serviceContext.residual <= 0) return;
    // Only auto-fill if all sources are still at initial values
    if (depositAmount === 0 && cashAmount === 0 && bankAmount === 0) {
      setCashAmount(serviceContext.residual);
    }
  }, [serviceContext]);

  // ─── Quick amount helpers ─────────────────────────────────────
  const QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

  const applyQuickAmount = useCallback((amount: number) => {
    setCashAmount(amount);
    setDepositAmount(0);
    setBankAmount(0);
  }, []);

  const useMaxDeposit = useCallback(() => {
    const maxUsable = Math.min(availableDeposit, outstandingBalance || Infinity);
    setDepositAmount(maxUsable);
  }, [availableDeposit, outstandingBalance]);

  // ─── Allocation helpers ───────────────────────────────────────
  const currentTabTargets = useMemo(() => {
    return allocationTab === 'invoices' ? invoices : dotkhams;
  }, [allocationTab, invoices, dotkhams]);

  const toggleTarget = useCallback((id: string) => {
    setSelectedTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setTargetAllocationMap((m) => {
          const mm = { ...m };
          delete mm[id];
          return mm;
        });
        setAllocationTypes((m) => {
          const mm = { ...m };
          delete mm[id];
          return mm;
        });
      } else {
        next.add(id);
        setAllocationTypes((m) => ({ ...m, [id]: allocationTab }));
        const t = currentTabTargets.find((i) => i.id === id);
        if (t) {
          setTargetAllocationMap((m) => ({ ...m, [id]: t.residual > 0 ? t.residual : 0 }));
        }
      }
      return next;
    });
  }, [currentTabTargets, allocationTab]);

  const setAllocation = useCallback((id: string, value: number) => {
    setTargetAllocationMap((m) => ({ ...m, [id]: Math.max(0, value) }));
  }, []);

  const allocatedTotal = useMemo(() => {
    return Object.values(targetAllocationMap).reduce((sum, v) => sum + (v || 0), 0);
  }, [targetAllocationMap]);

  // ─── Validation ───────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer = 'Vui lòng chọn khách hàng';
    if (totalPayment <= 0) newErrors.amount = 'Tổng số tiền phải lớn hơn 0';
    if (depositAmount > availableDeposit) newErrors.deposit = `Số dư ví chỉ có ${formatVND(availableDeposit)}`;
    if (depositAmount < 0) newErrors.deposit = 'Số tiền không hợp lệ';
    if (cashAmount < 0) newErrors.cash = 'Số tiền không hợp lệ';
    if (bankAmount < 0) newErrors.bank = 'Số tiền không hợp lệ';
    if (selectedTargetIds.size > 0 && Math.abs(allocatedTotal - totalPayment) > 0.01) {
      newErrors.allocations = `Tổng phân bổ (${formatVND(allocatedTotal)}) phải bằng tổng thanh toán (${formatVND(totalPayment)})`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;
    if (!selectedCustomer || totalPayment <= 0) return;

    let method: PaymentFormData['method'] = 'cash';
    const sources = [depositAmount > 0, cashAmount > 0, bankAmount > 0].filter(Boolean);
    if (sources.length > 1) method = 'mixed';
    else if (depositAmount > 0) method = 'deposit';
    else if (bankAmount > 0) method = 'bank_transfer';
    else method = 'cash';

    const allocations: PaymentAllocationInput[] = [];
    if (selectedTargetIds.size > 0) {
      for (const id of selectedTargetIds) {
        const amt = targetAllocationMap[id] || 0;
        if (amt > 0) {
          const type = allocationTypes[id];
          if (type === 'invoices') allocations.push({ invoiceId: id, allocatedAmount: amt });
          else allocations.push({ dotkhamId: id, allocatedAmount: amt });
        }
      }
    }

    setIsSaving(true);
    try {
      await onSubmit({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        amount: totalPayment,
        method,
        locationName: selectedLocation?.name || '',
        notes: notes.trim(),
        paymentDate,
        referenceCode: referenceCode.trim() || undefined,
        sources: {
          depositAmount,
          cashAmount,
          bankAmount,
        },
        allocations: allocations.length > 0 ? allocations : undefined,
      });
    } catch (error) {
      console.error('Payment save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = customersLoading || locationsLoading || invoicesLoading || dotkhamsLoading;
  const isCustomerScoped = !!defaultCustomerId;

  return (
    <div className="modal-container">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-2xl">
        {/* ─── Header ─── */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{isEdit ? 'Chỉnh sửa thanh toán' : 'Ghi nhận thanh toán'}</h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {serviceContext
                    ? `${serviceContext.recordName} — ${defaultCustomerName || selectedCustomer?.name || ''}`
                    : isCustomerScoped
                      ? `Thanh toán cho ${defaultCustomerName || selectedCustomer?.name || ''}`
                      : 'Tạo giao dịch thanh toán mới'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ─── Form Body ─── */}
        <form onSubmit={handleSubmit} className="modal-body px-6 py-6 space-y-5">
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

          {/* ─── Service Payment Context ─── */}
          {serviceContext && (
            <ServicePaymentCard ctx={serviceContext} />
          )}

          {/* ═══════════════════════════════════════════════════════
              MULTI-SOURCE PAYMENT SECTION
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
                <CurrencyInput
                  value={depositAmount || null}
                  onChange={(v) => setDepositAmount(Math.max(0, Math.min(availableDeposit, v ?? 0)))}
                  placeholder="0"
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
                <CurrencyInput
                  value={cashAmount || null}
                  onChange={(v) => setCashAmount(Math.max(0, v ?? 0))}
                  placeholder="0"
                />
              </div>

              {/* ─── Bank Transfer Source ─── */}
              <div className={`rounded-xl border-2 p-4 transition-all ${
                bankAmount > 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      bankAmount > 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Building2 className={`w-4 h-4 ${bankAmount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Chuyển khoản (Bank)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVietQr(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Tạo QR
                  </button>
                </div>
                <CurrencyInput
                  value={bankAmount || null}
                  onChange={(v) => setBankAmount(Math.max(0, v ?? 0))}
                  placeholder="0"
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
            </div>

            {/* ─── Quick amounts (applied to cash) ─── */}
            <div className="mt-3">
              <span className="text-xs text-gray-400 mr-2">Nhanh:</span>
              <div className="inline-flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button key={qa} type="button" onClick={() => applyQuickAmount(qa)}
                    className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all">
                    {formatVNDInput(qa)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              ALLOCATION SECTION
          ═══════════════════════════════════════════════════════ */}
          {customerId && (invoices.length > 0 || dotkhams.length > 0) && (
            <div className="border-t border-gray-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-gray-500" />
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Phân bổ thanh toán
                </label>
                <span className="text-xs text-gray-400">(tùy chọn)</span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAllocationTab('invoices')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    allocationTab === 'invoices' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Hóa đơn
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationTab('dotkhams')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    allocationTab === 'dotkhams' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Đợt khám
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAllocateMode('manual')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    allocateMode === 'manual' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tự chọn
                </button>
                <button
                  type="button"
                  onClick={() => setAllocateMode('auto')}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    allocateMode === 'auto' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tự động (cũ trước)
                </button>
              </div>

              {(allocationTab === 'invoices' ? invoicesLoading : dotkhamsLoading) && (
                <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                  Đang tải...
                </div>
              )}

              <div className="space-y-2">
                {(allocationTab === 'invoices' ? invoices : dotkhams).map((t) => {
                  const isSelected = selectedTargetIds.has(t.id);
                  const allocated = targetAllocationMap[t.id] || 0;
                  const isInvoice = allocationTab === 'invoices';
                  const totalPaid = isInvoice ? (t as InvoiceOption).totalPaid : 0;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-lg border p-3 transition-all ${
                        isSelected ? 'border-orange-300 bg-orange-50/40' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTarget(t.id)}
                          className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{t.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {t.date ? new Date(t.date).toLocaleDateString('vi-VN') : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>Tổng: {formatVND(t.totalAmount)}</span>
                            {isInvoice && <span>Đã trả: {formatVND(totalPaid)}</span>}
                            <span className={t.residual > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                              Còn nợ: {formatVND(t.residual)}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Phân bổ:</span>
                              <input
                                type="number"
                                value={allocated || ''}
                                onChange={(e) => setAllocation(t.id, Number(e.target.value))}
                                disabled={allocateMode === 'auto'}
                                className="w-32 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 disabled:bg-gray-100"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTargetIds.size > 0 && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Đã phân bổ: <span className="font-medium text-gray-900">{formatVND(allocatedTotal)}</span></span>
                  <span className={`font-medium ${
                    Math.abs(allocatedTotal - totalPayment) <= 0.01 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {Math.abs(allocatedTotal - totalPayment) <= 0.01
                      ? 'Khớp với tổng thanh toán'
                      : `Chênh lệch: ${formatVND(Math.abs(allocatedTotal - totalPayment))}`}
                  </span>
                </div>
              )}
              {errors.allocations && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.allocations}
                </div>
              )}
            </div>
          )}

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

          {/* ─── Ngày thanh toán ─── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5" />
              Ngày thanh toán
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* ─── Mã tham chiếu ─── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Mã tham chiếu / Ghi chú nhanh
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="VD: TGL3, CK MB..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
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

        <VietQrModal
          open={showVietQr}
          onClose={() => setShowVietQr(false)}
          defaultAmount={bankAmount > 0 ? bankAmount : defaultAmount}
          customerName={selectedCustomer?.name || defaultCustomerName}
          customerPhone={selectedCustomer?.phone || ''}
        />

        {/* ─── Footer ─── */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            Hủy bỏ
          </button>
          <button type="button" onClick={() => handleSubmit()}
            disabled={isLoading || isSaving || totalPayment <= 0 || (serviceContext !== undefined && serviceContext.residual <= 0)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" />
            Ghi nhận {totalPayment > 0 ? formatVND(totalPayment) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
