/**
 * Deposit action callbacks for the customer profile
 * @crossref:used-in[Customers]
 */
import { useCallback } from 'react';

type MaybePromise<T> = T | Promise<T>;
type RefreshAction = () => MaybePromise<void>;

interface UseCustomerDepositActionsOptions {
  readonly addDeposit: (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer' | 'vietqr',
    date?: string,
    note?: string,
  ) => MaybePromise<void>;
  readonly addRefund: (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer',
    date?: string,
    note?: string,
  ) => MaybePromise<void>;
  readonly voidDeposit: (id: string) => MaybePromise<void>;
  readonly removeDeposit: (id: string) => MaybePromise<void>;
  readonly editDeposit: (
    id: string,
    data: Partial<{
      amount: number;
      method: 'cash' | 'bank_transfer';
      notes: string;
      paymentDate: string;
    }>,
  ) => MaybePromise<void>;
  readonly loadDeposits: (customerId: string) => MaybePromise<void>;
  readonly refetchProfile: RefreshAction;
  readonly selectedCustomerId: string | null;
}

export function useCustomerDepositActions({
  addDeposit,
  addRefund,
  voidDeposit,
  removeDeposit,
  editDeposit,
  loadDeposits,
  refetchProfile,
  selectedCustomerId,
}: UseCustomerDepositActionsOptions) {
  const handleAddDeposit = useCallback(
    async (
      customerId: string,
      amount: number,
      method: 'cash' | 'bank_transfer' | 'vietqr',
      date?: string,
      note?: string,
    ) => {
      await addDeposit(customerId, amount, method, date, note);
      await refetchProfile();
      if (selectedCustomerId) await loadDeposits(selectedCustomerId);
    },
    [addDeposit, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleAddRefund = useCallback(
    async (
      customerId: string,
      amount: number,
      method: 'cash' | 'bank_transfer',
      date?: string,
      note?: string,
    ) => {
      await addRefund(customerId, amount, method, date, note);
      await refetchProfile();
      if (selectedCustomerId) await loadDeposits(selectedCustomerId);
    },
    [addRefund, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleVoidDeposit = useCallback(
    async (id: string) => {
      await voidDeposit(id);
      await refetchProfile();
      if (selectedCustomerId) await loadDeposits(selectedCustomerId);
    },
    [voidDeposit, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleDeleteDeposit = useCallback(
    async (id: string) => {
      await removeDeposit(id);
      await refetchProfile();
      if (selectedCustomerId) await loadDeposits(selectedCustomerId);
    },
    [removeDeposit, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleEditDeposit = useCallback(
    async (
      id: string,
      data: Partial<{
        amount: number;
        method: 'cash' | 'bank_transfer';
        notes: string;
        paymentDate: string;
      }>,
    ) => {
      await editDeposit(id, data);
      await refetchProfile();
      if (selectedCustomerId) await loadDeposits(selectedCustomerId);
    },
    [editDeposit, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleRefreshDeposits = useCallback(() => {
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [selectedCustomerId, loadDeposits]);

  return {
    handleAddDeposit,
    handleAddRefund,
    handleVoidDeposit,
    handleDeleteDeposit,
    handleEditDeposit,
    handleRefreshDeposits,
  };
}
