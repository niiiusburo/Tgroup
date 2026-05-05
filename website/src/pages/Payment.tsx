// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
/**
 * Payment Page - Deposit wallet, payment form, outstanding balances, and payment history
 * @crossref:route[/payment]
 * @crossref:used-in[App]
 * @crossref:uses[DepositWallet, OutstandingBalance, PaymentHistory, MonthlyPlanCreator, PaymentSchedule, usePayment, useMonthlyPlans, useLocationFilter]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, Plus, Search, Wallet, Receipt,
  CalendarRange, AlertCircle,
} from 'lucide-react';
import { MonthlyPlanCreator, PaymentSchedule } from '@/components/payment/MonthlyPlan';
import { DepositWallet } from '@/components/payment/DepositWallet';
import { OutstandingBalance } from '@/components/payment/OutstandingBalance';
import { PaymentHistory } from '@/components/payment/PaymentHistory';
import { usePayment } from '@/hooks/usePayment';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { useMonthlyPlans } from '@/hooks/useMonthlyPlans';
import { useLocationFilter } from '@/contexts/LocationContext';
import type { PlanStatus } from '@/data/mockMonthlyPlans';
import { formatVND } from '@/lib/formatting';
import { useAuth } from '@/contexts/AuthContext';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { ExportPreviewModal } from '@/components/shared/ExportPreviewModal';
import { useExport } from '@/hooks/useExport';

type ActiveTab = 'payments' | 'plans';

const PLAN_STATUS_FILTERS: readonly { readonly value: PlanStatus | 'all'; readonly label: string }[] = [
  { value: 'all', label: 'All Plans' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'defaulted', label: 'Defaulted' },
];

export function Payment() {
  const { t } = useTranslation('payment');
  const { hasPermission } = useAuth();
  const canExportPayments = hasPermission('payments.export');
  const { selectedLocationId } = useLocationFilter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('payments');
  const [showCreator, setShowCreator] = useState(false);

  // Payment hook
  const {
    payments,
    wallets,
    outstandingBalances,
    stats,
    statusFilter: paymentStatusFilter,
    setStatusFilter: setPaymentStatusFilter,
    searchTerm,
    setSearchTerm,
    topUpWallet,
    isLoading,
  } = usePayment(selectedLocationId);

  // Monthly plans hook
  const {
    plans,
    selectedPlan,
    selectedPlanId,
    setSelectedPlanId,
    statusFilter: planStatusFilter,
    setStatusFilter: setPlanStatusFilter,
    searchQuery,
    setSearchQuery,
    summary,
    loading: plansLoading,
    createPlan,
    markInstallmentPaid,
  } = useMonthlyPlans(selectedLocationId);

  const handleCreatePlan = (input: Parameters<typeof createPlan>[0]) => {
    createPlan(input);
    setShowCreator(false);
  };

  const handleTopUp = (customerId: string) => async (amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date?: string, note?: string) => {
    await topUpWallet({ customerId, amount, method, date, note });
  };

  const paymentExportFilters = {
    search: searchTerm,
    companyId: selectedLocationId !== 'all' ? selectedLocationId : 'all',
    dateFrom: '',
    dateTo: '',
    status: paymentStatusFilter === 'all' ? '' : paymentStatusFilter,
  };

  const {
    previewOpen: paymentPreviewOpen,
    previewData: paymentPreviewData,
    loading: paymentExportLoading,
    downloading: paymentExportDownloading,
    error: paymentExportError,
    openPreview: openPaymentPreview,
    closePreview: closePaymentPreview,
    handleDownload: handlePaymentDownload,
    handleDirectExport: handlePaymentDirectExport,
  } = useExport({ type: 'payments', filters: paymentExportFilters });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('payment:subtitle')}
        icon={<CreditCard className="w-6 h-6 text-primary" />}
        actions={
          <div className="flex gap-2">
            {activeTab === 'plans' && !showCreator && (
              <button
                type="button"
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100"
              >
                <Plus className="w-4 h-4" />
                {t('newPlan')}
              </button>
            )}
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-medium">{t('payment:totalRevenue')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : formatVND(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{isLoading ? '...' : stats.completedPayments} {t('payments')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">{t('payment:walletBalance')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : formatVND(stats.totalWalletBalance)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{isLoading ? '...' : stats.activeWallets} {t('activeWallets')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{t('payment:outstanding')}</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{isLoading ? '...' : formatVND(stats.totalOutstanding)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{isLoading ? '...' : outstandingBalances.length} {t('items')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CalendarRange className="w-4 h-4" />
            <span className="text-xs font-medium">{t('payment:activePlans')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{plansLoading ? '...' : summary.activePlans}</p>
          <p className="text-xs text-gray-400 mt-0.5">{plansLoading ? '...' : summary.overdueCount} {t('overdue')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'payments'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            {t('paymentsAndWallets')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'plans'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            {t('installmentPlans')}
          </span>
        </button>
      </div>

      {/* Payments & Wallets Tab */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Wallets + Outstanding */}
          <div className="space-y-6">
            {/* Deposit wallets */}
            {isLoading ? (
              <LoadingState title="Loading wallets..." />
            ) : wallets.map((wallet) => (
              <DepositWallet
                key={wallet.id}
                depositBalance={wallet.balance}
                outstandingBalance={0}
                onAddDeposit={async (amount, method, date, note) => { await handleTopUp(wallet.customerId)(amount, method, date, note); }}
              />
            ))}

            {/* Outstanding balances */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('payment:outstandingBalances')}</h3>
              <OutstandingBalance
                balances={outstandingBalances}
                loading={isLoading}
              />
            </div>
          </div>

          {/* Right column: Payment history */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'completed', 'pending', 'refunded'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPaymentStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      paymentStatusFilter === filter
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              {canExportPayments && (
                <ExportMenu
                  onExport={handlePaymentDirectExport}
                  onPreview={openPaymentPreview}
                  loading={paymentExportDownloading}
                />
              )}
            </div>

            <PaymentHistory payments={payments} loading={isLoading} />
          </div>
        </div>
      )}

      {/* Installment Plans Tab */}
      {canExportPayments && (
        <ExportPreviewModal
          isOpen={paymentPreviewOpen}
          onClose={closePaymentPreview}
          onDownload={handlePaymentDownload}
          preview={paymentPreviewData}
          loading={paymentExportLoading}
          error={paymentExportError}
        />
      )}

      {activeTab === 'plans' && (
        <>
          {/* Plan Creator */}
          {showCreator && (
            <MonthlyPlanCreator
              onCreatePlan={handleCreatePlan}
              onCancel={() => setShowCreator(false)}
            />
          )}

          {/* Filters & search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="flex gap-1">
              {PLAN_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setPlanStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    planStatusFilter === filter.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plans list + detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan list */}
            <div className="lg:col-span-1 space-y-2">
              {plansLoading ? (
                <LoadingState title="Loading payment plans..." />
              ) : plans.length === 0 ? (
                <div className="bg-white rounded-xl shadow-card p-8 text-center">
                  <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('payment:noPlans')}</p>
                </div>
              ) : (
                plans.map((plan) => {
                  const paidCount = plan.installments.filter((i) => i.status === 'paid').length;
                  const hasOverdue = plan.installments.some((i) => i.status === 'overdue');
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedPlanId === plan.id
                          ? 'bg-primary/5 border-2 border-primary shadow-card'
                          : 'bg-white border-2 border-transparent shadow-card hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{plan.customerName}</span>
                        {hasOverdue && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{plan.treatmentDescription}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{paidCount}/{plan.numberOfInstallments} {t('paid')}</span>
                        <span className="text-xs font-medium text-gray-700">{formatVND(plan.totalAmount)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div
                          className={`rounded-full h-1.5 transition-all ${hasOverdue ? 'bg-red-400' : 'bg-dental-green'}`}
                          style={{ width: `${plan.numberOfInstallments > 0 ? (paidCount / plan.numberOfInstallments) * 100 : 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Plan detail */}
            <div className="lg:col-span-2">
              {plansLoading ? (
                <LoadingState title="Loading plan details..." />
              ) : selectedPlan ? (
                <PaymentSchedule plan={selectedPlan} onMarkPaid={markInstallmentPaid} />
              ) : (
                <div className="bg-white rounded-xl shadow-card p-12 text-center">
                  <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">{t('payment:selectPlan')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('payment:clickPlan')}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}


    </div>
  );
}
