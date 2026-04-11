/**
 * Hook for Monthly Payment Plans state management
 * Uses real backend API for data persistence
 * @crossref:used-in[Payment, Customers]
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { normalizeText } from '@/lib/utils';
import type { MonthlyPlan, PlanCreationInput, PlanStatus, Installment, InstallmentStatus } from '@/types/monthlyPlans';
import {
  fetchMonthlyPlans,
  createMonthlyPlan as apiCreatePlan,
  markInstallmentPaid as apiMarkPaid,
  type ApiMonthlyPlan,
  type ApiInstallment,
} from '@/lib/api';

// Export types for consumers
export type { MonthlyPlan, PlanCreationInput, PlanStatus, Installment, InstallmentStatus };

// Map API response to type
function mapApiPlan(api: ApiMonthlyPlan): MonthlyPlan {
  return {
    id: api.id,
    customerId: api.customer_id,
    customerName: api.customer_name || '',
    treatmentDescription: api.treatment_description || '',
    totalAmount: parseFloat(api.total_amount),
    downPayment: parseFloat(api.down_payment),
    numberOfInstallments: api.number_of_installments,
    installmentAmount: parseFloat(api.installment_amount),
    startDate: api.start_date,
    status: api.status,
    createdAt: api.created_at,
    notes: api.notes || '',
    installments: api.installments?.map(mapApiInstallment) || [],
    items: api.items?.map((i) => ({
      id: i.id,
      planId: i.planId,
      invoiceId: i.invoiceId,
      invoiceName: i.invoiceName,
      invoiceTotal: i.invoiceTotal,
      invoiceResidual: i.invoiceResidual,
      priority: i.priority,
    })) || [],
  };
}

function mapApiInstallment(api: ApiInstallment): Installment {
  return {
    id: api.id,
    planId: api.plan_id,
    installmentNumber: api.installment_number,
    dueDate: api.due_date,
    amount: parseFloat(api.amount),
    status: api.status,
    paidDate: api.paid_date,
    paidAmount: api.paid_amount ? parseFloat(api.paid_amount) : null,
  };
}

export function useMonthlyPlans(locationId?: string) {
  const [plans, setPlans] = useState<readonly MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalPlans: 0,
    activePlans: 0,
    completedPlans: 0,
    totalOutstanding: 0,
    overdueCount: 0,
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch plans from API
  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMonthlyPlans({
        companyId: locationId && locationId !== 'all' ? locationId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setPlans(response.items.map(mapApiPlan));
      setSummary(response.aggregates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
      // Keep existing plans on error
    } finally {
      setLoading(false);
    }
  }, [locationId, statusFilter, searchQuery]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);


  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      const query = normalizeText(searchQuery);
      const matchesSearch =
        query === '' ||
        normalizeText(plan.customerName).includes(query) ||
        normalizeText(plan.treatmentDescription).includes(query) ||
        normalizeText(plan.id).includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [plans, statusFilter, searchQuery]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const createPlan = useCallback(async (input: PlanCreationInput) => {
    try {
      const apiPlan = await apiCreatePlan({
        customer_id: input.customerId,
        treatment_description: input.treatmentDescription,
        total_amount: input.totalAmount,
        down_payment: input.downPayment,
        number_of_installments: input.numberOfInstallments,
        start_date: input.startDate,
      });
      const newPlan = mapApiPlan(apiPlan);
      setPlans((prev) => [newPlan, ...prev]);
      // Refresh summary
      loadPlans();
      return newPlan;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
      throw err;
    }
  }, [loadPlans]);

  const markInstallmentPaid = useCallback(async (planId: string, installmentId: string) => {
    try {
      await apiMarkPaid(planId, installmentId);
      // Refresh the plan to get updated installment statuses
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark installment as paid');
      throw err;
    }
  }, [loadPlans]);

  return {
    plans: filteredPlans,
    allPlans: plans,
    loading,
    error,
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
    refresh: loadPlans,
  } as const;
}
