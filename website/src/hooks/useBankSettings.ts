/**
 * useBankSettings - Clinic bank account settings hook
 * @crossref:used-in[Settings, PaymentForm, DepositWallet]
 * @crossref:uses[apiFetch]
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api/core';
import type { BankSettings, UseBankSettingsResult } from '@/types/bankSettings';

export { type BankSettings, type UseBankSettingsResult } from '@/types/bankSettings';

export function useBankSettings(): UseBankSettingsResult {
  const [settings, setSettings] = useState<BankSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<BankSettings>('/settings/bank', { method: 'GET' });
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load bank settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (data: BankSettings) => {
    await apiFetch<BankSettings>('/settings/bank', {
      method: 'PUT',
      body: {
        bankBin: data.bankBin,
        bankNumber: data.bankNumber,
        bankAccountName: data.bankAccountName,
      },
    });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    settings,
    loading,
    error,
    refresh,
    updateSettings,
  };
}
