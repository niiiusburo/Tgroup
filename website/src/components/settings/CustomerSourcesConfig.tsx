/**
 * Customer Sources Configuration — manage referral sources
 * @crossref:used-in[Settings, Customers, Reports]
 * @crossref:uses[useCustomerSources]
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, ToggleLeft, ToggleRight, Trash2, Globe, MapPin, UserPlus, X, Lock } from 'lucide-react';
import { useCustomerSources } from '@/hooks/useSettings';
import type { CustomerSource } from '@/types/settings';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  online: <Globe className="w-4 h-4" />,
  offline: <MapPin className="w-4 h-4" />,
  referral: <UserPlus className="w-4 h-4" />,
  normal: <MapPin className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  online: 'bg-blue-100 text-blue-700',
  offline: 'bg-amber-100 text-amber-700',
  referral: 'bg-green-100 text-green-700',
  normal: 'bg-gray-100 text-gray-700',
};

const FALLBACK_TYPE_COLOR = 'bg-gray-100 text-gray-700';

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
            <div
              key={source.id}
              data-testid={`customer-source-row-${source.id}`}
              data-source-name={source.name}
              data-referenced={referenced ? 'true' : 'false'}
              className={`bg-white rounded-xl shadow-card p-4 flex items-center gap-4 transition-opacity ${
                !source.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className={`p-2 rounded-lg ${TYPE_COLORS[source.type] || FALLBACK_TYPE_COLOR}`}>
                {TYPE_ICONS[source.type] || <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900" data-testid="source-name">{source.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[source.type] || FALLBACK_TYPE_COLOR}`}>
                    {source.type}
                  </span>
                  {referenced && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      title={t('customerSourcesConfig.labelLockedTitle')}
                    >
                      <Lock className="w-3 h-3" />
                      {t('customerSourcesConfig.labelLocked')}
                    </span>
                  )}
                </div>
                {editingDescId === source.id ? (
                  <input
                    type="text"
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    onBlur={() => commitDescription(source)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitDescription(source);
                      }
                      if (e.key === 'Escape') {
                        setEditingDescId(null);
                      }
                    }}
                    autoFocus
                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    aria-label={t('customerSourcesConfig.description')}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDescId(source.id);
                      setDraftDesc(source.description);
                    }}
                    className="text-xs text-gray-500 mt-0.5 text-left hover:text-gray-700"
                    title={t('customerSourcesConfig.editDescription')}
                  >
                    {source.description || t('customerSourcesConfig.addDescription')}
                  </button>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-gray-900">{source.customerCount} / {source.orderCount}</div>
                <div className="text-xs text-gray-500">{t('customerSourcesConfig.customersOrders')}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleSourceActive(source.id)}
                  title={source.isActive ? t('customerSourcesConfig.deactivate') : t('customerSourcesConfig.activate')}
                >
                  {source.isActive ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
                {!referenced && (
                  <button
                    type="button"
                    onClick={() => removeSource(source.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title={t('customerSourcesConfig.removeSource')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
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
