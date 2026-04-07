import { useState } from 'react';
import { CreditCard, Plus, Search, CalendarRange, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { MonthlyPlanCreator, PaymentSchedule } from '@/components/payment/MonthlyPlan';
import { useMonthlyPlans } from '@/hooks/useMonthlyPlans';
import type { PlanStatus } from '@/data/mockMonthlyPlans';

/**
 * Payment Page
 * @crossref:route[/payment]
 * @crossref:used-in[App]
 */

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

const STATUS_FILTERS: readonly { readonly value: PlanStatus | 'all'; readonly label: string }[] = [
  { value: 'all', label: 'All Plans' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'defaulted', label: 'Defaulted' },
];

export function Payment() {
  const [showCreator, setShowCreator] = useState(false);
  const {
    plans,
    selectedPlan,
    selectedPlanId,
    setSelectedPlanId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    summary,
    createPlan,
    markInstallmentPaid,
  } = useMonthlyPlans();

  const handleCreatePlan = (input: Parameters<typeof createPlan>[0]) => {
    createPlan(input);
    setShowCreator(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Plans</h1>
            <p className="text-sm text-gray-500">Monthly installment plans for outstanding balances</p>
          </div>
        </div>
        {!showCreator && (
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CalendarRange className="w-4 h-4" />
            <span className="text-xs font-medium">Active Plans</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.activePlans}</p>
          <p className="text-xs text-gray-400 mt-0.5">{summary.totalPlans} total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatVND(summary.totalOutstanding)}</p>
          <p className="text-xs text-gray-400 mt-0.5">remaining balance</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{summary.overdueCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">installments</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-dental-green">{summary.completedPlans}</p>
          <p className="text-xs text-gray-400 mt-0.5">plans finished</p>
        </div>
      </div>

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
            placeholder="Search plans..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === filter.value
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
          {plans.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-8 text-center">
              <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No plans found</p>
            </div>
          ) : (
            plans.map((plan) => {
              const paidCount = plan.installments.filter((i) => i.status === 'paid').length;
              const hasOverdue = plan.installments.some((i) => i.status === 'overdue');
              return (
                <button
                  key={plan.id}
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
                    <span className="text-xs text-gray-400">{paidCount}/{plan.numberOfInstallments} paid</span>
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
          {selectedPlan ? (
            <PaymentSchedule plan={selectedPlan} onMarkPaid={markInstallmentPaid} />
          ) : (
            <div className="bg-white rounded-xl shadow-card p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">Select a plan to view details</p>
              <p className="text-xs text-gray-400 mt-1">Click on any plan from the list</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
