/**
 * Bank settings type definitions
 */

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
