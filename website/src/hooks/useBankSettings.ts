/**
 * useBankSettings - Clinic bank account settings hook
 * @crossref:used-in[Settings, PaymentForm, DepositWallet]
 */

import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export interface BankSettings {
  bankBin: string;
  bankNumber: string;
  bankAccountName: string;
}

export interface UseBankSettingsResult {
  settings: BankSettings | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateSettings: (data: BankSettings) => Promise<void>;
}

export function useBankSettings(): UseBankSettingsResult {
  const [settings, setSettings] = useState<BankSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = localStorage.getItem('tgclinic_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/settings/bank`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`API GET /settings/bank failed (${res.status}): ${text}`);
      }

      const data = (await res.json()) as BankSettings;
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load bank settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (data: BankSettings) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('tgclinic_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/settings/bank`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        bankBin: data.bankBin,
        bankNumber: data.bankNumber,
        bankAccountName: data.bankAccountName,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`API PUT /settings/bank failed (${res.status}): ${text}`);
    }

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
