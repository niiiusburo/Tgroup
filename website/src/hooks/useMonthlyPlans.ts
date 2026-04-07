import { useState, useCallback, useMemo } from 'react';
import {
  MOCK_MONTHLY_PLANS,
  type MonthlyPlan,
  type PlanCreationInput,
  type PlanStatus,
} from '@/data/mockMonthlyPlans';

/**
 * Hook for Monthly Payment Plans state management
 * @crossref:used-in[Payment, Customers]
 */
export function useMonthlyPlans() {
  const [plans, setPlans] = useState<readonly MonthlyPlan[]>(MOCK_MONTHLY_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === '' ||
        plan.customerName.toLowerCase().includes(query) ||
        plan.treatmentDescription.toLowerCase().includes(query) ||
        plan.id.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [plans, statusFilter, searchQuery]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const summary = useMemo(() => {
    const active = plans.filter((p) => p.status === 'active');
    const totalOutstanding = active.reduce((sum, p) => {
      const paidInstallments = p.installments.filter((i) => i.status === 'paid').length;
      const remaining = p.totalAmount - p.downPayment - paidInstallments * p.installmentAmount;
      return sum + Math.max(0, remaining);
    }, 0);
    const overdueCount = plans.reduce(
      (count, p) => count + p.installments.filter((i) => i.status === 'overdue').length,
      0,
    );

    return {
      totalPlans: plans.length,
      activePlans: active.length,
      completedPlans: plans.filter((p) => p.status === 'completed').length,
      totalOutstanding,
      overdueCount,
    };
  }, [plans]);

  const createPlan = useCallback((input: PlanCreationInput) => {
    const installmentAmount = Math.round(
      (input.totalAmount - input.downPayment) / input.numberOfInstallments,
    );
    const start = new Date(input.startDate);
    const newPlan: MonthlyPlan = {
      id: `plan-${Date.now()}`,
      ...input,
      installmentAmount,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      installments: Array.from({ length: input.numberOfInstallments }, (_, i) => {
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        return {
          id: `plan-${Date.now()}-inst-${i + 1}`,
          planId: `plan-${Date.now()}`,
          installmentNumber: i + 1,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: installmentAmount,
          status: i === 0 ? 'upcoming' as const : 'pending' as const,
          paidDate: null,
          paidAmount: null,
        };
      }),
    };

    setPlans((prev) => [newPlan, ...prev]);
    return newPlan;
  }, []);

  const markInstallmentPaid = useCallback((planId: string, installmentId: string) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;

        const updatedInstallments = plan.installments.map((inst, idx, arr) => {
          if (inst.id !== installmentId) {
            if (inst.status === 'upcoming' || inst.status === 'pending') {
              const prevInst = arr[idx - 1];
              if (prevInst?.id === installmentId) {
                return { ...inst, status: 'upcoming' as const };
              }
            }
            return inst;
          }
          return {
            ...inst,
            status: 'paid' as const,
            paidDate: new Date().toISOString().split('T')[0],
            paidAmount: inst.amount,
          };
        });

        const allPaid = updatedInstallments.every((i) => i.status === 'paid');
        return {
          ...plan,
          installments: updatedInstallments,
          status: allPaid ? 'completed' as const : plan.status,
        };
      }),
    );
  }, []);

  return {
    plans: filteredPlans,
    allPlans: plans,
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
  } as const;
}
