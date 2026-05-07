import { Loader2, Search, UserCheck } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { ApiPartner } from '@/lib/api';

interface CustomerCameraNoMatchRescueProps {
  readonly t: TFunction<'customers'>;
  readonly searchQuery: string;
  readonly searchResults: readonly ApiPartner[];
  readonly searchLoading: boolean;
  readonly selectedCustomer: ApiPartner | null;
  readonly registering: boolean;
  readonly registerProcessing: boolean;
  readonly registerError?: string;
  readonly onSearch: (query: string) => void;
  readonly onSelectCustomer: (customer: ApiPartner) => void;
  readonly onRegister: () => void;
  readonly onCancel: () => void;
}

export function CustomerCameraNoMatchRescue({
  t,
  searchQuery,
  searchResults,
  searchLoading,
  selectedCustomer,
  registering,
  registerProcessing,
  registerError,
  onSearch,
  onSelectCustomer,
  onRegister,
  onCancel,
}: CustomerCameraNoMatchRescueProps) {
  return (
    <div className="w-full space-y-2">
      <p className="text-[10px] text-gray-500 text-center">
        {t('face.searchToRegister', 'Search customer to register this face')}
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('face.searchPlaceholder', 'Name, phone, or code...')}
          className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {searchLoading && <p className="text-[10px] text-gray-400 text-center">{t('loading')}</p>}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {searchResults.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectCustomer(p)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-xl border transition-all ${
              selectedCustomer?.id === p.id
                ? 'bg-orange-50 border-orange-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}>
            <UserCheck className={`w-3.5 h-3.5 ${selectedCustomer?.id === p.id ? 'text-orange-500' : 'text-gray-400'}`} />
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400">{p.ref ?? ''} · {p.phone ?? ''}</span>
            </div>
          </button>
        ))}
      </div>
      {selectedCustomer && (
        <button
          type="button"
          onClick={onRegister}
          disabled={registering || registerProcessing}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all">
          {registering && <Loader2 className="w-3 h-3 animate-spin" />}
          {t('face.registerToCustomer', 'Register face to {name}', { name: selectedCustomer.name })}
        </button>
      )}
      {registerError && <p className="text-[10px] text-red-500 text-center">{registerError}</p>}
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-3 py-2 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
        {t('cancel')}
      </button>
    </div>
  );
}
