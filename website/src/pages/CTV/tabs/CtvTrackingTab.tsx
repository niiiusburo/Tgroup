import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ClientTrackingCard } from '@/components/ctv/ClientTrackingCard';
import { EmptyState } from '@/components/ctv/EmptyState';
import { LoadingSkeleton } from '@/components/ctv/LoadingSkeleton';
import type { CtvClientJourney } from '@/lib/api/ctv';

interface Props {
  clients: CtvClientJourney[];
  loading: boolean;
  onReferClient: () => void;
}

type FilterType = 'all' | 'in_progress' | 'completed' | 'pending_payment';

export function CtvTrackingTab({ clients, loading, onReferClient }: Props) {
  const { t } = useTranslation('ctv');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filter === 'in_progress') {
      result = result.filter((c) => c.stage === 'visited' || c.stage === 'serviced');
    } else if (filter === 'completed') {
      result = result.filter((c) => c.stage === 'paid');
    } else if (filter === 'pending_payment') {
      result = result.filter((c) => c.stage === 'serviced');
    }
    return result;
  }, [clients, filter, search]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('actions.filterAll') },
    { key: 'in_progress', label: t('actions.filterInProgress') },
    { key: 'completed', label: t('actions.filterCompleted') },
    { key: 'pending_payment', label: t('actions.filterPendingPayment') },
  ];

  return (
    <>
      <div className="text-xl font-semibold tracking-tight mb-1">{t('tracking.pageTitle')}</div>
      <div className="text-sm text-gray-500 mb-4">{t('tracking.subtitle')}</div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('actions.search')}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl ring-1 ring-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f.key
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState onAction={onReferClient} />
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <ClientTrackingCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </>
  );
}
