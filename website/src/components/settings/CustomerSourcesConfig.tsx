/**
 * Customer Sources Configuration — manage referral sources
 * @crossref:used-in[Settings, Customers, Reports]
 * @crossref:uses[useCustomerSources]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, X } from 'lucide-react';
import { useCustomerSources } from '@/hooks/useSettings';
import type { CustomerSource } from '@/types/settings';
import { CustomerSourceRow } from './CustomerSourceRow';

const TYPE_FILTERS: { labelKey: string; value: string }[] = [
  { labelKey: 'allTypes', value: 'all' },
  { labelKey: 'online', value: 'online' },
  { labelKey: 'offline', value: 'offline' },
  { labelKey: 'referral', value: 'referral' },
];

export function CustomerSourcesConfig() {
  const { t } = useTranslation('settings');
  const {
    sources,
    stats,
    typeFilter,
    setTypeFilter,
    isSourceReferenced,
    toggleSourceActive,
    updateSourceDescription,
    addSource,
    removeSource,
    error,
  } = useCustomerSources();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomerSource['type']>('online');
  const [newDesc, setNewDesc] = useState('');
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [draftDesc, setDraftDesc] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    addSource({
      name: newName.trim(),
      type: newType,
      description: newDesc.trim(),
      isActive: true,
    });
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
  }

  async function commitDescription(source: CustomerSource) {
    const next = draftDesc.trim();
    setEditingDescId(null);
    if (next === source.description) return;
    try {
      await updateSourceDescription(source.id, next);
    } catch {
      // error surfaced via hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        {t('customerSourcesConfig.historicalLockHint')}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('customerSourcesConfig.totalSources'), value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: t('customerSourcesConfig.active'), value: stats.active, color: 'bg-green-50 text-green-700' },
          { label: t('customerSourcesConfig.totalCustomers'), value: stats.totalCustomers, color: 'bg-purple-50 text-purple-700' },
          { label: t('customerSourcesConfig.topSource'), value: stats.topSource, color: 'bg-amber-50 text-amber-700', isText: true },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
            <div className={`font-bold ${s.isText ? 'text-sm' : 'text-2xl'}`}>{s.value}</div>
            <div className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                typeFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`customerSourcesConfig.${f.labelKey}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('customerSourcesConfig.addSource')}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-card p-4 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">{t('customerSourcesConfig.newSource')}</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">{t('customerSourcesConfig.createVersionHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('customerSourcesConfig.sourceName')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CustomerSource['type'])}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="online">{t('customerSourcesConfig.online')}</option>
              <option value="offline">{t('customerSourcesConfig.offline')}</option>
              <option value="referral">{t('customerSourcesConfig.referral')}</option>
            </select>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t('customerSourcesConfig.description')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('customerSourcesConfig.addSource')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sources.map((source) => {
          const referenced = isSourceReferenced(source);
          return (
            <CustomerSourceRow
              key={source.id}
              source={source}
              referenced={referenced}
              editing={editingDescId === source.id}
              draftDescription={draftDesc}
              onDraftDescriptionChange={setDraftDesc}
              onEditDescription={() => {
                setEditingDescId(source.id);
                setDraftDesc(source.description);
              }}
              onCancelDescription={() => setEditingDescId(null)}
              onCommitDescription={() => commitDescription(source)}
              onToggleActive={() => toggleSourceActive(source.id)}
              onRemove={() => removeSource(source.id)}
            />
          );
        })}
        {sources.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('customerSourcesConfig.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
